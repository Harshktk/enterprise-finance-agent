import requests

OLLAMA_URL = "http://host.docker.internal:11434"
MODEL = "mistral"

def run_ollama(prompt: str) -> str:
    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        },
        timeout=60
    )
    response.raise_for_status()
    return response.json()["response"]
