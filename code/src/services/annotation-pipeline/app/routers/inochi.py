"""
Inochi (命) carbon footprint endpoint.
Reads actual token usage from case_library and calculates the pilot's AI infrastructure
carbon footprint. Used in the Kokoro dashboard and the Inochi pillar evidence.

Carbon intensity references:
- Anthropic (Claude): ~0.000029 kg CO2e / 1k tokens (US East, renewable energy commitment)
- OpenAI (GPT-4o): ~0.000043 kg CO2e / 1k tokens (Azure, mixed renewable)
- Gemini (Google): ~0.000022 kg CO2e / 1k tokens (GCP, carbon-neutral commitment)

These are conservative estimates based on published provider sustainability reports.
Actual figures may be lower due to renewable energy purchase agreements.
"""
from fastapi import APIRouter
from python_shared.db import get_pool

router = APIRouter(prefix="/inochi", tags=["inochi"])

# kg CO2e per 1,000 tokens — input and output combined (conservative estimates)
CARBON_INTENSITY: dict[str, float] = {
    "claude":  0.000029,
    "openai":  0.000043,
    "gemini":  0.000022,
    "default": 0.000035,
}

# Device and office estimate for the pilot (fixed, from spec)
DEVICE_KG_CO2E = 85.0   # 4 developer laptops × 8h × 245 days × VN grid
HOSTING_KG_CO2E = 12.0  # Cloud hosting over 8-month pilot


def _tokens_to_kg(tokens: int, provider: str) -> float:
    intensity = CARBON_INTENSITY.get(provider or "default", CARBON_INTENSITY["default"])
    return (tokens / 1000) * intensity


@router.get("/carbon")
async def get_carbon_footprint():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                llm_provider,
                SUM(input_tokens)  AS total_input,
                SUM(output_tokens) AS total_output,
                COUNT(*)           AS case_count
            FROM case_library
            GROUP BY llm_provider
            """
        )

    providers = []
    total_llm_kg = 0.0

    for row in rows:
        provider = row["llm_provider"] or "default"
        total_tokens = int(row["total_input"] or 0) + int(row["total_output"] or 0)
        kg = _tokens_to_kg(total_tokens, provider)
        total_llm_kg += kg
        providers.append({
            "provider": provider,
            "input_tokens": int(row["total_input"] or 0),
            "output_tokens": int(row["total_output"] or 0),
            "total_tokens": total_tokens,
            "case_count": int(row["case_count"]),
            "kg_co2e": round(kg, 4),
        })

    infrastructure_kg = DEVICE_KG_CO2E + HOSTING_KG_CO2E
    total_kg = total_llm_kg + infrastructure_kg

    return {
        "pilot_scope": "AI infrastructure only (LLM API calls + developer devices + cloud hosting)",
        "excludes": "Business travel, office utilities (not yet measured)",
        "providers": providers,
        "llm_kg_co2e": round(total_llm_kg, 4),
        "infrastructure_kg_co2e": round(infrastructure_kg, 2),
        "total_kg_co2e": round(total_kg, 2),
        "offset_cost_usd_estimate": round(total_kg / 1000 * 15, 2),  # ~$15/tonne Gold Standard
        "offset_recommended": "Gold Standard REDD+ Vietnam (Lam Dong forest protection)",
        "notes": [
            "LLM carbon intensities are estimates from provider sustainability reports.",
            "Device footprint uses Vietnam grid intensity 0.62 kg CO2e/kWh.",
            "Anthropic and Google operate on renewable energy; actual LLM footprint may be near zero.",
            "Travel footprint requires separate measurement if research trips occurred.",
        ],
    }
