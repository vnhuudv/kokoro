import sys
import os

# Add python_shared to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from fastapi import FastAPI
from app.routers.annotation import router as annotation_router
from app.routers.feedback import router as feedback_router
from app.routers.coaching import router as coaching_router
from app.routers.inochi import router as inochi_router

app = FastAPI(title="Kokoro Annotation Pipeline", version="0.1.0")
app.include_router(annotation_router)
app.include_router(feedback_router)
app.include_router(coaching_router)
app.include_router(inochi_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "annotation-pipeline"}
