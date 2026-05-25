import sys
import os
import asyncio
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

from app.consumers.annotation_consumer import consume_annotation_events
from app.processors.pattern_learner import run_periodically
from app.processors.friction_tracker import record_channel_friction
from app.processors.nudge_engine import run_periodically as run_nudge_engine_periodically
from app.processors.correlation_job import run_periodically as run_correlation_job_periodically

PATTERN_SCAN_INTERVAL = int(os.environ.get("PATTERN_SCAN_INTERVAL_SECONDS", "1800"))
NUDGE_ENGINE_INTERVAL  = int(os.environ.get("NUDGE_ENGINE_INTERVAL_SECONDS", "3600"))
CORRELATION_INTERVAL   = int(os.environ.get("CORRELATION_SCAN_INTERVAL_SECONDS", "1800"))
TENANT_ID = os.environ.get("SLACK_TENANT_ID", "a0000000-0000-0000-0000-000000000001")


async def handle_annotation_event(event: dict) -> None:
    logger.info("[feedback-learner] annotation event: %s", event.get("message_id"))
    channel_id = event.get("channel_id")
    is_risky = bool(event.get("risk_category"))
    if channel_id:
        try:
            await record_channel_friction(channel_id, TENANT_ID, is_risky)
        except Exception as exc:
            logger.warning("[friction-tracker] failed to record: %s", exc)


async def main() -> None:
    logger.info(
        "[feedback-learner] starting — pattern=%ds nudge=%ds correlation=%ds",
        PATTERN_SCAN_INTERVAL, NUDGE_ENGINE_INTERVAL, CORRELATION_INTERVAL,
    )

    await asyncio.gather(
        consume_annotation_events(handle_annotation_event),
        run_periodically(PATTERN_SCAN_INTERVAL),
        run_nudge_engine_periodically(NUDGE_ENGINE_INTERVAL),
        run_correlation_job_periodically(CORRELATION_INTERVAL),
    )


if __name__ == "__main__":
    asyncio.run(main())
