import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/llm-gateway'))

from app.providers.base import BaseProvider
from app.providers.claude import ClaudeProvider


def test_claude_provider_is_base_provider():
    assert issubclass(ClaudeProvider, BaseProvider)


def test_provider_order():
    from app.routers.llm import PROVIDER_ORDER
    assert PROVIDER_ORDER[0] == "claude"
    assert PROVIDER_ORDER[1] == "openai"
    assert PROVIDER_ORDER[2] == "gemini"
