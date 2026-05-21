from typing import Optional
from python_shared.types import AnnotationResult


def build_case_record(
    tenant_id: str,
    source_lang: str,
    target_lang: str,
    result: AnnotationResult,
    suggestion_used: Optional[bool],
) -> dict:
    """Build an anonymised case library record from an annotation event."""
    return {
        "tenant_id": tenant_id,
        "source_language": source_lang,
        "target_language": target_lang,
        "register": result.register.value,
        "intent_label": result.intent_label,
        "risk_categories": [result.risk_category] if result.risk_category else [],
        "suggestion_offered": len(result.suggestions) > 0,
        "suggestion_used": suggestion_used,
    }
