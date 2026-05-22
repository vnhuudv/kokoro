from pydantic import BaseModel
from python_shared.types import AnnotationResult, Language


class AnnotationRequest(BaseModel):
    message_id: str
    tenant_id: str
    source_language: Language
    target_language: Language
    redacted_text: str
    slack_user_id: str | None = None
    channel_id: str | None = None


class AnnotationResponse(BaseModel):
    message_id: str
    result: AnnotationResult
    latency_ms: int
