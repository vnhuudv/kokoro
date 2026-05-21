import time
import uuid
from fastapi import APIRouter, BackgroundTasks
from app.schemas.annotation import AnnotationRequest, AnnotationResponse
from app.pipeline.anonymiser import anonymise
from app.pipeline.register_detector import detect_register
from app.pipeline.intent_extractor import extract_intent
from app.pipeline.annotator import build_annotation
from app.pipeline.persist import persist_case

router = APIRouter(prefix="/annotate", tags=["annotation"])


@router.post("/", response_model=AnnotationResponse)
async def annotate(request: AnnotationRequest, background_tasks: BackgroundTasks) -> AnnotationResponse:
    start = time.monotonic()

    clean_text = anonymise(request.redacted_text)
    register = detect_register(clean_text, request.source_language.value)
    intent_result = await extract_intent(clean_text, register, request.source_language.value)
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
    )

    return AnnotationResponse(
        message_id=request.message_id,
        result=result,
        latency_ms=latency_ms,
    )
