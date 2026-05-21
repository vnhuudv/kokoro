import sys
import os
import asyncio
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

from app.consumers.annotation_consumer import consume_annotation_events
from app.processors.pattern_learner import run_periodically

PATTERN_SCAN_INTERVAL = int(os.environ.get("PATTERN_SCAN_INTERVAL_SECONDS", "1800"))


async def handle_annotation_event(event: dict) -> None:
    logger.info("[feedback-learner] annotation event: %s", event.get("message_id"))


async def main() -> None:
    logger.info("[feedback-learner] starting — scan interval %ds", PATTERN_SCAN_INTERVAL)

    await asyncio.gather(
        consume_annotation_events(handle_annotation_event),
        run_periodically(PATTERN_SCAN_INTERVAL),
    )


if __name__ == "__main__":
    asyncio.run(main())
