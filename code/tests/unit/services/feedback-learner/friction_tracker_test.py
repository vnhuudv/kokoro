import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/feedback-learner'))

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import asyncio


def test_record_channel_friction_inserts_row():
    """Test that record_channel_friction inserts the correct row into the database."""
    async def run_test():
        mock_conn = AsyncMock()

        with patch("app.processors.friction_tracker.asyncpg.connect", return_value=mock_conn):
            from app.processors.friction_tracker import record_channel_friction
            await record_channel_friction(
                channel_id="C001",
                tenant_id="a0000000-0000-0000-0000-000000000001",
                is_risky=True,
            )

        mock_conn.execute.assert_awaited_once()
        call_args = mock_conn.execute.call_args[0]
        assert "channel_friction_snapshots" in call_args[0]
        assert call_args[1] == "a0000000-0000-0000-0000-000000000001"
        assert call_args[2] == "C001"
        assert call_args[3] is True
        mock_conn.close.assert_awaited_once()

    asyncio.run(run_test())


def test_record_channel_friction_closes_on_error():
    """Test that the connection is closed even when an error occurs."""
    async def run_test():
        mock_conn = AsyncMock()
        mock_conn.execute.side_effect = Exception("db error")

        with patch("app.processors.friction_tracker.asyncpg.connect", return_value=mock_conn):
            from app.processors.friction_tracker import record_channel_friction
            with pytest.raises(Exception, match="db error"):
                await record_channel_friction("C001", "tenant-1", False)

        mock_conn.close.assert_awaited_once()

    asyncio.run(run_test())
