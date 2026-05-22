import json
import logging
from datetime import datetime, timedelta, timezone
from python_shared.db import get_pool
from python_shared.kafka import get_producer
from python_shared.types import AnnotationResult

logger = logging.getLogger(__name__)

_DEFAULT_TENANT_ID = "a0000000-0000-0000-0000-000000000001"


def _expires() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=548)


async def _resolve_tenant_id(tenant_name: str) -> str:
    if tenant_name == "default-tenant":
        return _DEFAULT_TENANT_ID
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT tenant_id FROM tenants WHERE name = $1", tenant_name)
    return str(row["tenant_id"]) if row else _DEFAULT_TENANT_ID


async def persist_case(
    case_id: str,
    result: AnnotationResult,
    tenant_name: str,
    source_language: str,
    target_language: str,
    latency_ms: int,
    input_tokens: int = 0,
    output_tokens: int = 0,
    llm_provider: str | None = None,
) -> None:
    try:
        tenant_id = await _resolve_tenant_id(tenant_name)
        pool = await get_pool()
        risk_categories = [result.risk_category] if result.risk_category else []
        suggestion_offered = len(result.suggestions) > 0
        expires = _expires()

        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO case_library (
                    case_id, tenant_id, source_language, target_language,
                    register, intent_label, risk_categories,
                    suggestion_offered, suggestion_used,
                    input_tokens, output_tokens, llm_provider, expires_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, $12)
                """,
                case_id,
                tenant_id,
                source_language,
                target_language,
                result.register,
                result.intent_label,
                risk_categories,
                suggestion_offered,
                input_tokens,
                output_tokens,
                llm_provider,
                expires,
            )

        await _persist_audit(tenant_id, latency_ms, pool=pool)
        logger.info("case_library row written case_id=%s intent=%s", case_id, result.intent_label)

        # Publish event for feedback-learner (fire and forget)
        try:
            producer = await get_producer()
            await producer.send_and_wait(
                "annotation.created",
                {
                    "message_id": result.message_id,
                    "case_id": case_id,
                    "register": result.register,
                    "intent_label": result.intent_label,
                    "risk_category": result.risk_category,
                    "source_language": source_language,
                    "target_language": target_language,
                },
            )
            await producer.stop()
        except Exception as kafka_exc:
            logger.warning("kafka publish failed (non-fatal): %s", kafka_exc)

    except Exception as exc:
        logger.warning("persist_case failed: %s", exc)


async def _persist_audit(tenant_id: str, latency_ms: int, pool=None) -> None:
    if pool is None:
        pool = await get_pool()
    expires = _expires()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (
                tenant_id, action, pipeline_stage,
                latency_ms, success, data_class, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            tenant_id,
            "annotation",
            "intent_extraction",
            latency_ms,
            True,
            "anonymised",
            expires,
        )


async def persist_suggestion_used(
    case_id: str,
    slack_user_id: str,
    tenant_name: str,
    language: str,
) -> None:
    try:
        tenant_id = await _resolve_tenant_id(tenant_name)
        pool = await get_pool()

        async with pool.acquire() as conn:
            # Upsert user (pilot participants auto-enrolled on first interaction)
            row = await conn.fetchrow(
                """
                INSERT INTO users (tenant_id, slack_user_id, language, opted_in_at)
                VALUES ($1, $2, $3, now())
                ON CONFLICT (tenant_id, slack_user_id) DO UPDATE SET updated_at = now()
                RETURNING user_id
                """,
                tenant_id,
                slack_user_id,
                language,
            )
            user_id = row["user_id"]

            # Mark case as suggestion used
            await conn.execute(
                "UPDATE case_library SET suggestion_used = TRUE WHERE case_id = $1",
                case_id,
            )

            # Write fluency event
            await conn.execute(
                """
                INSERT INTO fluency_events (user_id, event_type)
                VALUES ($1, 'suggestion_used')
                """,
                user_id,
            )

            # Increment fluency score (+2 per suggestion used, cap 100)
            await conn.execute(
                "UPDATE users SET fluency_score = LEAST(100, fluency_score + 2) WHERE user_id = $1",
                user_id,
            )

        logger.info("suggestion_used recorded case_id=%s user=%s", case_id, slack_user_id)

    except Exception as exc:
        logger.warning("persist_suggestion_used failed: %s", exc)
