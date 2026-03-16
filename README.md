# Enterprise Finance Operations Agent

> An LLM-powered agentic system for autonomous financial transaction analysis, real-time anomaly detection, SHAP-based explainability, and audit-ready reporting.

---

## What This Project Does

Modern enterprises process thousands of financial transactions daily. Manual review is slow, error-prone, and doesn't scale. This system replaces that with an autonomous AI agent pipeline that:

- **Ingests** financial transactions via REST API
- **Detects anomalies** using a trained Isolation Forest ML model
- **Explains** every decision using SHAP feature contributions — no black boxes
- **Investigates** flagged transactions using an LLM (Groq / Anthropic / Ollama)
- **Enforces policy** autonomously — blocking, flagging, or approving based on risk level
- **Forecasts** department spend using ARIMA time series models
- **Learns** from analyst feedback to continuously improve

The result is an always-on financial operations agent that surfaces risk, justifies its reasoning, and produces audit-ready decision trails — without human intervention for routine cases.

---

## Demo

| Endpoint | What it shows |
|---|---|
| `POST /transactions/ingest` | Ingest a raw transaction |
| `POST /ml/train` | Train anomaly detection model on stored data |
| `GET /ml/score` | Score all transactions, persist anomaly labels |
| `GET /ml/explain/{id}` | Get SHAP feature contributions for one transaction |
| `GET /ml/forecast/{department}` | ARIMA spend forecast for a department |
| `POST /agent/investigate/{id}` | Full LLM-powered agentic investigation |
| `POST /agent/auto-monitor` | Autonomously investigate all flagged transactions |
| `GET /agent/actions` | List all agent decisions |
| `POST /agent/feedback/{id}` | Submit analyst feedback (correct / false_positive / missed) |
| `POST /ml/retrain` | Review feedback and summarise retraining signals |

Full interactive API docs available at `/docs` (Swagger UI) after running the project.

---

## Tech Stack

### Backend & API
| Technology | Role |
|---|---|
| **FastAPI** | REST API framework — async, auto-docs, Pydantic validation |
| **Uvicorn** | ASGI server |
| **SQLAlchemy** | ORM for all database operations |
| **PostgreSQL** | Primary data store for transactions and agent decisions |
| **Pydantic** | Request/response schema validation |

### Machine Learning
| Technology | Role |
|---|---|
| **scikit-learn** — `IsolationForest` | Unsupervised anomaly detection on transaction features |
| **SHAP** — `TreeExplainer` | Feature contribution explanations for every anomaly decision |
| **statsmodels** — `ARIMA` | Time series spend forecasting per department |
| **pandas / numpy** | Feature engineering and data transformation |

### Agent & LLM Layer
| Technology | Role |
|---|---|
| **Ollama** (Mistral) | Local LLM for transaction investigation — zero API cost in dev |
| **Groq API** (Llama 3) | Free cloud LLM option — recommended for deployment |
| **Anthropic API** (Claude) | Premium LLM option for highest quality reasoning |
| **Custom agent loop** | Deterministic risk scoring → SHAP signals → LLM reasoning → policy enforcement |

### Infrastructure & DevOps
| Technology | Role |
|---|---|
| **Docker** | Containerized application |
| **Docker Compose** | Multi-service orchestration (API + PostgreSQL) |
| **Docker Hub** | Public image registry — pull and run anywhere |
| **GitHub Actions** | CI/CD — auto-builds and pushes image on every commit to `main` |
| **Render** | Free cloud deployment with shareable URL |

---

## Project Structure

```
enterprise-finance-agent/
├── app/
│   ├── main.py                    # FastAPI app entry point, CORS, startup
│   ├── api/
│   │   ├── routes.py              # All API endpoint definitions
│   │   └── schemas.py             # Pydantic request/response schemas
│   ├── agent/
│   │   ├── investigator.py        # LLM-based transaction investigation logic
│   │   ├── ollama_client.py       # Multi-provider LLM client (Groq/Anthropic/Ollama/Mock)
│   │   ├── risk.py                # Deterministic risk level mapping from anomaly score
│   │   ├── policy.py              # Policy engine — decides BLOCK / REVIEW / APPROVE
│   │   ├── planner_agent.py       # (extensible) Planner agent scaffold
│   │   ├── report_agent.py        # (extensible) Report agent scaffold
│   │   ├── data_analysis_agent.py # (extensible) Data analysis agent scaffold
│   │   └── validator_agent.py     # (extensible) Validator agent scaffold
│   ├── ml/
│   │   ├── anomaly_detection.py   # IsolationForest training, scoring, explanation
│   │   ├── feature_engineering.py # Feature builder — time, amount, vendor, dept features
│   │   ├── explainability.py      # SHAP TreeExplainer wrapper
│   │   ├── forecasting.py         # ARIMA time series forecasting
│   │   ├── feedback_analysis.py   # Feedback loop summary
│   │   └── model_registry.py      # (extensible) Model versioning scaffold
│   ├── database/
│   │   ├── models.py              # SQLAlchemy ORM models (Transaction, AgentDecision)
│   │   └── session.py             # Database engine and session factory
│   ├── tools/
│   │   ├── db_tool.py             # Fetches transactions as DataFrame for ML pipeline
│   │   ├── analytics_tool.py      # (extensible) Analytics tool scaffold
│   │   └── time_series_tool.py    # (extensible) Time series tool scaffold
│   ├── memory/
│   │   ├── conversation_memory.py # (extensible) Conversation memory scaffold
│   │   └── vector_store.py        # (extensible) Vector store scaffold
│   ├── orchestration/
│   │   ├── agent_graph.py         # (extensible) Agent graph orchestration scaffold
│   │   └── state_manager.py       # (extensible) State management scaffold
│   └── utils/
│       ├── config.py              # Configuration utilities
│       └── logger.py              # Logging setup
├── docker/
│   ├── Dockerfile                 # Production-optimised Docker image
│   ├── docker-compose.yml         # Local development (builds from source)
│   └── docker-compose.prod.yml    # Production (pulls from Docker Hub)
├── .github/
│   └── workflows/
│       └── docker-publish.yml     # GitHub Actions CI/CD pipeline
├── tests/
│   ├── test_agents.py
│   └── test_api.py
├── notebooks/
│   └── exploration.ipynb
├── generate_transactions.py       # Script to seed sample transaction data
├── .env.example                   # Environment variable reference
└── requirements.txt
```

---

## How It Works — End to End

### 1. Ingest transactions
Send financial transactions to the API. Each transaction has an ID, amount, vendor, department, category, payment method, and timestamp.

### 2. Train the anomaly model
Call `POST /ml/train`. The system fetches all stored transactions, engineers features (time-of-day, log-amount, department averages, vendor frequency), and trains an Isolation Forest. A SHAP TreeExplainer is built simultaneously for later explanation.

### 3. Score transactions
Call `GET /ml/score`. Every transaction gets an anomaly score (continuous) and a binary anomaly label. Scores are persisted back to the database.

### 4. Agentic investigation
Call `POST /agent/investigate/{id}`. The system:
- Maps the anomaly score to a risk level (Low / Medium / High) deterministically
- Retrieves SHAP feature contributions showing *why* the model flagged it
- Pulls the last 5 agent decisions as memory context
- Sends all of this to an LLM with a structured prompt requesting a JSON response containing: risk level, summary, signals, and recommended action
- Applies the policy engine to decide the final action (BLOCK_AND_ALERT / REVIEW_REQUIRED / AUTO_APPROVE)
- Persists the full decision record to the database with model version, policy version, and LLM model metadata

### 5. Auto-monitor
Call `POST /agent/auto-monitor` to investigate all flagged transactions in bulk without manual intervention.

### 6. Feedback loop
Analysts can mark decisions as `correct`, `false_positive`, or `missed`. The system aggregates this feedback and exposes retraining signals via `POST /ml/retrain`.

---

## Quick Start

### Option 1 — Docker Hub (recommended)

```bash
# Pull the image
docker pull <your-dockerhub-username>/enterprise-finance-agent:latest

# Run with Docker Compose (starts API + PostgreSQL)
curl -O https://raw.githubusercontent.com/<your-username>/enterprise-finance-agent/main/docker/docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up
```

### Option 2 — Run locally from source

```bash
# Clone the repo
git clone https://github.com/<your-username>/enterprise-finance-agent.git
cd enterprise-finance-agent

# Copy environment config
cp .env.example .env

# Start with Docker Compose
docker compose -f docker/docker-compose.yml up --build
```

API will be live at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Option 3 — Run without Docker

```bash
pip install -r requirements.txt
export DATABASE_URL=postgresql://user:pass@localhost:5432/finance_db
export LLM_PROVIDER=mock
uvicorn app.main:app --reload
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `LLM_PROVIDER` | `mock` | LLM backend: `mock` / `groq` / `anthropic` / `ollama` |
| `GROQ_API_KEY` | — | Groq API key (get free at console.groq.com) |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama server URL (local only) |
| `OLLAMA_MODEL` | `mistral` | Ollama model name |

---

## CI/CD Pipeline

Every push to `main` triggers a GitHub Actions workflow that:
1. Checks out the repository
2. Sets up Docker Buildx with layer caching
3. Authenticates with Docker Hub using repository secrets
4. Builds the Docker image from `docker/Dockerfile`
5. Tags it as `latest` and with the short commit SHA
6. Pushes both tags to Docker Hub

To set this up on your fork, add two GitHub repository secrets:
- `DOCKERHUB_USERNAME` — your Docker Hub username
- `DOCKERHUB_TOKEN` — a Docker Hub access token (not your password)

---

## Deployment

This project is deployed on **Render** (free tier) with a managed PostgreSQL database.

Live URL: `https://<your-app>.onrender.com`
Docker Hub: `https://hub.docker.com/r/<your-username>/enterprise-finance-agent`

---

## License

MIT License — see [LICENSE](LICENSE) for details.
