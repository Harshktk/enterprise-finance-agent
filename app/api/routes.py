from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import time
from app.database.session import SessionLocal
from app.database.models import Transaction
from app.api.schemas import TransactionIn
from app.ml.forecasting import prepare_time_series, forecast_spend
from app.ml.explainability import get_shap_for_transaction
from app.agent.risk import map_risk_level
from app.agent.policy import decide_action, apply_policy

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/transactions/ingest")
def ingest_transaction(txn: TransactionIn, db: Session = Depends(get_db)):
    transaction = Transaction(**txn.dict())
    db.add(transaction)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Transaction {txn.transaction_id} already exists"
        )
    return {"status": "stored", "transaction_id": txn.transaction_id}


from app.ml.anomaly_detection import AnomalyDetector
from app.tools.db_tool import fetch_transactions

detector = AnomalyDetector()

@router.post("/ml/train")
def train_model(db: Session = Depends(get_db)):
    df = fetch_transactions(db)
    if df.empty or len(df) < 5:
        raise HTTPException(status_code=400, detail="Not enough data to train model")
    detector.train(df)
    return {"status": "model trained", "records_used": len(df)}

@router.get("/ml/score")
def score_transactions(db: Session = Depends(get_db)):
    df = fetch_transactions(db)
    if not detector.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained")
    scored = detector.score(df)
    for _, row in scored.iterrows():
        txn = db.query(Transaction).filter(
            Transaction.transaction_id == row["transaction_id"]
        ).first()
        if txn is None:
            continue
        txn.anomaly_score = float(row["anomaly_score"])
        txn.is_anomaly = int(row["is_anomaly"])
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to persist anomaly scores")
    return scored[[
        "transaction_id", "amount", "vendor", "department", "anomaly_score", "is_anomaly"
    ]].to_dict(orient="records")

@router.get("/ml/explain/{transaction_id}")
def explain_transaction(transaction_id: str, db: Session = Depends(get_db)):
    if not detector.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained")
    df = fetch_transactions(db)
    try:
        explanation = detector.explain(df, transaction_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"transaction_id": transaction_id, "feature_contributions": explanation}

@router.get("/ml/forecast/{department}")
def forecast_department_spend(department: str, days: int = 7, db: Session = Depends(get_db)):
    df = fetch_transactions(db)
    try:
        series = prepare_time_series(df, department)
        if series is None:
            raise HTTPException(status_code=400, detail=f"No data available for department: {department}")
        forecast = forecast_spend(series, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {
        "department": department,
        "forecast_days": days,
        "predicted_spend": {str(date): float(value) for date, value in forecast.items()}
    }


from app.agent.investigator import investigate
from app.database.models import AgentDecision


@router.post("/agent/investigate/{transaction_id}")
def investigate_transaction(transaction_id: str, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id
    ).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    existing = db.query(AgentDecision).filter(
        AgentDecision.transaction_id == transaction_id
    ).first()
    if existing:
        return {
            "risk_level": existing.risk_level,
            "summary": existing.summary,
            "signals": existing.signals,
            "recommended_action": existing.recommended_action,
            "policy_action": existing.policy_action,
            "action_taken": existing.action_taken
        }

    if txn.anomaly_score is None:
        raise HTTPException(status_code=400, detail="Transaction not scored yet. Run /ml/score first.")

    if not detector.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained. Run /ml/train first.")

    risk_level  = map_risk_level(float(txn.anomaly_score))
    shap_values = get_shap_for_transaction(transaction_id, detector.model, detector.original_df)
    shap_signals = [{"feature": k, "impact": v} for k, v in shap_values.items()]

    recent_decisions = (
        db.query(AgentDecision)
        .order_by(AgentDecision.created_at.desc())
        .limit(5).all()
    )
    memory = [
        {"transaction_id": d.transaction_id, "risk_level": d.risk_level, "summary": d.summary}
        for d in recent_decisions
    ]

    result = investigate(
        txn={
            "transaction_id": txn.transaction_id,
            "amount": txn.amount,
            "vendor": txn.vendor,
            "department": txn.department,
            "anomaly_score": txn.anomaly_score,
            "is_anomaly": txn.is_anomaly
        },
        shap=shap_values,
        memory=memory
    )

    policy_action = apply_policy(risk_level)
    action        = decide_action(risk_level=risk_level, anomaly_score=float(txn.anomaly_score))

    decision = AgentDecision(
        transaction_id=transaction_id,
        risk_level=risk_level,
        summary=result["summary"],
        signals={"shap": shap_signals, "llm": result["signals"]},
        recommended_action=result["recommended_action"],
        action_taken=action,
        policy_action=policy_action,
        model_version="anomaly_v1",
        policy_version="policy_v1",
        llm_model="groq/llama-3.1-8b-instant"
    )
    db.add(decision)
    db.commit()

    return {
        "risk_level": risk_level,
        "summary": result["summary"],
        "signals": decision.signals,
        "recommended_action": result["recommended_action"],
        "policy_action": policy_action,
        "action_taken": action
    }


@router.get("/agent/decisions/{transaction_id}")
def get_agent_decisions(transaction_id: str, db: Session = Depends(get_db)):
    return db.query(AgentDecision).filter(
        AgentDecision.transaction_id == transaction_id
    ).all()


@router.post("/agent/auto-monitor")
def auto_monitor(
    db: Session = Depends(get_db),
    limit: int = Query(default=15, description="Max transactions to process per run")
):
    """
    Investigates anomalous transactions in batches.
    Skips already-investigated ones automatically.
    Call multiple times to process all — each call picks up where the last left off.
    Default limit=15 keeps well within Render's 30s request timeout.
    """
    if not detector.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained. Run /ml/train first.")

    # Only fetch unscored anomalies that haven't been investigated yet
    all_anomalies = db.query(Transaction).filter(Transaction.is_anomaly == 1).all()

    pending = []
    for txn in all_anomalies:
        if txn.anomaly_score is None:
            continue
        exists = db.query(AgentDecision).filter(
            AgentDecision.transaction_id == txn.transaction_id
        ).first()
        if not exists:
            pending.append(txn)

    # Total remaining before this run
    total_remaining = len(pending)

    # Process only up to `limit` per call
    to_process = pending[:limit]

    results = []
    errors  = []

    for txn in to_process:
        try:
            shap_values = get_shap_for_transaction(
                txn.transaction_id, detector.model, detector.original_df
            )
            memory = (
                db.query(AgentDecision)
                .order_by(AgentDecision.created_at.desc())
                .limit(3).all()
            )
            result = investigate(
                txn={
                    "transaction_id": txn.transaction_id,
                    "amount":         txn.amount,
                    "vendor":         txn.vendor,
                    "department":     txn.department,
                    "anomaly_score":  txn.anomaly_score,
                    "is_anomaly":     txn.is_anomaly
                },
                shap=shap_values,
                memory=[
                    {"transaction_id": d.transaction_id, "risk_level": d.risk_level, "summary": d.summary}
                    for d in memory
                ]
            )

            risk_level    = map_risk_level(float(txn.anomaly_score))
            policy_action = apply_policy(risk_level)
            action        = decide_action(risk_level=risk_level, anomaly_score=float(txn.anomaly_score))

            decision = AgentDecision(
                transaction_id=txn.transaction_id,
                risk_level=risk_level,
                summary=result["summary"],
                signals=result["signals"],
                recommended_action=result["recommended_action"],
                action_taken=action,
                policy_action=policy_action,
                model_version="anomaly_v1",
                policy_version="policy_v1",
                llm_model="groq/llama-3.1-8b-instant"
            )
            db.add(decision)
            db.commit()
            results.append(txn.transaction_id)

            time.sleep(1.5)  # stay under Groq 6000 TPM free tier

        except Exception as e:
            errors.append({"transaction_id": txn.transaction_id, "error": str(e)})
            if "429" in str(e):
                time.sleep(5)
            continue

    still_remaining = total_remaining - len(results)

    return {
        "processed_this_run": results,
        "count_this_run":     len(results),
        "still_remaining":    still_remaining,
        "errors":             errors,
        "done":               still_remaining == 0
    }


@router.get("/agent/actions")
def get_actions(db: Session = Depends(get_db)):
    return db.query(AgentDecision).all()


@router.post("/agent/feedback/{transaction_id}")
def submit_feedback(transaction_id: str, payload: dict, db: Session = Depends(get_db)):
    decision = db.query(AgentDecision).filter(
        AgentDecision.transaction_id == transaction_id
    ).first()
    if not decision:
        raise HTTPException(404, "Decision not found")
    decision.feedback      = payload["verdict"]
    decision.feedback_notes = payload.get("notes")
    decision.feedback_at   = datetime.utcnow()
    db.commit()
    return {"status": "feedback recorded"}


@router.post("/ml/retrain")
def retrain_from_feedback(db: Session = Depends(get_db)):
    decisions = db.query(AgentDecision).filter(AgentDecision.feedback.isnot(None)).all()
    if not decisions:
        return {"status": "no feedback yet"}
    summary = {
        "total":          len(decisions),
        "correct":        sum(1 for d in decisions if d.feedback == "correct"),
        "false_positive": sum(1 for d in decisions if d.feedback == "false_positive"),
        "missed":         sum(1 for d in decisions if d.feedback == "missed")
    }
    return {"status": "feedback reviewed", "summary": summary, "note": "Threshold retraining pending"}
