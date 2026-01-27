from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database.session import SessionLocal
from app.database.models import Transaction
from app.api.schemas import TransactionIn
from app.ml.forecasting import prepare_time_series, forecast_spend
from app.ml.explainability import get_shap_for_transaction


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

    return {
        "status": "stored",
        "transaction_id": txn.transaction_id
    }

from app.ml.anomaly_detection import AnomalyDetector
from app.tools.db_tool import fetch_transactions

detector = AnomalyDetector()

@router.post("/ml/train")
def train_model(db: Session = Depends(get_db)):
    df = fetch_transactions(db)

    if df.empty or len(df) < 5:
        raise HTTPException(
            status_code=400,
            detail="Not enough data to train model"
        )

    detector.train(df)
    return {"status": "model trained", "records_used": len(df)}

@router.get("/ml/score")
def score_transactions(db: Session = Depends(get_db)):
    df = fetch_transactions(db)

    if not detector.is_trained:
        raise HTTPException(
            status_code=400,
            detail="Model not trained"
        )

    scored = detector.score(df)

    # Persist scores back to DB
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
        "transaction_id",
        "amount",
        "vendor",
        "department",
        "anomaly_score",
        "is_anomaly"
    ]].to_dict(orient="records")

@router.get("/ml/explain/{transaction_id}")
def explain_transaction(transaction_id: str, db: Session = Depends(get_db)):
    if not detector.is_trained:
        raise HTTPException(
            status_code=400,
            detail="Model not trained"
        )

    df = fetch_transactions(db)

    try:
        explanation = detector.explain(df, transaction_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    return {
        "transaction_id": transaction_id,
        "feature_contributions": explanation
    }

@router.get("/ml/forecast/{department}")
def forecast_department_spend(
    department: str,
    days: int = 7,
    db: Session = Depends(get_db)
):
    df = fetch_transactions(db)

    try:
        series = prepare_time_series(df, department)
        if series is None:
            raise HTTPException(
                status_code=400,
                detail=f"No data available for department: {department}"
            )
        forecast = forecast_spend(series, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "department": department,
        "forecast_days": days,
        "predicted_spend": {
            str(date): float(value)
            for date, value in forecast.items()
        }
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

    shap_values = get_shap_for_transaction(transaction_id)

    result = investigate(
        txn={
            "transaction_id": txn.transaction_id,
            "amount": txn.amount,
            "vendor": txn.vendor,
            "department": txn.department,
            "anomaly_score": txn.anomaly_score,
            "is_anomaly": txn.is_anomaly
        },
        shap=shap_values
    )
    decision = AgentDecision(
        transaction_id=transaction_id,
        risk_level=result["risk_level"],
        summary=result["summary"],
        signals=result["signals"],
        recommended_action=result["recommended_action"]
    )

    db.add(decision)
    db.commit()
    return result
    

@router.get("/agent/decisions/{transaction_id}")
def get_agent_decisions(transaction_id: str, db: Session = Depends(get_db)):
    decisions = db.query(AgentDecision).filter(
        AgentDecision.transaction_id == transaction_id
    ).all()

    return decisions



