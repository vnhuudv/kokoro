import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from fastapi import FastAPI
from app.routers.llm import router as llm_router

app = FastAPI(title="Kokoro LLM Gateway", version="0.1.0")
app.include_router(llm_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "llm-gateway"}
