import json
import logging
import asyncio
import os
import httpx
import asyncpg

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kokoro:kokoro@postgres:5432/kokoro")
LLM_GATEWAY_URL = "http://llm-gateway:8002/llm/complete"
MIN_CASES = int(os.environ.get("PATTERN_MIN_CASES", "3"))
MIN_ADOPTION = 0.30    # minimum suggestion_used rate to consider pattern significant
LEARNER_VERSION = "feedback-learner-v1"

_SYSTEM_PROMPT = """\
You are a Vietnamese-Japanese cross-cultural communication expert building a reusable pattern library.
Return ONLY a valid JSON object — no markdown, no extra text.

JSON schema:
{
  "phrase_pattern": "<abstract description of the problematic phrasing pattern, 10-20 words>",
  "annotation_template": "<one-sentence ephemeral annotation template, under 20 words, use {register} as placeholder>",
  "coaching_rationale": "<2-3 sentences grounded in specific cultural concepts: saving face, hierarchy, deference, nemawashi, Ma, En, Makoto, Kokoro frameworks>",
  "cultural_concept": "<the single most relevant cultural concept, e.g. 'saving face', 'nemawashi', 'keigo hierarchy'>"
}

Be concrete and specific. The phrase_pattern must be abstract enough to apply to similar messages in future.
"""


async def _call_llm(prompt: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                LLM_GATEWAY_URL,
                json={
                    "prompt": prompt,
                    "system_prompt": _SYSTEM_PROMPT,
                    "max_tokens": 400,
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
            return json.loads(response.json()["text"])
    except Exception as exc:
        logger.warning("LLM call failed: %s", exc)
        return None


async def run_pattern_learning() -> int:
    """Scan case_library for significant patterns and write new cultural_pairs rows.

    Returns the number of new pairs written.
    """
    conn = await asyncpg.connect(DATABASE_URL)
    written = 0
    try:
        # Find patterns with enough cases and meaningful adoption rate
        rows = await conn.fetch(
            """
            SELECT
                source_language,
                target_language,
                register,
                intent_label,
                risk_categories[1]                               AS risk_category,
                COUNT(*)                                         AS total,
                SUM(CASE WHEN suggestion_used THEN 1 ELSE 0 END) AS used
            FROM case_library
            WHERE suggestion_offered = TRUE
            GROUP BY source_language, target_language, register, intent_label, risk_categories[1]
            HAVING COUNT(*) >= $1
            """,
            MIN_CASES,
        )

        for row in rows:
            adoption = row["used"] / row["total"] if row["total"] > 0 else 0
            if adoption < MIN_ADOPTION:
                continue

            # Skip if this pattern is already in cultural_pairs
            existing = await conn.fetchval(
                """
                SELECT 1 FROM cultural_pairs
                WHERE source_language = $1
                  AND target_language = $2
                  AND register        = $3
                  AND intent_label    = $4
                  AND COALESCE(risk_category, '') = COALESCE($5, '')
                  AND is_active = TRUE
                LIMIT 1
                """,
                row["source_language"],
                row["target_language"],
                row["register"],
                row["intent_label"],
                row["risk_category"],
            )
            if existing:
                continue

            prompt = (
                f"Source language: {row['source_language']}\n"
                f"Target language: {row['target_language']}\n"
                f"Register: {row['register']}\n"
                f"Intent label: {row['intent_label']}\n"
                f"Risk category: {row['risk_category'] or 'none'}\n"
                f"Observed cases: {row['total']} (suggestion adoption rate: {adoption:.0%})\n\n"
                "Generate the cultural pair entry for this pattern."
            )

            data = await _call_llm(prompt)
            if not data:
                continue

            await conn.execute(
                """
                INSERT INTO cultural_pairs (
                    source_language, target_language, register,
                    phrase_pattern, intent_label, risk_category,
                    annotation_template, coaching_rationale, cultural_concept,
                    created_by, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
                """,
                row["source_language"],
                row["target_language"],
                row["register"],
                data.get("phrase_pattern", ""),
                row["intent_label"],
                row["risk_category"],
                data.get("annotation_template", ""),
                data.get("coaching_rationale", ""),
                data.get("cultural_concept"),
                LEARNER_VERSION,
            )
            written += 1
            logger.info(
                "New cultural pair: %s / %s / %s → %s",
                row["register"], row["intent_label"], row["risk_category"],
                data.get("cultural_concept"),
            )

    finally:
        await conn.close()

    return written


async def run_periodically(interval_seconds: int = 1800) -> None:
    """Run pattern learning on a fixed interval (default 30 minutes)."""
    while True:
        logger.info("[pattern-learner] starting scan…")
        try:
            n = await run_pattern_learning()
            logger.info("[pattern-learner] scan complete — %d new pairs written", n)
        except Exception as exc:
            logger.error("[pattern-learner] scan failed: %s", exc)
        await asyncio.sleep(interval_seconds)
