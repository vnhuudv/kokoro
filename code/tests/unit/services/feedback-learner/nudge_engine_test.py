import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/feedback-learner'))

import pytest
from unittest.mock import AsyncMock, patch, call
from datetime import datetime, timezone
import asyncio


def test_run_nudge_engine_creates_nudge_for_high_friction_channel():
    async def run_test():
        mock_conn = AsyncMock()
        # High-friction channel result
        mock_conn.fetch.side_effect = [
            # High-friction channels query
            [{"tenant_id": "t-1", "channel_id": "C001", "event_count": 10, "friction_rate": 0.7}],
            # _find_target_user query
            [{"user_id": "u-uuid-1", "slack_user_id": "U001"}],
        ]
        mock_conn.execute = AsyncMock()

        with patch("app.processors.nudge_engine.asyncpg.connect", return_value=mock_conn):
            from app.processors.nudge_engine import run_nudge_engine
            await run_nudge_engine()

        mock_conn.execute.assert_awaited_once()
        call_sql = mock_conn.execute.call_args[0][0]
        assert "INSERT INTO nominication_nudges" in call_sql

    asyncio.run(run_test())


def test_run_nudge_engine_skips_low_friction_channel():
    async def run_test():
        mock_conn = AsyncMock()
        mock_conn.fetch.side_effect = [
            [],  # No high-friction channels returned
        ]
        mock_conn.execute = AsyncMock()

        with patch("app.processors.nudge_engine.asyncpg.connect", return_value=mock_conn):
            from app.processors.nudge_engine import run_nudge_engine
            await run_nudge_engine()

        mock_conn.execute.assert_not_awaited()

    asyncio.run(run_test())


def test_run_nudge_engine_skips_when_no_user_found():
    async def run_test():
        mock_conn = AsyncMock()
        mock_conn.fetch.side_effect = [
            [{"tenant_id": "t-1", "channel_id": "C001", "event_count": 5, "friction_rate": 0.8}],
            [],  # No user found
        ]
        mock_conn.execute = AsyncMock()

        with patch("app.processors.nudge_engine.asyncpg.connect", return_value=mock_conn):
            from app.processors.nudge_engine import run_nudge_engine
            await run_nudge_engine()

        mock_conn.execute.assert_not_awaited()

    asyncio.run(run_test())
