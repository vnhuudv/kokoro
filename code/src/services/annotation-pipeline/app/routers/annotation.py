import time
import uuid
from fastapi import APIRouter, BackgroundTasks
from app.schemas.annotation import AnnotationRequest, AnnotationResponse
from app.pipeline.anonymiser import anonymise
from app.pipeline.register_detector import detect_register
from app.pipeline.intent_extractor import extract_intent
from app.pipeline.annotator import build_annotation
from app.pipeline.persist import persist_case
from app.pipeline.token_logger import log_tokens

router = APIRouter(prefix="/annotate", tags=["annotation"])


@router.post("/", response_model=AnnotationResponse)
async def annotate(request: AnnotationRequest, background_tasks: BackgroundTasks) -> AnnotationResponse:
    start = time.monotonic()

    clean_text = anonymise(request.redacted_text)
    register = detect_register(clean_text, request.source_language.value)
    intent_result, llm_response = await extract_intent(clean_text, register, request.source_language.value)
    result = build_annotation(
        message_id=request.message_id,
        register=register,
        intent_result=intent_result,
    )

    latency_ms = int((time.monotonic() - start) * 1000)

    case_id = str(uuid.uuid4())
    result.case_id = case_id
    background_tasks.add_task(
        persist_case,
        case_id=case_id,
        result=result,
        tenant_name=request.tenant_id,
        source_language=request.source_language.value,
        target_language=request.target_language.value,
        latency_ms=latency_ms,
        input_tokens=llm_response.input_tokens if llm_response else 0,
        output_tokens=llm_response.output_tokens if llm_response else 0,
        llm_provider=llm_response.provider if llm_response else None,
        channel_id=request.channel_id,
    )

    if llm_response and request.slack_user_id:
        background_tasks.add_task(
            log_tokens,
            slack_user_id=request.slack_user_id,
            tenant_id=request.tenant_id,
            provider=llm_response.provider,
            input_tokens=llm_response.input_tokens,
            output_tokens=llm_response.output_tokens,
        )

    return AnnotationResponse(
        message_id=request.message_id,
        result=result,
        latency_ms=latency_ms,
    )
