import logging
from datetime import date
from python_shared.db import get_pool

logger = logging.getLogger(__name__)

_PROVIDER_MAP = {
    "claude":    "anthropic",
    "anthropic": "anthropic",
    "openai":    "openai",
    "gemini":    "google",
    "google":    "google",
}


async def log_tokens(
    *,
    slack_user_id: str | None,
    tenant_id: str,
    provider: str | None,
    input_tokens: int,
    output_tokens: int,
) -> None:
    if not slack_user_id:
        return

    normalised_provider = _PROVIDER_MAP.get(provider or "", "other")
    period = date.today().replace(day=1)

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            user_row = await conn.fetchrow(
                "SELECT user_id FROM users WHERE tenant_id = $1 AND slack_user_id = $2",
                tenant_id,
                slack_user_id,
            )
            if not user_row:
                return

            await conn.execute(
                """
                INSERT INTO ai_usage_logs
                  (user_id, tenant_id, source, provider, tool, input_tokens, output_tokens, period_month)
                VALUES ($1, $2, 'gateway', $3, 'kokoro', $4, $5, $6)
                ON CONFLICT ON CONSTRAINT uq_ai_usage_logs_user_tool_period
                DO UPDATE SET
                  input_tokens  = ai_usage_logs.input_tokens  + EXCLUDED.input_tokens,
                  output_tokens = ai_usage_logs.output_tokens + EXCLUDED.output_tokens,
                  recorded_at   = now()
                """,
                user_row["user_id"],
                tenant_id,
                normalised_provider,
                input_tokens,
                output_tokens,
                period,
            )
    except Exception as exc:
        logger.warning("log_tokens failed (non-fatal): %s", exc)
