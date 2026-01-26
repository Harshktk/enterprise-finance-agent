from fastapi import FastAPI

app = FastAPI(title="Enterprise Finance Operations Agent")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Finance Agent is alive"}
