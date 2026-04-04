import os
import json
import requests

# LLM provider: "ollama" | "groq" | "anthropic" | "mock"
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock").lower()

# ── Ollama (local only) ────────────────────────────────────────────────────
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

# ── Groq (free cloud LLM) ─────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")  # current active model

# ── Anthropic ─────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")


def run_ollama(prompt: str) -> str:
    """Route to the configured LLM provider."""
    if LLM_PROVIDER == "groq":
        return _run_groq(prompt)
    elif LLM_PROVIDER == "anthropic":
        return _run_anthropic(prompt)
    elif LLM_PROVIDER == "ollama":
        return _run_ollama_local(prompt)
    else:
        return _run_mock(prompt)


# ── Provider implementations ───────────────────────────────────────────────

def _run_ollama_local(prompt: str) -> str:
    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=60
    )
    response.raise_for_status()
    return response.json()["response"]


def _run_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable not set")

    # Trim prompt to avoid token limit issues
    prompt = prompt[:6000]

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": GROQ_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a finance risk analyst AI. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.2,
            "max_tokens": 1024
        },
        timeout=30
    )

    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        error_body = response.text
        raise ValueError(f"Groq API error {response.status_code}: {error_body}") from e

    return response.json()["choices"][0]["message"]["content"]


def _run_anthropic(prompt: str) -> str:
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        },
        json={
            "model": ANTHROPIC_MODEL,
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}]
        },
        timeout=30
    )
    response.raise_for_status()
    return response.json()["content"][0]["text"]


def _run_mock(prompt: str) -> str:
    """Returns a realistic mock response — no API key needed. Safe for demos."""
    return json.dumps({
        "risk_level": "Medium",
        "summary": (
            "Transaction flagged by anomaly detection model. "
            "Amount and vendor pattern deviate from department baseline. "
            "Recommend manual review before approval."
        ),
        "signals": [
            "Amount exceeds department 90th percentile",
            "Vendor not in approved vendor list",
            "Transaction outside normal business hours"
        ],
        "recommended_action": "Hold for manual review"
    })
