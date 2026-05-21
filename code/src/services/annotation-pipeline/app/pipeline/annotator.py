from python_shared.types import AnnotationResult, Register, IntentResult


def build_annotation(
    message_id: str,
    register: Register,
    intent_result: IntentResult,
) -> AnnotationResult:
    return AnnotationResult(
        message_id=message_id,
        register=register,
        intent_label=intent_result.intent_label,
        risk_category=intent_result.risk_category,
        micro_text=intent_result.micro_text,
        suggestions=intent_result.suggestions,
        coaching_rationale=intent_result.coaching_rationale,
    )
