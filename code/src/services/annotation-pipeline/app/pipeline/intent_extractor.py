import json
import logging
import httpx
from python_shared.types import IntentResult, Register, SuggestionChip

logger = logging.getLogger(__name__)

LLM_GATEWAY_URL = "http://llm-gateway:8002/llm/complete"

_SYSTEM_PROMPT = """\
You are a Vietnamese-Japanese cross-cultural communication expert.
Analyse the message and return ONLY a valid JSON object — no markdown, no extra text.

JSON schema:
{
  "intent_label": "<short label, e.g. Firm request>",
  "risk_category": "<e.g. Register mismatch | null if none>",
  "micro_text": "<one sentence insight, max 20 words>",
  "coaching_rationale": "<2-3 sentence explanation of the cultural nuance>",
  "suggestions": [
    {"label": "<action label>", "register": "<formal|neutral|informal>", "text": "<suggested reply or empty string>"}
  ]
}

suggestions should have 0–2 items. Only include suggestions when a reframe would genuinely help.
"""


def _fallback(register: Register) -> IntentResult:
    if register == Register.informal:
        return IntentResult(
            intent_label="Casual exchange",
            micro_text="This message is informal — appropriate for close colleagues.",
            coaching_rationale="Informal register may read as disrespectful in cross-cultural contexts where formality signals respect.",
        )
    if register == Register.formal:
        return IntentResult(
            intent_label="Formal statement",
            micro_text="This message uses a high level of formality.",
            coaching_rationale="Formal register signals respect and seniority awareness.",
        )
    return IntentResult(
        intent_label="Neutral message",
        micro_text="No significant cultural register detected.",
        coaching_rationale="",
    )


async def extract_intent(text: str, register: Register, source_lang: str) -> IntentResult:
    prompt = (
        f"Source language: {source_lang}\n"
        f"Register detected: {register.value}\n"
        f"Message: {text}\n\n"
        "Return only the JSON object."
    )

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                LLM_GATEWAY_URL,
                json={
                    "prompt": prompt,
                    "system_prompt": _SYSTEM_PROMPT,
                    "max_tokens": 512,
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            llm_text = response.json()["text"]

        data = json.loads(llm_text)
        suggestions = [
            SuggestionChip(
                label=s["label"],
                register=Register(s["register"]),
                text=s.get("text", ""),
            )
            for s in data.get("suggestions", [])
        ]
        return IntentResult(
            intent_label=data["intent_label"],
            risk_category=data.get("risk_category"),
            micro_text=data["micro_text"],
            coaching_rationale=data["coaching_rationale"],
            suggestions=suggestions,
        )

    except Exception as exc:
        logger.warning("LLM intent extraction failed, using fallback: %s", exc)
        return _fallback(register)
