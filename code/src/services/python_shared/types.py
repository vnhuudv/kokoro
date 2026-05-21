from enum import Enum
from typing import Optional
from pydantic import BaseModel


class Language(str, Enum):
    vi = "vi"
    ja = "ja"


class Register(str, Enum):
    formal = "formal"
    neutral = "neutral"
    informal = "informal"


class SuggestionChip(BaseModel):
    label: str
    register: Register
    text: str


class IntentResult(BaseModel):
    intent_label: str
    risk_category: Optional[str] = None
    micro_text: str
    coaching_rationale: str
    suggestions: list[SuggestionChip] = []


# Public API model for POST /annotate (slack-app → annotation-pipeline)
class AnnotateRequest(BaseModel):
    message_id: str
    channel_id: str
    sender_id: str
    sender_culture: Language
    text: str


class AnnotationResult(BaseModel):
    message_id: str
    case_id: Optional[str] = None
    register: Register
    intent_label: str
    risk_category: Optional[str] = None
    micro_text: str
    coaching_rationale: str
    suggestions: list[SuggestionChip] = []


# Legacy internal model kept for app/schemas/annotation.py compatibility
class AnnotationRequest(BaseModel):
    message_id: str
    tenant_id: str
    source_language: Language
    target_language: Language
    redacted_text: str


class LLMRequest(BaseModel):
    prompt: str
    system_prompt: str
    max_tokens: int = 512
    temperature: float = 0.3


class LLMResponse(BaseModel):
    text: str
    provider: str
    latency_ms: int
