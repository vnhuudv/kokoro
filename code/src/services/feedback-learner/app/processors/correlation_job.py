import os
import asyncio
import asyncpg
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kokoro:kokoro@postgres:5432/kokoro")
WINDOW_DAYS = int(os.environ.get("CORRELATION_WINDOW_DAYS", "14"))


async def run_correlation_job() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)

        sessions = await conn.fetch(
            """SELECT id, channel_id, tenant_id, created_at
               FROM nominication_sessions
               WHERE status = 'completed'
                 AND created_at < $1
                 AND NOT EXISTS (
                     SELECT 1 FROM nominication_correlations nc
                     WHERE nc.session_id = nominication_sessions.id
                 )""",
            cutoff,
        )

        for session in sessions:
            session_date = session["created_at"]
            before_start = session_date - timedelta(days=WINDOW_DAYS)
            after_end = session_date + timedelta(days=WINDOW_DAYS)

            friction_before = await _avg_friction(
                conn, str(session["tenant_id"]), session["channel_id"],
                before_start, session_date,
            )
            friction_after = await _avg_friction(
                conn, str(session["tenant_id"]), session["channel_id"],
                session_date, after_end,
            )

            if friction_before is None or friction_after is None:
                logger.info("[correlation-job] skipping session %s — insufficient data", session["id"])
                continue

            delta = friction_after - friction_before
            await conn.execute(
                """INSERT INTO nominication_correlations
                   (session_id, channel_id, friction_before, friction_after, delta)
                   VALUES ($1, $2, $3, $4, $5)""",
                session["id"], session["channel_id"],
                round(friction_before * 100, 2),
                round(friction_after * 100, 2),
                round(delta * 100, 2),
            )
            logger.info(
                "[correlation-job] session %s delta=%.1f%%",
                session["id"], delta * 100,
            )

    finally:
        await conn.close()


async def _avg_friction(conn, tenant_id: str, channel_id: str, start, end) -> Optional[float]:
    row = await conn.fetchrow(
        """SELECT AVG(CASE WHEN is_risky THEN 1.0 ELSE 0.0 END) AS rate
           FROM channel_friction_snapshots
           WHERE tenant_id = $1::uuid
             AND channel_id = $2
             AND created_at BETWEEN $3 AND $4""",
        tenant_id, channel_id, start, end,
    )
    if row is None or row["rate"] is None:
        return None
    return float(row["rate"])


async def run_periodically(interval_seconds: int = 1800) -> None:
    """Run correlation job on a fixed interval (default 30 minutes)."""
    while True:
        logger.info("[correlation-job] starting scan…")
        try:
            await run_correlation_job()
            logger.info("[correlation-job] scan complete")
        except Exception as exc:
            logger.error("[correlation-job] scan failed: %s", exc)
        await asyncio.sleep(interval_seconds)
