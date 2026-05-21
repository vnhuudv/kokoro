import time
import anthropic
from python_shared.types import LLMRequest, LLMResponse
from .base import BaseProvider


class ClaudeProvider(BaseProvider):
    name = "claude"

    def __init__(self):
        self._client = anthropic.AsyncAnthropic()

    async def complete(self, request: LLMRequest) -> LLMResponse:
        start = time.monotonic()
        message = await self._client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=request.max_tokens,
            system=request.system_prompt,
            messages=[{"role": "user", "content": request.prompt}],
        )
        latency_ms = int((time.monotonic() - start) * 1000)
        return LLMResponse(
            text=message.content[0].text,
            provider=self.name,
            latency_ms=latency_ms,
        )
