from python_shared.kafka import get_consumer


async def consume_annotation_events(handler) -> None:
    """Consume annotation.created events and pass each to handler."""
    consumer = await get_consumer("annotation.created", group_id="feedback-learner")
    try:
        async for msg in consumer:
            await handler(msg.value)
    finally:
        await consumer.stop()
