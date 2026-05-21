import asyncio
import logging
from fastapi import APIRouter, HTTPException
from python_shared.types import LLMRequest, LLMResponse
from app.providers.base import BaseProvider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["llm"])

PROVIDER_ORDER = ["claude", "openai", "gemini"]

_providers: dict[str, BaseProvider] = {}

TIMEOUT_SECONDS = 30.0


def _get_providers() -> dict[str, BaseProvider]:
    if not _providers:
        from app.providers.claude import ClaudeProvider
        from app.providers.openai import OpenAIProvider
        from app.providers.gemini import GeminiProvider
        _providers["claude"] = ClaudeProvider()
        _providers["openai"] = OpenAIProvider()
        _providers["gemini"] = GeminiProvider()
    return _providers


@router.post("/complete", response_model=LLMResponse)
async def complete(request: LLMRequest) -> LLMResponse:
    providers = _get_providers()
    for provider_name in PROVIDER_ORDER:
        provider = providers[provider_name]
        try:
            return await asyncio.wait_for(
                provider.complete(request),
                timeout=TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            logger.warning("Provider %s timed out after %ss", provider_name, TIMEOUT_SECONDS)
        except Exception as exc:
            logger.warning("Provider %s failed: %s", provider_name, exc)
    raise HTTPException(status_code=503, detail="All LLM providers unavailable")
