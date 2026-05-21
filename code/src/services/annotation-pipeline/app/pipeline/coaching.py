import json
import logging
import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

LLM_GATEWAY_URL = "http://llm-gateway:8002/llm/complete"

_SYSTEM_PROMPT = """\
You are a Vietnamese-Japanese cross-cultural communication expert providing a coaching panel.
Return ONLY a valid JSON object — no markdown, no extra text.

JSON schema:
{
  "register_label": "<cultural label, e.g. Highly formal keigo>",
  "register_explanation": "<1-2 sentences explaining this register in plain language>",
  "intent": "<the underlying communicative intent behind the surface phrasing>",
  "cultural_risk": "<specific risk for the counterpart and why, or null if none>",
  "rationale": "<2-3 sentences grounded in specific cultural concepts: saving face, hierarchy, deference, continuity, specificity norms, or Kokoro/En/Makoto frameworks>",
  "suggestion": "<culturally adapted alternative phrasing, or null if not needed>"
}

The rationale MUST reference specific cultural concepts, not generic advice.
"""


class CoachingContent(BaseModel):
    register_label: str
    register_explanation: str
    intent: str
    cultural_risk: str | None = None
    rationale: str
    suggestion: str | None = None


def _fallback(register: str, intent_label: str) -> CoachingContent:
    return CoachingContent(
        register_label=register.capitalize(),
        register_explanation=f"This message uses a {register} register.",
        intent=intent_label,
        rationale="Cultural coaching is temporarily unavailable. The annotation above provides a brief explanation.",
    )


async def generate_coaching(
    register: str,
    intent_label: str,
    risk_category: str | None,
    micro_text: str,
    coaching_rationale: str,
    source_lang: str,
) -> CoachingContent:
    prompt = (
        f"Source language: {source_lang}\n"
        f"Register: {register}\n"
        f"Intent label: {intent_label}\n"
        f"Risk category: {risk_category or 'none'}\n"
        f"Brief annotation: {micro_text}\n"
        f"Existing rationale: {coaching_rationale}\n\n"
        "Generate the full coaching panel JSON."
    )

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                LLM_GATEWAY_URL,
                json={
                    "prompt": prompt,
                    "system_prompt": _SYSTEM_PROMPT,
                    "max_tokens": 600,
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            data = json.loads(response.json()["text"])
        return CoachingContent(**data)

    except Exception as exc:
        logger.warning("generate_coaching failed: %s", exc)
        return _fallback(register, intent_label)
