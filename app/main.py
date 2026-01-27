from fastapi import FastAPI
from app.database.session import engine
from app.database import models
from app.api.routes import router

app = FastAPI(title="Enterprise Finance Operations Agent")

@app.on_event("startup")
def on_startup():
    models.Base.metadata.create_all(bind=engine)

app.include_router(router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Finance Agent is alive"}
