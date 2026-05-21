from fastapi import APIRouter
from pydantic import BaseModel
from app.pipeline.coaching import CoachingContent, generate_coaching

router = APIRouter(prefix="/coaching", tags=["coaching"])


class CoachingRequest(BaseModel):
    register: str
    intent_label: str
    risk_category: str | None = None
    micro_text: str
    coaching_rationale: str
    source_lang: str = "ja"


@router.post("/panel", response_model=CoachingContent)
async def coaching_panel(request: CoachingRequest) -> CoachingContent:
    return await generate_coaching(
        register=request.register,
        intent_label=request.intent_label,
        risk_category=request.risk_category,
        micro_text=request.micro_text,
        coaching_rationale=request.coaching_rationale,
        source_lang=request.source_lang,
    )
