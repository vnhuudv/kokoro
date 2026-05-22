import time
import google.generativeai as genai
from python_shared.types import LLMRequest, LLMResponse
from .base import BaseProvider


class GeminiProvider(BaseProvider):
    name = "gemini"

    def __init__(self):
        self._model = genai.GenerativeModel("gemini-1.5-pro")

    async def complete(self, request: LLMRequest) -> LLMResponse:
        start = time.monotonic()
        response = await self._model.generate_content_async(
            f"{request.system_prompt}\n\n{request.prompt}"
        )
        latency_ms = int((time.monotonic() - start) * 1000)
        usage = getattr(response, 'usage_metadata', None)
        return LLMResponse(
            text=response.text,
            provider=self.name,
            latency_ms=latency_ms,
            input_tokens=getattr(usage, 'prompt_token_count', 0) if usage else 0,
            output_tokens=getattr(usage, 'candidates_token_count', 0) if usage else 0,
        )
