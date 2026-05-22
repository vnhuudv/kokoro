import os
import asyncpg
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kokoro:kokoro@postgres:5432/kokoro")


async def record_channel_friction(channel_id: str, tenant_id: str, is_risky: bool) -> None:
    """Record a channel friction snapshot for the given channel and tenant.

    Args:
        channel_id: Slack channel ID (e.g., "C001")
        tenant_id: Tenant UUID
        is_risky: Whether this message was flagged as risky
    """
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(
            """INSERT INTO channel_friction_snapshots (tenant_id, channel_id, is_risky)
               VALUES ($1, $2, $3)""",
            tenant_id, channel_id, is_risky,
        )
    finally:
        await conn.close()
