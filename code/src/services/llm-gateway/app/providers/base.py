from abc import ABC, abstractmethod
from python_shared.types import LLMRequest, LLMResponse


class BaseProvider(ABC):
    name: str

    @abstractmethod
    async def complete(self, request: LLMRequest) -> LLMResponse:
        """Call the LLM and return a response. Raises on error."""
        ...
