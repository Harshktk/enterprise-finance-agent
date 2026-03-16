# Architecture — Enterprise Finance Operations Agent

This document describes the system architecture at three levels of detail: High-Level Design (HLD), Low-Level Design (LLD), and end-to-end request flow walkthroughs.

---

## Table of Contents

1. [High-Level Design (HLD)](#1-high-level-design-hld)
2. [Component Overview](#2-component-overview)
3. [Low-Level Design (LLD)](#3-low-level-design-lld)
   - [API Layer](#31-api-layer)
   - [ML Pipeline](#32-ml-pipeline)
   - [Agent Pipeline](#33-agent-pipeline)
   - [Database Layer](#34-database-layer)
   - [LLM Client](#35-llm-client)
4. [Data Models](#4-data-models)
5. [End-to-End Flows](#5-end-to-end-flows)
   - [Transaction Ingestion](#51-transaction-ingestion-flow)
   - [ML Training and Scoring](#52-ml-training-and-scoring-flow)
   - [Agentic Investigation](#53-agentic-investigation-flow)
   - [Auto-Monitor](#54-auto-monitor-flow)
   - [Feedback Loop](#55-feedback-loop-flow)
6. [Policy Engine](#6-policy-engine)
7. [Infrastructure and Deployment](#7-infrastructure-and-deployment)

---

## 1. High-Level Design (HLD)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL WORLD                               │
│                                                                     │
│   ERP / Finance Systems     Analyst / Frontend     CI/CD Pipeline   │
│          │                        │                     │           │
└──────────┼────────────────────────┼─────────────────────┼───────────┘
           │ HTTP REST              │ HTTP REST            │ GitHub Actions
           ▼                        ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         FastAPI Application                          │
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │   API Layer     │   │   ML Pipeline    │   │  Agent Pipeline  │  │
│  │                 │   │                  │   │                  │  │
│  │  REST routes    │──▶│  Feature Eng.    │──▶│  Risk Scorer     │  │
│  │  Pydantic       │   │  IsolationForest │   │  SHAP Explainer  │  │
│  │  validation     │   │  SHAP Explainer  │   │  LLM Client      │  │
│  │                 │   │  ARIMA Forecast  │   │  Policy Engine   │  │
│  └─────────────────┘   └──────────────────┘   └──────────────────┘  │
│           │                     │                      │             │
└───────────┼─────────────────────┼──────────────────────┼────────────┘
            │                     │                      │
            ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Layer                                  │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────┐    │
│   │                     PostgreSQL                            │    │
│   │                                                           │    │
│   │   transactions table        agent_decisions table         │    │
│   │   (raw + scored)            (full audit trail)            │    │
│   └───────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     External LLM Providers                          │
│                                                                     │
│   Groq (Llama 3)     Anthropic (Claude)     Ollama (local)          │
│   Free cloud         Premium reasoning      Local dev only          │
└─────────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

- **Stateless API** — all state is in PostgreSQL; the API processes are horizontally scalable
- **In-process ML** — the anomaly model runs inside the FastAPI process (no separate model server) — appropriate for the current scale, and easy to extract later
- **Provider-agnostic LLM client** — a single `run_ollama()` entrypoint routes to Groq, Anthropic, Ollama, or a mock based on an environment variable; no code change needed to switch providers
- **Deterministic + probabilistic hybrid** — risk level is computed deterministically from the anomaly score; the LLM adds semantic reasoning on top. This means decisions are reproducible and auditable even if the LLM is unavailable
- **Audit-first design** — every agent decision is persisted with its model version, policy version, LLM model, signals, and timestamps before the API response is returned

---

## 2. Component Overview

| Component | Location | Responsibility |
|---|---|---|
| **FastAPI app** | `app/main.py` | Entry point, CORS middleware, DB init on startup |
| **API routes** | `app/api/routes.py` | All 14 REST endpoints — ingestion, ML, agent, feedback |
| **Schemas** | `app/api/schemas.py` | Pydantic models for request validation |
| **Anomaly Detector** | `app/ml/anomaly_detection.py` | Trains IsolationForest, scores transactions, exposes SHAP explain |
| **Feature Engineering** | `app/ml/feature_engineering.py` | Builds the 7-feature vector from raw transaction data |
| **Forecasting** | `app/ml/forecasting.py` | ARIMA-based spend forecasting per department |
| **Explainability** | `app/ml/explainability.py` | Standalone SHAP wrapper for per-transaction explanation |
| **Investigator** | `app/agent/investigator.py` | Builds LLM prompt from transaction + SHAP + memory, parses response |
| **LLM Client** | `app/agent/ollama_client.py` | Multi-provider LLM abstraction |
| **Risk Engine** | `app/agent/risk.py` | Maps anomaly score → Low / Medium / High |
| **Policy Engine** | `app/agent/policy.py` | Maps risk level → BLOCK_AND_ALERT / REVIEW_REQUIRED / AUTO_APPROVE |
| **DB Tool** | `app/tools/db_tool.py` | Fetches Transaction rows as a pandas DataFrame |
| **ORM Models** | `app/database/models.py` | SQLAlchemy definitions for `transactions` and `agent_decisions` |
| **DB Session** | `app/database/session.py` | Engine creation, SessionLocal factory, Base |

---

## 3. Low-Level Design (LLD)

### 3.1 API Layer

The API layer is a single FastAPI `APIRouter` registered in `app/main.py`. It uses synchronous SQLAlchemy sessions injected via FastAPI's `Depends` mechanism.

```
routes.py
│
├── /transactions/ingest      [POST]   — validates → inserts Transaction row
├── /ml/train                 [POST]   — fetch all txns → build features → fit model
├── /ml/score                 [GET]    — score all txns → update anomaly_score + is_anomaly
├── /ml/explain/{id}          [GET]    — SHAP explanation for one transaction
├── /ml/forecast/{dept}       [GET]    — ARIMA forecast for department
├── /agent/investigate/{id}   [POST]   — full agent pipeline (see §5.3)
├── /agent/auto-monitor       [POST]   — investigate all is_anomaly=1 transactions
├── /agent/actions            [GET]    — list all AgentDecision records
├── /agent/decisions/{id}     [GET]    — get decisions for a transaction
├── /agent/feedback/{id}      [POST]   — write feedback verdict + notes
└── /ml/retrain               [POST]   — aggregate feedback → return summary
```

**Singleton pattern for the detector:**
The `AnomalyDetector` instance is module-level in `routes.py`. This means the trained model survives across requests within a single process. In a multi-worker deployment, each worker has its own model state — acceptable for a demo/showcase, but a model registry (backed by disk or object storage) would be needed for production multi-worker consistency.

**Error handling pattern:**
- `409 Conflict` — duplicate transaction_id on ingest (caught via `IntegrityError`)
- `400 Bad Request` — model not trained, or insufficient data
- `404 Not Found` — transaction or decision does not exist
- `500 Internal Server Error` — DB commit failure during score persistence

---

### 3.2 ML Pipeline

#### Feature Engineering (`app/ml/feature_engineering.py`)

Input: pandas DataFrame with columns `[transaction_id, timestamp, amount, vendor, department, payment_method, category]`

Output: 7-feature DataFrame:

| Feature | Type | Derivation |
|---|---|---|
| `amount` | float | Raw transaction amount |
| `log_amount` | float | `log(amount)` — normalises heavy-tailed spend distribution |
| `hour` | int | Hour of day extracted from timestamp (0–23) |
| `day_of_week` | int | Day of week (0=Monday, 6=Sunday) |
| `is_weekend` | int | Binary — 1 if day_of_week ∈ {5, 6} |
| `dept_avg_amount` | float | Group mean of `amount` by `department` |
| `vendor_txn_count` | int | Count of transactions per `vendor` |

The log transform is critical — Isolation Forest uses path lengths in a random tree ensemble, and raw amount values spanning orders of magnitude create biased splits.

#### Anomaly Detection (`app/ml/anomaly_detection.py`)

```
AnomalyDetector
│
├── train(df)
│   ├── build_features(df)                → feature_df
│   ├── IsolationForest.fit(feature_df)
│   └── shap.TreeExplainer(model)         → self.explainer
│
├── score(df)
│   ├── build_features(df)
│   ├── model.decision_function()         → anomaly_score (continuous, lower = more anomalous)
│   └── model.predict()                   → is_anomaly (-1 maps to 1, 1 maps to 0)
│
└── explain(df, transaction_id)
    ├── build_features(row)
    ├── explainer.shap_values(X)
    └── → {feature: shap_value} dict
```

**IsolationForest parameters:**
- `n_estimators=100` — 100 trees in the ensemble
- `contamination=0.05` — expects ~5% of transactions to be anomalous
- `random_state=42` — reproducible results

**Anomaly score interpretation:**
- Negative values → anomalous (isolated quickly, few splits needed)
- Positive values → normal (requires many splits to isolate)
- The `is_anomaly` flag is set to 1 where `predict()` returns -1

#### Forecasting (`app/ml/forecasting.py`)

```
prepare_time_series(df, department)
└── filters by department → resamples to daily spend series

forecast_spend(series, days)
├── resample("D").sum()             → daily aggregated series
├── ARIMA(order=(1,1,1))            → AR(1) + differencing + MA(1)
└── fitted.forecast(steps=days)     → {day_offset: predicted_spend}
```

ARIMA(1,1,1) is a sensible default for financial time series — the differencing term (d=1) handles the common case of non-stationary spend data with trend. For fewer than 3 data points, the system falls back to repeating the last observed value.

---

### 3.3 Agent Pipeline

```
investigate(txn, shap, memory)
│
├── INPUT
│   ├── txn      — {transaction_id, amount, vendor, department, anomaly_score, is_anomaly}
│   ├── shap     — {feature: contribution_value} from SHAP explainer
│   └── memory   — last 5 AgentDecision records (transaction_id, risk_level, summary)
│
├── PROMPT CONSTRUCTION
│   ├── Formats memory as "Previous related decisions: ..."
│   ├── Serialises txn and shap as JSON
│   └── Instructs LLM to respond ONLY in valid JSON with 4 keys:
│       risk_level | summary | signals (array) | recommended_action
│
├── LLM CALL → run_ollama(prompt)
│
└── RESPONSE PARSING
    ├── json.loads(raw)           → structured dict
    └── fallback on JSONDecodeError → {risk_level: UNKNOWN, summary: raw, signals: [], ...}
```

**Why deterministic risk + LLM reasoning?**
The risk level in `routes.py` is computed deterministically from `anomaly_score` via `map_risk_level()`. The LLM is asked for risk level too, but the authoritative value stored in the database comes from the deterministic function — the LLM value is for reasoning context only. This ensures that decisions are always explainable and consistent, independent of LLM availability or hallucinations.

**Agent memory:**
The last 5 `AgentDecision` records are passed in the LLM prompt as few-shot context. This allows the agent to reason about patterns — e.g. if recent decisions for the same vendor were all "High" risk, the LLM can factor that into its assessment.

---

### 3.4 Database Layer

Two tables managed by SQLAlchemy:

```
transactions
├── transaction_id    VARCHAR   PK
├── timestamp         DATETIME
├── amount            FLOAT
├── category          VARCHAR
├── vendor            VARCHAR
├── department        VARCHAR
├── payment_method    VARCHAR
├── anomaly_score     FLOAT     (nullable, set after /ml/score)
└── is_anomaly        INTEGER   (nullable, 0 or 1, set after /ml/score)

agent_decisions
├── id                INTEGER   PK autoincrement
├── transaction_id    VARCHAR   (indexed, FK reference)
├── risk_level        VARCHAR   (Low / Medium / High)
├── summary           TEXT      (LLM-generated narrative)
├── signals           JSON      ({shap: [...], llm: [...]})
├── recommended_action VARCHAR  (LLM recommendation)
├── action_taken      VARCHAR   (deterministic: BLOCK_AND_ALERT / REVIEW_REQUIRED / AUTO_APPROVE)
├── policy_action     VARCHAR   (FLAG_AND_ALERT / REVIEW_REQUIRED / LOG_ONLY)
├── model_version     VARCHAR   (e.g. "anomaly_v1")
├── policy_version    VARCHAR   (e.g. "policy_v1")
├── llm_model         VARCHAR   (e.g. "mistral", "llama3-8b-8192")
├── feedback          VARCHAR   (correct / false_positive / missed — nullable)
├── feedback_notes    TEXT      (nullable)
├── feedback_at       DATETIME  (nullable)
└── created_at        DATETIME  (default: UTC now)
```

`signals` is a JSON column storing both SHAP contributions and LLM-extracted signals in a single structured field:
```json
{
  "shap": [{"feature": "log_amount", "impact": 0.42}, ...],
  "llm":  ["Amount exceeds department baseline", ...]
}
```

---

### 3.5 LLM Client

The `ollama_client.py` module provides a single `run_ollama(prompt: str) -> str` function that routes internally based on the `LLM_PROVIDER` environment variable:

```
run_ollama(prompt)
│
├── LLM_PROVIDER = "groq"       → _run_groq()
│   └── POST api.groq.com/openai/v1/chat/completions
│       model: llama3-8b-8192 (default)
│
├── LLM_PROVIDER = "anthropic"  → _run_anthropic()
│   └── POST api.anthropic.com/v1/messages
│       model: claude-haiku-4-5-20251001 (default)
│
├── LLM_PROVIDER = "ollama"     → _run_ollama_local()
│   └── POST {OLLAMA_URL}/api/generate
│       model: mistral (default)
│
└── LLM_PROVIDER = "mock"       → _run_mock()
    └── Returns hardcoded realistic JSON (no API call)
        Use for demos, testing, or when no API key is available
```

All four providers return the same type: a raw string expected to be valid JSON, which `investigator.py` parses.

---

## 4. Data Models

### Transaction (input)

```json
{
  "transaction_id": "TXN-20240115-0042",
  "timestamp": "2024-01-15T14:32:00",
  "amount": 87450.00,
  "category": "Software",
  "vendor": "CloudVendor Inc",
  "department": "Engineering",
  "payment_method": "wire_transfer"
}
```

### AgentDecision (output)

```json
{
  "risk_level": "High",
  "summary": "Transaction of $87,450 to CloudVendor Inc flagged as anomalous. Amount is 4.2x the Engineering department average. Vendor has only appeared twice in transaction history. Transaction occurred at 2:32 AM — outside normal business hours.",
  "signals": {
    "shap": [
      {"feature": "log_amount", "impact": 0.421},
      {"feature": "dept_avg_amount", "impact": 0.318},
      {"feature": "hour", "impact": 0.201},
      {"feature": "vendor_txn_count", "impact": 0.189}
    ],
    "llm": [
      "Amount significantly exceeds department baseline",
      "Vendor appears infrequently in transaction history",
      "Transaction timestamp outside business hours"
    ]
  },
  "recommended_action": "Block transaction and escalate to Finance Controller",
  "policy_action": "FLAG_AND_ALERT",
  "action_taken": "BLOCK_AND_ALERT"
}
```

---

## 5. End-to-End Flows

### 5.1 Transaction Ingestion Flow

```
Client
  │
  │  POST /transactions/ingest
  │  Body: TransactionIn (Pydantic schema)
  ▼
routes.py → ingest_transaction()
  │
  ├── Pydantic validates request body
  ├── Creates Transaction ORM object from dict
  ├── db.add(transaction)
  ├── db.commit()
  │   └── On IntegrityError → 409 Conflict (duplicate transaction_id)
  │
  └── Returns {"status": "stored", "transaction_id": "..."}
```

---

### 5.2 ML Training and Scoring Flow

```
POST /ml/train
  │
  ├── fetch_transactions(db)         → pandas DataFrame
  ├── Check: len(df) >= 5            → else 400
  ├── detector.train(df)
  │   ├── build_features(df)         → 7-column feature DataFrame
  │   ├── IsolationForest.fit()
  │   └── shap.TreeExplainer(model)
  └── Returns {"status": "model trained", "records_used": N}

GET /ml/score
  │
  ├── fetch_transactions(db)         → DataFrame
  ├── Check: detector.is_trained     → else 400
  ├── detector.score(df)
  │   ├── build_features(df)
  │   ├── model.decision_function()  → anomaly_score column
  │   └── model.predict()            → is_anomaly column
  ├── For each row:
  │   ├── db.query(Transaction).filter(id == ...)
  │   └── txn.anomaly_score = ..., txn.is_anomaly = ...
  ├── db.commit()
  └── Returns scored records list
```

---

### 5.3 Agentic Investigation Flow

```
POST /agent/investigate/{transaction_id}
  │
  ├── Fetch Transaction from DB        → 404 if not found
  ├── Check for existing decision      → return cached if found
  │
  ├── STEP 1: Deterministic risk
  │   └── map_risk_level(anomaly_score) → "Low" / "Medium" / "High"
  │
  ├── STEP 2: SHAP explanation
  │   └── get_shap_for_transaction()    → {feature: impact} dict
  │
  ├── STEP 3: Load agent memory
  │   └── Last 5 AgentDecision records  → [{transaction_id, risk_level, summary}]
  │
  ├── STEP 4: LLM investigation
  │   └── investigate(txn, shap, memory)
  │       ├── Build structured prompt
  │       ├── run_ollama(prompt)         → raw JSON string
  │       └── json.loads()              → {risk_level, summary, signals, recommended_action}
  │
  ├── STEP 5: Policy enforcement
  │   ├── apply_policy(risk_level)       → policy_action
  │   └── decide_action(risk_level, score) → action_taken
  │
  ├── STEP 6: Persist decision
  │   └── AgentDecision(all fields)      → db.add() → db.commit()
  │
  └── Returns full decision response
```

---

### 5.4 Auto-Monitor Flow

```
POST /agent/auto-monitor
  │
  ├── Query: all Transactions WHERE is_anomaly = 1
  ├── For each transaction:
  │   ├── Skip if AgentDecision already exists
  │   ├── get_shap_for_transaction()
  │   ├── Load last 5 decisions as memory
  │   ├── investigate(txn, shap, memory)
  │   ├── apply_policy() + decide_action()
  │   └── Create and add AgentDecision
  ├── db.commit()  (single commit for all)
  └── Returns {"processed": [list of transaction_ids]}
```

---

### 5.5 Feedback Loop Flow

```
POST /agent/feedback/{transaction_id}
  Body: {"verdict": "false_positive", "notes": "Vendor is approved for Q1 spend"}
  │
  ├── Fetch AgentDecision                → 404 if not found
  ├── decision.feedback = verdict
  ├── decision.feedback_notes = notes
  ├── decision.feedback_at = utcnow()
  └── db.commit()

POST /ml/retrain
  │
  ├── Query: all AgentDecisions WHERE feedback IS NOT NULL
  ├── Aggregate: {total, correct, false_positive, missed}
  └── Returns summary + note about threshold retraining
```

The feedback system is currently an aggregation layer — the actual model retraining based on feedback is a planned extension (the `model_registry.py` and threshold tuning pipeline are scaffolded for this).

---

## 6. Policy Engine

The policy engine applies two independent functions that produce complementary outputs:

### Risk to policy action (`apply_policy`)

| Risk Level | Policy Action | Meaning |
|---|---|---|
| High | `FLAG_AND_ALERT` | Raise alert to compliance/finance team |
| Medium | `REVIEW_REQUIRED` | Queue for manual analyst review |
| Low | `LOG_ONLY` | Log for audit trail, no action needed |

### Risk + score to system action (`decide_action`)

| Condition | Action Taken |
|---|---|
| High risk OR anomaly_score > 0.15 | `BLOCK_AND_ALERT` |
| Medium risk | `REVIEW_REQUIRED` |
| Low risk | `AUTO_APPROVE` |

Both outcomes are stored independently in `agent_decisions`, giving full visibility into what the policy recommended vs what the system actually did.

---

## 7. Infrastructure and Deployment

```
Developer machine
  │
  │  git push origin main
  ▼
GitHub
  │
  │  triggers
  ▼
GitHub Actions (.github/workflows/docker-publish.yml)
  ├── docker/setup-buildx-action   (Buildx + layer cache)
  ├── docker/login-action          (Docker Hub auth via secrets)
  ├── docker/metadata-action       (generates tags: latest + sha-xxxxxx)
  └── docker/build-push-action
      ├── context: .               (repo root)
      ├── file: docker/Dockerfile
      ├── cache-from: type=gha     (GitHub Actions cache — fast rebuilds)
      └── push: true
          │
          ▼
      Docker Hub
      yourname/enterprise-finance-agent:latest
      yourname/enterprise-finance-agent:sha-abc1234
          │
          │  pulled by
          ▼
      Render (free tier)
      ├── Web Service    (pulls image, runs on port 8000)
      └── PostgreSQL DB  (managed, 90-day free tier)
          │
          ▼
      https://your-app.onrender.com
```

### Dockerfile design decisions

- **Base image:** `python:3.11-slim` — minimal Debian with Python, no unnecessary system packages
- **Layer ordering:** `requirements.txt` is copied and installed before application code — this ensures the expensive pip install layer is cached and only re-runs when dependencies actually change
- **System deps:** Only `gcc` and `libpq-dev` are installed — required for `psycopg2-binary` to compile; removed from apt cache immediately
- **HEALTHCHECK:** Polls `http://localhost:8000/` every 30 seconds — Render and Docker Compose both use this to gate dependent services
- **No root:** The image runs as the default non-root process started by uvicorn — no explicit `USER` directive needed since uvicorn doesn't bind to port 80

### docker-compose variants

| File | Purpose |
|---|---|
| `docker/docker-compose.yml` | Local dev — builds image from source, mounts repo as volume |
| `docker/docker-compose.prod.yml` | Production — pulls pre-built image from Docker Hub, uses named volume for DB persistence |
