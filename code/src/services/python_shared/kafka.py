import json
import os
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer


async def get_producer() -> AIOKafkaProducer:
    """Return a started AIOKafkaProducer. Caller is responsible for calling await producer.stop()."""
    producer = AIOKafkaProducer(
        bootstrap_servers=os.environ.get("KAFKA_BROKERS", "localhost:9092"),
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    await producer.start()
    return producer


async def get_consumer(topic: str, group_id: str) -> AIOKafkaConsumer:
    """Return a started AIOKafkaConsumer. Caller is responsible for calling await consumer.stop()."""
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=os.environ.get("KAFKA_BROKERS", "localhost:9092"),
        group_id=group_id,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
    )
    await consumer.start()
    return consumer
