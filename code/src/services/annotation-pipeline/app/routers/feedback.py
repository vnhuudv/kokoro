from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from app.pipeline.persist import persist_suggestion_used

router = APIRouter(prefix="/feedback", tags=["feedback"])


class SuggestionUsedRequest(BaseModel):
    case_id: str
    slack_user_id: str
    tenant_id: str
    language: str


@router.post("/suggestion-used", status_code=204)
async def suggestion_used(request: SuggestionUsedRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        persist_suggestion_used,
        case_id=request.case_id,
        slack_user_id=request.slack_user_id,
        tenant_name=request.tenant_id,
        language=request.language,
    )
