import json
from .ollama_client import run_ollama

def investigate(txn: dict, shap: dict) -> dict:
    prompt = f"""
You are a finance risk analyst AI.

Transaction:
{json.dumps(txn, indent=2)}

Feature contributions:
{json.dumps(shap, indent=2)}

Respond ONLY in valid JSON with:
- risk_level
- summary
- signals (array)
- recommended_action
"""

    raw = run_ollama(prompt)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "risk_level": "UNKNOWN",
            "summary": raw,
            "signals": [],
            "recommended_action": "Manual review"
        }
