import time
import openai
from python_shared.types import LLMRequest, LLMResponse
from .base import BaseProvider


class OpenAIProvider(BaseProvider):
    name = "openai"

    def __init__(self):
        self._client = openai.AsyncOpenAI()

    async def complete(self, request: LLMRequest) -> LLMResponse:
        start = time.monotonic()
        response = await self._client.chat.completions.create(
            model="gpt-4o",
            max_tokens=request.max_tokens,
            messages=[
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.prompt},
            ],
        )
        latency_ms = int((time.monotonic() - start) * 1000)
        usage = response.usage
        return LLMResponse(
            text=response.choices[0].message.content or "",
            provider=self.name,
            latency_ms=latency_ms,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
        )
