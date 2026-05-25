import os
import asyncio
import asyncpg
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kokoro:kokoro@postgres:5432/kokoro")
FRICTION_THRESHOLD = float(os.environ.get("NUDGE_FRICTION_THRESHOLD", "0.6"))
FRICTION_WINDOW_DAYS = int(os.environ.get("NUDGE_FRICTION_WINDOW_DAYS", "7"))
NUDGE_COOLDOWN_DAYS = int(os.environ.get("NUDGE_COOLDOWN_DAYS", "14"))
MIN_EVENTS = int(os.environ.get("NUDGE_MIN_EVENTS", "3"))


async def run_nudge_engine() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(days=FRICTION_WINDOW_DAYS)
        cooldown_start = now - timedelta(days=NUDGE_COOLDOWN_DAYS)

        rows = await conn.fetch(
            """
            SELECT cfs.tenant_id, cfs.channel_id,
                   COUNT(*) AS event_count,
                   AVG(CASE WHEN cfs.is_risky THEN 1.0 ELSE 0.0 END) AS friction_rate
            FROM channel_friction_snapshots cfs
            WHERE cfs.created_at > $1
              AND NOT EXISTS (
                SELECT 1 FROM nominication_nudges nn
                WHERE nn.tenant_id = cfs.tenant_id
                  AND nn.channel_id = cfs.channel_id
                  AND nn.created_at > $2
                  AND nn.status != 'dismissed'
              )
            GROUP BY cfs.tenant_id, cfs.channel_id
            HAVING COUNT(*) >= $3
               AND AVG(CASE WHEN cfs.is_risky THEN 1.0 ELSE 0.0 END) >= $4
            """,
            window_start, cooldown_start, MIN_EVENTS, FRICTION_THRESHOLD,
        )

        for row in rows:
            target = await _find_target_user(conn, str(row["tenant_id"]))
            if not target:
                logger.warning("[nudge-engine] no opted-in user for tenant %s", row["tenant_id"])
                continue

            friction_pct = round(float(row["friction_rate"]) * 100, 2)
            reason = (
                f"Kokoro noticed {int(friction_pct)}% cross-cultural friction "
                f"in this channel over the past {FRICTION_WINDOW_DAYS} days"
            )
            await conn.execute(
                """INSERT INTO nominication_nudges
                   (tenant_id, channel_id, target_slack_user_id, reason, friction_score)
                   VALUES ($1, $2, $3, $4, $5)""",
                row["tenant_id"], row["channel_id"], target["slack_user_id"],
                reason, friction_pct,
            )
            logger.info("[nudge-engine] nudge created for channel %s", row["channel_id"])

    finally:
        await conn.close()


async def _find_target_user(conn, tenant_id: str) -> Optional[dict]:
    rows = await conn.fetch(
        """SELECT user_id, slack_user_id FROM users
           WHERE tenant_id = $1::uuid AND opted_out_at IS NULL
           ORDER BY RANDOM() LIMIT 1""",
        tenant_id,
    )
    return dict(rows[0]) if rows else None


async def run_periodically(interval_seconds: int = 3600) -> None:
    """Run nudge engine on a fixed interval (default 1 hour)."""
    while True:
        logger.info("[nudge-engine] starting scan…")
        try:
            await run_nudge_engine()
            logger.info("[nudge-engine] scan complete")
        except Exception as exc:
            logger.error("[nudge-engine] scan failed: %s", exc)
        await asyncio.sleep(interval_seconds)
