import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_log_tokens_writes_record():
    mock_conn = AsyncMock()
    mock_pool = AsyncMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)
    mock_conn.fetchrow = AsyncMock(return_value={"user_id": "uid-123"})

    with patch("app.pipeline.token_logger.get_pool", return_value=mock_pool):
        from app.pipeline.token_logger import log_tokens
        await log_tokens(
            slack_user_id="U123",
            tenant_id="a0000000-0000-0000-0000-000000000001",
            provider="anthropic",
            input_tokens=500,
            output_tokens=200,
        )

    mock_conn.execute.assert_called_once()
    call_sql = mock_conn.execute.call_args[0][0]
    assert "ai_usage_logs" in call_sql
    assert "ON CONFLICT" in call_sql


@pytest.mark.asyncio
async def test_log_tokens_skips_when_no_slack_user():
    with patch("app.pipeline.token_logger.get_pool") as mock_get_pool:
        from app.pipeline.token_logger import log_tokens
        await log_tokens(
            slack_user_id=None,
            tenant_id="a0000000-0000-0000-0000-000000000001",
            provider="anthropic",
            input_tokens=100,
            output_tokens=50,
        )
        mock_get_pool.assert_not_called()


@pytest.mark.asyncio
async def test_log_tokens_skips_when_user_not_found():
    mock_conn = AsyncMock()
    mock_pool = AsyncMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)
    mock_conn.fetchrow = AsyncMock(return_value=None)

    with patch("app.pipeline.token_logger.get_pool", return_value=mock_pool):
        from app.pipeline.token_logger import log_tokens
        await log_tokens(
            slack_user_id="U_UNKNOWN",
            tenant_id="a0000000-0000-0000-0000-000000000001",
            provider="claude",
            input_tokens=100,
            output_tokens=50,
        )

    mock_conn.execute.assert_not_called()
