import json
from .ollama_client import run_ollama

 
def investigate(txn: dict, shap: dict, memory: list) -> dict:
    if memory:
        context = "Previous related decisions:\n"
        for m in memory:
            context += f"- {m['transaction_id']} | {m['risk_level']} | {m['summary']}\n"
    else:
        context = "No prior decisions available.\n"

    prompt = f"""
You are a finance risk analyst AI.

{context}

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

