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

PATTERN_SCAN_INTERVAL = int(os.environ.get("PATTERN_SCAN_INTERVAL_SECONDS", "1800"))
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
    logger.info("[feedback-learner] starting — scan interval %ds", PATTERN_SCAN_INTERVAL)

    await asyncio.gather(
        consume_annotation_events(handle_annotation_event),
        run_periodically(PATTERN_SCAN_INTERVAL),
    )


if __name__ == "__main__":
    asyncio.run(main())
