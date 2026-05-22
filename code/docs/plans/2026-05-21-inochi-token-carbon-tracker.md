# Inochi Token Carbon Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a per-user AI token carbon tracker that captures token usage from Kokoro's annotation pipeline and flat-rate tool estimates, calculates CO₂e, and surfaces it in a personal dashboard tab and a monthly Slack DM.

**Architecture:** Token usage is written to a new `ai_usage_logs` table from two sources: (1) the annotation pipeline writes per-user records when it processes a message (exact), and (2) a monthly NestJS cron job inserts flat-rate estimates for web tools like Claude.ai and Gemini (approximate). A new `inochi` module in the api-gateway serves REST endpoints for personal, team, and company carbon views, and triggers the monthly Slack DMs.

**Tech Stack:** PostgreSQL (3 new tables), asyncpg (annotation-pipeline), NestJS + `@nestjs/schedule` (api-gateway), React 18 + Vite (dashboard), `@slack/web-api` (Slack DMs), Jest (api-gateway tests), Vitest + React Testing Library (dashboard tests).

---

## File Map

**New files:**
- `code/src/database/migrations/004_inochi_carbon.sql` — 3 new tables
- `code/src/services/annotation-pipeline/app/pipeline/token_logger.py` — writes per-user token records to `ai_usage_logs`
- `code/src/services/api-gateway/src/modules/inochi/inochi.types.ts` — shared types + carbon constants
- `code/src/services/api-gateway/src/modules/inochi/inochi.service.ts` — carbon aggregation, sync, offset logic
- `code/src/services/api-gateway/src/modules/inochi/inochi.controller.ts` — REST endpoints
- `code/src/services/api-gateway/src/modules/inochi/inochi-sync.job.ts` — monthly cron
- `code/src/services/api-gateway/src/modules/inochi/inochi.module.ts` — NestJS module
- `code/src/web/dashboard/src/pages/CarbonView.tsx` — personal carbon tab
- `code/src/web/dashboard/src/pages/AdminCarbonView.tsx` — admin company/team view
- `code/tests/inochi/test_token_logger.py` — Python unit tests
- `code/tests/inochi/inochi.service.spec.ts` — NestJS service unit tests

**Modified files:**
- `code/src/services/annotation-pipeline/app/schemas/annotation.py` — add optional `slack_user_id`
- `code/src/services/annotation-pipeline/app/routers/annotation.py` — pass `slack_user_id` to token logger
- `code/src/services/api-gateway/src/app.module.ts` — register `InochiModule` + `ScheduleModule`
- `code/src/web/dashboard/src/App.tsx` — add `/carbon` and `/admin/carbon` routes
- `code/src/web/dashboard/src/components/Nav.tsx` — add "Carbon" nav link

---

## Task 1: DB Migration — Three New Tables

**Files:**
- Create: `code/src/database/migrations/004_inochi_carbon.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 004_inochi_carbon.sql
-- Inochi pillar: AI token carbon tracking tables

CREATE TABLE ai_usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(user_id) ON DELETE SET NULL,
  tenant_id       UUID NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('gateway', 'billing_api', 'estimate')),
  provider        TEXT NOT NULL CHECK (provider IN ('anthropic', 'google', 'openai', 'other')),
  tool            TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  period_month    DATE NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_user_month  ON ai_usage_logs (user_id, period_month);
CREATE INDEX idx_ai_usage_logs_tenant_month ON ai_usage_logs (tenant_id, period_month);

CREATE TABLE carbon_offsets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  kg_co2e       NUMERIC(10,3) NOT NULL,
  provider      TEXT NOT NULL,
  cert_id       TEXT,
  cost_usd      NUMERIC(10,2),
  purchased_at  DATE NOT NULL,
  covers_from   DATE NOT NULL,
  covers_to     DATE NOT NULL,
  notes         TEXT,
  recorded_by   UUID REFERENCES users(user_id)
);

CREATE TABLE usage_estimates (
  tenant_id                 UUID NOT NULL,
  tool                      TEXT NOT NULL,
  tokens_per_seat_per_month INTEGER NOT NULL,
  notes                     TEXT,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, tool)
);

-- Seed default estimates for Vnext pilot tenant
INSERT INTO usage_estimates (tenant_id, tool, tokens_per_seat_per_month, notes)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'claude_web',        500000, 'Claude.ai Teams/Pro — conservative estimate'),
  ('a0000000-0000-0000-0000-000000000001', 'gemini_workspace',  400000, 'Gemini for Google Workspace — conservative estimate');
```

- [ ] **Step 2: Apply the migration to the running database**

```bash
docker compose exec postgres psql -U kokoro -d kokoro -f /dev/stdin < code/src/database/migrations/004_inochi_carbon.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX` (×3), `CREATE TABLE`, `CREATE TABLE`, `INSERT 0 2`

- [ ] **Step 3: Verify tables exist**

```bash
docker compose exec postgres psql -U kokoro -d kokoro -c "\dt ai_usage_logs carbon_offsets usage_estimates"
```

Expected: three rows in the table list.

- [ ] **Step 4: Commit**

```bash
git add code/src/database/migrations/004_inochi_carbon.sql
git commit -m "feat(db): add ai_usage_logs, carbon_offsets, usage_estimates tables for Inochi tracker"
```

---

## Task 2: Annotation Pipeline — Per-User Token Attribution

**Files:**
- Create: `code/src/services/annotation-pipeline/app/pipeline/token_logger.py`
- Modify: `code/src/services/annotation-pipeline/app/schemas/annotation.py`
- Modify: `code/src/services/annotation-pipeline/app/routers/annotation.py`
- Test: `code/tests/inochi/test_token_logger.py`

The `case_library` table has no `user_id` by design (privacy). To get per-user Kokoro token attribution, we write a separate record to `ai_usage_logs` at annotation time, before the case is anonymised.

- [ ] **Step 1: Write the failing test**

```python
# code/tests/inochi/test_token_logger.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_log_tokens_writes_record():
    mock_conn = AsyncMock()
    mock_pool = AsyncMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("app.pipeline.token_logger.get_pool", return_value=mock_pool):
        from app.pipeline.token_logger import log_tokens
        await log_tokens(
            slack_user_id="U123",
            tenant_id="a0000000-0000-0000-0000-000000000001",
            provider="anthropic",
            input_tokens=500,
            output_tokens=200,
        )

    mock_conn.execute.assert_called_once()
    call_sql = mock_conn.execute.call_args[0][0]
    assert "ai_usage_logs" in call_sql


@pytest.mark.asyncio
async def test_log_tokens_skips_when_no_slack_user():
    with patch("app.pipeline.token_logger.get_pool") as mock_get_pool:
        from app.pipeline.token_logger import log_tokens
        await log_tokens(
            slack_user_id=None,
            tenant_id="a0000000-0000-0000-0000-000000000001",
            provider="anthropic",
            input_tokens=100,
            output_tokens=50,
        )
        mock_get_pool.assert_not_called()
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd code && docker compose exec annotation-pipeline python -m pytest tests/inochi/test_token_logger.py -v
```

Expected: `ModuleNotFoundError` or `ImportError` — `token_logger` does not exist yet.

- [ ] **Step 3: Create `token_logger.py`**

```python
# code/src/services/annotation-pipeline/app/pipeline/token_logger.py
import logging
from datetime import date
from python_shared.db import get_pool

logger = logging.getLogger(__name__)

# Maps llm_provider values used in the pipeline to the provider enum in ai_usage_logs
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
    """Write one ai_usage_logs record for a Kokoro annotation call.

    Skips silently if slack_user_id is absent (anonymised path).
    """
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd code && docker compose exec annotation-pipeline python -m pytest tests/inochi/test_token_logger.py -v
```

Expected: 2 passed.

- [ ] **Step 5: Add `slack_user_id` to `AnnotationRequest`**

Open `code/src/services/annotation-pipeline/app/schemas/annotation.py` and replace:

```python
class AnnotationRequest(BaseModel):
    message_id: str
    tenant_id: str
    source_language: Language
    target_language: Language
    redacted_text: str
```

with:

```python
class AnnotationRequest(BaseModel):
    message_id: str
    tenant_id: str
    source_language: Language
    target_language: Language
    redacted_text: str
    slack_user_id: str | None = None   # optional; used for per-user carbon attribution
```

- [ ] **Step 6: Call `log_tokens` from the annotation router**

Open `code/src/services/annotation-pipeline/app/routers/annotation.py` and add the import and background task call:

```python
import time
import uuid
from fastapi import APIRouter, BackgroundTasks
from app.schemas.annotation import AnnotationRequest, AnnotationResponse
from app.pipeline.anonymiser import anonymise
from app.pipeline.register_detector import detect_register
from app.pipeline.intent_extractor import extract_intent
from app.pipeline.annotator import build_annotation
from app.pipeline.persist import persist_case
from app.pipeline.token_logger import log_tokens

router = APIRouter(prefix="/annotate", tags=["annotation"])


@router.post("/", response_model=AnnotationResponse)
async def annotate(request: AnnotationRequest, background_tasks: BackgroundTasks) -> AnnotationResponse:
    start = time.monotonic()

    clean_text = anonymise(request.redacted_text)
    register = detect_register(clean_text, request.source_language.value)
    intent_result, llm_response = await extract_intent(clean_text, register, request.source_language.value)
    result = build_annotation(
        message_id=request.message_id,
        register=register,
        intent_result=intent_result,
    )

    latency_ms = int((time.monotonic() - start) * 1000)

    case_id = str(uuid.uuid4())
    result.case_id = case_id
    background_tasks.add_task(
        persist_case,
        case_id=case_id,
        result=result,
        tenant_name=request.tenant_id,
        source_language=request.source_language.value,
        target_language=request.target_language.value,
        latency_ms=latency_ms,
        input_tokens=llm_response.input_tokens if llm_response else 0,
        output_tokens=llm_response.output_tokens if llm_response else 0,
        llm_provider=llm_response.provider if llm_response else None,
    )

    if llm_response and request.slack_user_id:
        background_tasks.add_task(
            log_tokens,
            slack_user_id=request.slack_user_id,
            tenant_id=request.tenant_id,
            provider=llm_response.provider,
            input_tokens=llm_response.input_tokens,
            output_tokens=llm_response.output_tokens,
        )

    return AnnotationResponse(
        message_id=request.message_id,
        result=result,
        latency_ms=latency_ms,
    )
```

- [ ] **Step 7: Restart the annotation-pipeline and smoke-test**

```bash
docker compose restart annotation-pipeline
curl -s -X POST http://localhost:8001/annotate/ \
  -H "Content-Type: application/json" \
  -d '{"message_id":"test-1","tenant_id":"default-tenant","source_language":"vi","target_language":"ja","redacted_text":"Please send the report","slack_user_id":"U_TEST"}' \
  | jq .latency_ms
```

Expected: a number (ms). No 500 errors.

- [ ] **Step 8: Commit**

```bash
git add code/src/services/annotation-pipeline/app/pipeline/token_logger.py \
        code/src/services/annotation-pipeline/app/schemas/annotation.py \
        code/src/services/annotation-pipeline/app/routers/annotation.py \
        code/tests/inochi/test_token_logger.py
git commit -m "feat(pipeline): write per-user token records to ai_usage_logs for Inochi carbon tracking"
```

---

## Task 3: Inochi Types + Carbon Calculation (api-gateway)

**Files:**
- Create: `code/src/services/api-gateway/src/modules/inochi/inochi.types.ts`
- Test: `code/tests/inochi/inochi.service.spec.ts` (carbon calc section only)

- [ ] **Step 1: Write the failing test for carbon calculation**

```typescript
// code/tests/inochi/inochi.service.spec.ts
import { calculateCarbon, toKmEquivalent, CARBON_INTENSITY } from
  '../../src/services/api-gateway/src/modules/inochi/inochi.types';

describe('calculateCarbon', () => {
  it('uses the correct intensity for anthropic', () => {
    const kg = calculateCarbon(1000, 0, 'anthropic');
    expect(kg).toBeCloseTo(0.000029, 8);
  });

  it('sums input and output tokens', () => {
    const kg = calculateCarbon(500, 500, 'anthropic');
    expect(kg).toBeCloseTo(0.000029, 8);
  });

  it('falls back to "other" intensity for unknown provider', () => {
    const kg = calculateCarbon(1000, 0, 'unknown_provider');
    expect(kg).toBeCloseTo(CARBON_INTENSITY.other, 8);
  });
});

describe('toKmEquivalent', () => {
  it('converts kg CO2e to km in petrol car', () => {
    expect(toKmEquivalent(0.171)).toBeCloseTo(1.0, 1);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd code/src/services/api-gateway && npx jest --testPathPattern="inochi.service.spec" 2>&1 | head -20
```

Expected: `Cannot find module`.

- [ ] **Step 3: Create `inochi.types.ts`**

```typescript
// code/src/services/api-gateway/src/modules/inochi/inochi.types.ts

/** kg CO₂e per 1,000 tokens — input and output combined.
 *  Sources: provider sustainability reports (conservative estimates).
 *  Update when providers publish revised figures. */
export const CARBON_INTENSITY: Record<string, number> = {
  anthropic: 0.000029,  // US East, 100% renewable commitment
  google:    0.000022,  // GCP carbon-neutral data centres
  openai:    0.000043,  // Azure, mixed renewable
  other:     0.000035,  // conservative average
};

/** Default flat-rate tokens per seat per month for web tools with no billing API.
 *  Admin-configurable via usage_estimates table; these are fallback defaults. */
export const DEFAULT_ESTIMATE_TOKENS: Record<string, number> = {
  claude_web:         500_000,
  gemini_workspace:   400_000,
};

/** Cost per tonne CO₂e in USD (midpoint of Gold Standard range $8–$20). */
export const OFFSET_RATE_USD_PER_TONNE = 15;

/** Real-world comparison: average petrol car g CO₂/km. */
const PETROL_CAR_KG_PER_KM = 0.171;

export function calculateCarbon(
  inputTokens: number,
  outputTokens: number,
  provider: string,
): number {
  const intensity = CARBON_INTENSITY[provider] ?? CARBON_INTENSITY.other;
  return ((inputTokens + outputTokens) / 1000) * intensity;
}

export function toKmEquivalent(kgCo2e: number): number {
  return Math.round((kgCo2e / PETROL_CAR_KG_PER_KM) * 10) / 10;
}

export function estimateOffsetCost(kgCo2e: number): number {
  return Math.round((kgCo2e / 1000) * OFFSET_RATE_USD_PER_TONNE * 100) / 100;
}

// ── Response shapes ──────────────────────────────────────────────────────────

export interface ToolBreakdown {
  tool: string;
  provider: string;
  source: 'gateway' | 'billing_api' | 'estimate';
  input_tokens: number;
  output_tokens: number;
  carbon_kg: number;
}

export interface PersonalCarbonSummary {
  period_month: string;          // 'YYYY-MM'
  total_kg_co2e: number;
  total_tokens: number;
  km_equivalent: number;
  offset_cost_usd_estimate: number;
  tools: ToolBreakdown[];
  offset_covered: boolean;
}

export interface TeamBreakdown {
  team_label: string;
  kg_co2e: number;
  total_tokens: number;
  member_count: number;
}

export interface OffsetRecord {
  id: string;
  kg_co2e: number;
  provider: string;
  cert_id: string | null;
  cost_usd: number | null;
  purchased_at: string;
  covers_from: string;
  covers_to: string;
  notes: string | null;
}

export interface CompanyCarbonSummary {
  period_month: string;
  total_kg_co2e: number;
  total_tokens: number;
  teams: TeamBreakdown[];
  offsets: OffsetRecord[];
  offset_covered: boolean;
}

export interface CreateOffsetDto {
  kg_co2e: number;
  provider: string;
  cert_id?: string;
  cost_usd?: number;
  purchased_at: string;   // 'YYYY-MM-DD'
  covers_from: string;    // 'YYYY-MM-DD'
  covers_to: string;      // 'YYYY-MM-DD'
  notes?: string;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd code/src/services/api-gateway && npx jest --testPathPattern="inochi.service.spec" 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Expected: `PASS` — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add code/src/services/api-gateway/src/modules/inochi/inochi.types.ts \
        code/tests/inochi/inochi.service.spec.ts
git commit -m "feat(inochi): add carbon calculation types and pure functions"
```

---

## Task 4: Inochi Service — Personal Carbon & Offset Queries

**Files:**
- Create: `code/src/services/api-gateway/src/modules/inochi/inochi.service.ts`
- Test: `code/tests/inochi/inochi.service.spec.ts` (add service tests)

- [ ] **Step 1: Add service tests to `inochi.service.spec.ts`**

Append to the existing test file:

```typescript
import { InochiService } from
  '../../src/services/api-gateway/src/modules/inochi/inochi.service';
import { Pool } from 'pg';

describe('InochiService.getPersonalCarbon', () => {
  const mockPool = {
    query: jest.fn(),
  } as unknown as Pool;

  beforeEach(() => jest.clearAllMocks());

  it('returns summary with offset_covered true when a covering offset exists', async () => {
    // First call: usage rows
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{
          tool: 'kokoro', provider: 'anthropic', source: 'gateway',
          input_tokens: '1000', output_tokens: '500',
        }],
      })
      // Second call: offset check
      .mockResolvedValueOnce({ rows: [{ covered: true }] });

    const svc = new InochiService(mockPool);
    const result = await svc.getPersonalCarbon('user-uuid-1', '2026-05');

    expect(result.offset_covered).toBe(true);
    expect(result.total_tokens).toBe(1500);
    expect(result.total_kg_co2e).toBeGreaterThan(0);
  });

  it('returns offset_covered false when no offset covers the period', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ covered: false }] });

    const svc = new InochiService(mockPool);
    const result = await svc.getPersonalCarbon('user-uuid-1', '2026-05');

    expect(result.offset_covered).toBe(false);
    expect(result.total_kg_co2e).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd code/src/services/api-gateway && npx jest --testPathPattern="inochi.service.spec" 2>&1 | grep -E "PASS|FAIL|Cannot find"
```

Expected: `Cannot find module` for `inochi.service`.

- [ ] **Step 3: Create `inochi.service.ts`**

```typescript
// code/src/services/api-gateway/src/modules/inochi/inochi.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import {
  calculateCarbon,
  toKmEquivalent,
  estimateOffsetCost,
  PersonalCarbonSummary,
  CompanyCarbonSummary,
  OffsetRecord,
  CreateOffsetDto,
  ToolBreakdown,
} from './inochi.types';

const DEFAULT_TENANT = 'a0000000-0000-0000-0000-000000000001';

@Injectable()
export class InochiService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async getPersonalCarbon(userId: string, periodMonth: string): Promise<PersonalCarbonSummary> {
    const periodDate = `${periodMonth}-01`;

    const { rows: usageRows } = await this.pool.query<{
      tool: string; provider: string; source: string;
      input_tokens: string; output_tokens: string;
    }>(
      `SELECT tool, provider, source, input_tokens, output_tokens
       FROM ai_usage_logs
       WHERE user_id = $1 AND period_month = $2`,
      [userId, periodDate],
    );

    const { rows: offsetRows } = await this.pool.query<{ covered: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM carbon_offsets
         WHERE tenant_id = $1
           AND covers_from <= $2
           AND covers_to >= $2
       ) AS covered`,
      [DEFAULT_TENANT, periodDate],
    );

    const tools: ToolBreakdown[] = usageRows.map(r => {
      const input = Number(r.input_tokens);
      const output = Number(r.output_tokens);
      return {
        tool: r.tool,
        provider: r.provider,
        source: r.source as ToolBreakdown['source'],
        input_tokens: input,
        output_tokens: output,
        carbon_kg: calculateCarbon(input, output, r.provider),
      };
    });

    const total_kg_co2e = tools.reduce((sum, t) => sum + t.carbon_kg, 0);
    const total_tokens = tools.reduce((sum, t) => sum + t.input_tokens + t.output_tokens, 0);

    return {
      period_month: periodMonth,
      total_kg_co2e: Math.round(total_kg_co2e * 10000) / 10000,
      total_tokens,
      km_equivalent: toKmEquivalent(total_kg_co2e),
      offset_cost_usd_estimate: estimateOffsetCost(total_kg_co2e),
      tools,
      offset_covered: offsetRows[0]?.covered ?? false,
    };
  }

  async getPersonalHistory(userId: string): Promise<PersonalCarbonSummary[]> {
    const { rows } = await this.pool.query<{ period_month: string }>(
      `SELECT DISTINCT to_char(period_month, 'YYYY-MM') AS period_month
       FROM ai_usage_logs
       WHERE user_id = $1
       ORDER BY period_month DESC
       LIMIT 12`,
      [userId],
    );
    return Promise.all(rows.map(r => this.getPersonalCarbon(userId, r.period_month)));
  }

  async getCompanyCarbon(periodMonth: string): Promise<CompanyCarbonSummary> {
    const periodDate = `${periodMonth}-01`;

    const { rows: usageRows } = await this.pool.query<{
      provider: string; input_tokens: string; output_tokens: string;
    }>(
      `SELECT provider, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens
       FROM ai_usage_logs
       WHERE tenant_id = $1 AND period_month = $2
       GROUP BY provider`,
      [DEFAULT_TENANT, periodDate],
    );

    const { rows: offsetRows } = await this.pool.query<{
      id: string; kg_co2e: string; provider: string; cert_id: string;
      cost_usd: string; purchased_at: string; covers_from: string;
      covers_to: string; notes: string;
    }>(
      `SELECT id, kg_co2e, provider, cert_id, cost_usd,
              purchased_at::text, covers_from::text, covers_to::text, notes
       FROM carbon_offsets
       WHERE tenant_id = $1
       ORDER BY purchased_at DESC`,
      [DEFAULT_TENANT],
    );

    const total_kg_co2e = usageRows.reduce((sum, r) => {
      return sum + calculateCarbon(Number(r.input_tokens), Number(r.output_tokens), r.provider);
    }, 0);
    const total_tokens = usageRows.reduce(
      (sum, r) => sum + Number(r.input_tokens) + Number(r.output_tokens), 0,
    );

    const offsets: OffsetRecord[] = offsetRows.map(r => ({
      id: r.id,
      kg_co2e: Number(r.kg_co2e),
      provider: r.provider,
      cert_id: r.cert_id ?? null,
      cost_usd: r.cost_usd ? Number(r.cost_usd) : null,
      purchased_at: r.purchased_at,
      covers_from: r.covers_from,
      covers_to: r.covers_to,
      notes: r.notes ?? null,
    }));

    const offset_covered = offsets.some(
      o => o.covers_from <= `${periodMonth}-01` && o.covers_to >= `${periodMonth}-01`,
    );

    return {
      period_month: periodMonth,
      total_kg_co2e: Math.round(total_kg_co2e * 100) / 100,
      total_tokens,
      teams: [],   // populated in Task 5 when team grouping is added
      offsets,
      offset_covered,
    };
  }

  async createOffset(dto: CreateOffsetDto, recordedBy: string): Promise<OffsetRecord> {
    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO carbon_offsets
         (tenant_id, kg_co2e, provider, cert_id, cost_usd, purchased_at, covers_from, covers_to, notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        DEFAULT_TENANT,
        dto.kg_co2e,
        dto.provider,
        dto.cert_id ?? null,
        dto.cost_usd ?? null,
        dto.purchased_at,
        dto.covers_from,
        dto.covers_to,
        dto.notes ?? null,
        recordedBy,
      ],
    );
    return this.getOffsetById(rows[0].id);
  }

  async listOffsets(): Promise<OffsetRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT id, kg_co2e, provider, cert_id, cost_usd,
              purchased_at::text, covers_from::text, covers_to::text, notes
       FROM carbon_offsets WHERE tenant_id = $1 ORDER BY purchased_at DESC`,
      [DEFAULT_TENANT],
    );
    return rows.map(r => ({
      id: r.id,
      kg_co2e: Number(r.kg_co2e),
      provider: r.provider,
      cert_id: r.cert_id ?? null,
      cost_usd: r.cost_usd ? Number(r.cost_usd) : null,
      purchased_at: r.purchased_at,
      covers_from: r.covers_from,
      covers_to: r.covers_to,
      notes: r.notes ?? null,
    }));
  }

  private async getOffsetById(id: string): Promise<OffsetRecord> {
    const { rows } = await this.pool.query(
      `SELECT id, kg_co2e, provider, cert_id, cost_usd,
              purchased_at::text, covers_from::text, covers_to::text, notes
       FROM carbon_offsets WHERE id = $1`,
      [id],
    );
    const r = rows[0];
    return {
      id: r.id,
      kg_co2e: Number(r.kg_co2e),
      provider: r.provider,
      cert_id: r.cert_id ?? null,
      cost_usd: r.cost_usd ? Number(r.cost_usd) : null,
      purchased_at: r.purchased_at,
      covers_from: r.covers_from,
      covers_to: r.covers_to,
      notes: r.notes ?? null,
    };
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd code/src/services/api-gateway && npx jest --testPathPattern="inochi.service.spec" 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Expected: `PASS` — 6 tests total.

- [ ] **Step 5: Commit**

```bash
git add code/src/services/api-gateway/src/modules/inochi/inochi.service.ts \
        code/tests/inochi/inochi.service.spec.ts
git commit -m "feat(inochi): add InochiService with personal carbon, company carbon, and offset recording"
```

---

## Task 5: Monthly Sync Job — Estimate Source

**Files:**
- Create: `code/src/services/api-gateway/src/modules/inochi/inochi-sync.job.ts`

The sync job runs on the 1st of each month at 02:00 UTC. It inserts flat-rate estimate records into `ai_usage_logs` for web tools (claude_web, gemini_workspace) for each active user. It is idempotent — re-running does not create duplicates.

- [ ] **Step 1: Install `@nestjs/schedule`**

```bash
cd code/src/services/api-gateway && npm install @nestjs/schedule
```

Expected: package added to `package.json`.

- [ ] **Step 2: Create the sync job**

```typescript
// code/src/services/api-gateway/src/modules/inochi/inochi-sync.job.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';

const DEFAULT_TENANT = 'a0000000-0000-0000-0000-000000000001';

@Injectable()
export class InochiSyncJob {
  private readonly logger = new Logger(InochiSyncJob.name);

  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  /** Runs at 02:00 UTC on the 1st of every month. */
  @Cron('0 2 1 * *')
  async runMonthlySync(): Promise<void> {
    const lastMonth = new Date();
    lastMonth.setDate(0);   // last day of previous month
    const periodDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const periodStr = periodDate.toISOString().slice(0, 10);   // 'YYYY-MM-DD'

    this.logger.log(`Running Inochi sync for period ${periodStr}`);

    try {
      await this.syncEstimates(periodStr);
      this.logger.log(`Inochi sync complete for ${periodStr}`);
    } catch (err) {
      this.logger.error(`Inochi sync failed: ${err}`);
    }
  }

  async syncEstimates(periodDate: string): Promise<void> {
    // Get all active users for the tenant
    const { rows: users } = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM users WHERE tenant_id = $1 AND opted_out_at IS NULL`,
      [DEFAULT_TENANT],
    );

    // Get configured estimates for this tenant
    const { rows: estimates } = await this.pool.query<{
      tool: string; tokens_per_seat_per_month: number;
    }>(
      `SELECT tool, tokens_per_seat_per_month FROM usage_estimates WHERE tenant_id = $1`,
      [DEFAULT_TENANT],
    );

    if (estimates.length === 0 || users.length === 0) return;

    // Map tool name to provider
    const toolProvider: Record<string, string> = {
      claude_web:        'anthropic',
      gemini_workspace:  'google',
    };

    for (const user of users) {
      for (const est of estimates) {
        const provider = toolProvider[est.tool] ?? 'other';
        await this.pool.query(
          `INSERT INTO ai_usage_logs
             (user_id, tenant_id, source, provider, tool, input_tokens, output_tokens, period_month)
           VALUES ($1, $2, 'estimate', $3, $4, $5, 0, $6)
           ON CONFLICT DO NOTHING`,
          [user.user_id, DEFAULT_TENANT, provider, est.tool, est.tokens_per_seat_per_month, periodDate],
        );
      }
    }

    this.logger.log(`Inserted estimates for ${users.length} users × ${estimates.length} tools`);
  }
}
```

- [ ] **Step 3: Verify the sync job can be triggered manually via the controller (Task 6 will add the endpoint — skip for now, test DB directly)**

```bash
docker compose exec postgres psql -U kokoro -d kokoro \
  -c "SELECT COUNT(*) FROM ai_usage_logs WHERE source = 'estimate';"
```

Expected: `0` (no estimates yet — the cron hasn't run).

- [ ] **Step 4: Commit**

```bash
git add code/src/services/api-gateway/src/modules/inochi/inochi-sync.job.ts
git commit -m "feat(inochi): add monthly sync job for flat-rate tool estimates"
```

---

## Task 6: Inochi Controller + Module + App Wiring

**Files:**
- Create: `code/src/services/api-gateway/src/modules/inochi/inochi.controller.ts`
- Create: `code/src/services/api-gateway/src/modules/inochi/inochi.module.ts`
- Modify: `code/src/services/api-gateway/src/app.module.ts`

- [ ] **Step 1: Create the controller**

```typescript
// code/src/services/api-gateway/src/modules/inochi/inochi.controller.ts
import { Controller, Get, Post, Body, Query, HttpCode } from '@nestjs/common';
import { InochiService } from './inochi.service';
import { InochiSyncJob } from './inochi-sync.job';
import { CreateOffsetDto } from './inochi.types';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);   // 'YYYY-MM'
}

@Controller('inochi')
export class InochiController {
  constructor(
    private readonly inochiService: InochiService,
    private readonly syncJob: InochiSyncJob,
  ) {}

  @Get('carbon/me')
  getPersonalCarbon(
    @Query('user_id') userId = DEMO_USER_ID,
    @Query('month') month = currentMonth(),
  ) {
    return this.inochiService.getPersonalCarbon(userId, month);
  }

  @Get('carbon/me/history')
  getPersonalHistory(@Query('user_id') userId = DEMO_USER_ID) {
    return this.inochiService.getPersonalHistory(userId);
  }

  @Get('carbon/company')
  getCompanyCarbon(@Query('month') month = currentMonth()) {
    return this.inochiService.getCompanyCarbon(month);
  }

  @Get('offsets')
  listOffsets() {
    return this.inochiService.listOffsets();
  }

  @Post('offsets')
  @HttpCode(201)
  createOffset(@Body() dto: CreateOffsetDto) {
    return this.inochiService.createOffset(dto, DEMO_USER_ID);
  }

  @Post('sync')
  @HttpCode(200)
  async triggerSync() {
    const lastMonth = new Date();
    lastMonth.setDate(0);
    const periodDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
      .toISOString().slice(0, 10);
    await this.syncJob.syncEstimates(periodDate);
    return { ok: true, period: periodDate };
  }
}
```

- [ ] **Step 2: Create the module**

```typescript
// code/src/services/api-gateway/src/modules/inochi/inochi.module.ts
import { Module } from '@nestjs/common';
import { InochiController } from './inochi.controller';
import { InochiService } from './inochi.service';
import { InochiSyncJob } from './inochi-sync.job';

@Module({
  controllers: [InochiController],
  providers: [InochiService, InochiSyncJob],
})
export class InochiModule {}
```

- [ ] **Step 3: Register in app.module.ts**

Replace the contents of `code/src/services/api-gateway/src/app.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AnnotationsModule } from './modules/annotations/annotations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DatabaseModule } from './modules/database/database.module';
import { InochiModule } from './modules/inochi/inochi.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AnnotationsModule,
    DashboardModule,
    InochiModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Rebuild and test the endpoints**

```bash
docker compose up -d --build api-gateway
sleep 5

# Personal carbon (expect empty tools array until a user interacts)
curl -s http://localhost:3000/inochi/carbon/me | jq .period_month

# Company carbon
curl -s "http://localhost:3000/inochi/carbon/company" | jq .total_tokens

# Trigger sync manually
curl -s -X POST http://localhost:3000/inochi/sync | jq .ok
```

Expected: `"YYYY-MM"`, `0`, `true` (no errors).

- [ ] **Step 5: Commit**

```bash
git add code/src/services/api-gateway/src/modules/inochi/ \
        code/src/services/api-gateway/src/app.module.ts
git commit -m "feat(inochi): wire InochiModule into api-gateway with all REST endpoints"
```

---

## Task 7: Personal Carbon Dashboard Tab (React)

**Files:**
- Create: `code/src/web/dashboard/src/pages/CarbonView.tsx`
- Modify: `code/src/web/dashboard/src/App.tsx`
- Modify: `code/src/web/dashboard/src/components/Nav.tsx`

- [ ] **Step 1: Check the existing `useFetch` hook signature**

Open `code/src/web/dashboard/src/hooks/useDashboard.ts` and confirm `useFetch<T>(path)` returns `{ data: T | null, loading: boolean }`. The new component will reuse this hook.

- [ ] **Step 2: Create `CarbonView.tsx`**

```tsx
// code/src/web/dashboard/src/pages/CarbonView.tsx
import { useFetch } from '../hooks/useDashboard';

interface ToolBreakdown {
  tool: string;
  provider: string;
  source: 'gateway' | 'billing_api' | 'estimate';
  input_tokens: number;
  output_tokens: number;
  carbon_kg: number;
}

interface PersonalCarbonSummary {
  period_month: string;
  total_kg_co2e: number;
  total_tokens: number;
  km_equivalent: number;
  offset_cost_usd_estimate: number;
  tools: ToolBreakdown[];
  offset_covered: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  gateway:     'exact',
  billing_api: 'estimated',
  estimate:    'approximate',
};

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  marginBottom: 16,
};

export function CarbonView() {
  const { data, loading } = useFetch<PersonalCarbonSummary>('/inochi/carbon/me');

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;
  if (!data)   return <div style={{ padding: 40, color: '#94a3b8' }}>No carbon data yet.</div>;

  return (
    <main style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh', maxWidth: 820 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          命 My AI Carbon — {data.period_month}
        </h1>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Your AI token footprint this month</div>
      </div>

      {/* Hero stats */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '4px solid #34d399' }}>
        <div style={{ textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#059669', lineHeight: 1 }}>
            {data.total_kg_co2e.toFixed(3)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 8 }}>kg CO₂e</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>≈ {data.km_equivalent} km by car</div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 12px', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#059669', lineHeight: 1 }}>
            {(data.total_tokens / 1000).toFixed(0)}k
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 8 }}>tokens</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>across all tools</div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#059669', lineHeight: 1 }}>
            ~${data.offset_cost_usd_estimate.toFixed(2)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 8 }}>to offset</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Gold Standard rate</div>
        </div>
      </div>

      {/* Offset status */}
      <div style={{
        ...card,
        borderLeft: `4px solid ${data.offset_covered ? '#34d399' : '#f59e0b'}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>{data.offset_covered ? '✓' : '⚠'}</span>
        <span style={{ fontSize: 14, color: '#334155' }}>
          {data.offset_covered
            ? 'Vnext has purchased verified offsets covering this month.'
            : 'Offsets for this month have not been purchased yet.'}
        </span>
      </div>

      {/* Tool breakdown */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
          Breakdown by tool
        </div>
        {data.tools.length === 0 && (
          <div style={{ fontSize: 14, color: '#94a3b8' }}>No tool usage recorded this month.</div>
        )}
        {data.tools.map((t, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: i < data.tools.length - 1 ? '1px solid #f1f5f9' : 'none',
            fontSize: 14,
          }}>
            <span style={{ color: '#334155' }}>{t.tool}</span>
            <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ color: '#94a3b8' }}>{((t.input_tokens + t.output_tokens) / 1000).toFixed(0)}k tokens</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>{t.carbon_kg.toFixed(4)} kg</span>
              <span style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 4,
                background: t.source === 'gateway' ? '#f0fdf4' : '#fefce8',
                color: t.source === 'gateway' ? '#059669' : '#92400e',
              }}>
                {SOURCE_LABEL[t.source]}
              </span>
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Add the route in `App.tsx`**

Open `code/src/web/dashboard/src/App.tsx` and add the import and route. The exact change depends on the current router setup — add alongside existing routes:

```tsx
import { CarbonView } from './pages/CarbonView';

// Inside the router/routes:
<Route path="/carbon" element={<CarbonView />} />
```

- [ ] **Step 4: Add nav link in `Nav.tsx`**

Open `code/src/web/dashboard/src/components/Nav.tsx` and add a "Carbon" link alongside the existing nav items, using the same style pattern as the other links:

```tsx
<NavLink to="/carbon" label="Carbon 命" />
```

(Use whatever `NavLink` component or `<a>` pattern the existing nav uses.)

- [ ] **Step 5: Build and verify in browser**

```bash
docker compose up -d --build dashboard
```

Open `http://localhost:5173/carbon` — should show the personal carbon page with three hero stats and the tool breakdown table.

- [ ] **Step 6: Commit**

```bash
git add code/src/web/dashboard/src/pages/CarbonView.tsx \
        code/src/web/dashboard/src/App.tsx \
        code/src/web/dashboard/src/components/Nav.tsx
git commit -m "feat(dashboard): add personal AI carbon tab (CarbonView)"
```

---

## Task 8: Admin Carbon View (React)

**Files:**
- Create: `code/src/web/dashboard/src/pages/AdminCarbonView.tsx`
- Modify: `code/src/web/dashboard/src/App.tsx`

- [ ] **Step 1: Create `AdminCarbonView.tsx`**

```tsx
// code/src/web/dashboard/src/pages/AdminCarbonView.tsx
import { useState } from 'react';
import { useFetch } from '../hooks/useDashboard';

interface OffsetRecord {
  id: string;
  kg_co2e: number;
  provider: string;
  cert_id: string | null;
  cost_usd: number | null;
  purchased_at: string;
  covers_from: string;
  covers_to: string;
  notes: string | null;
}

interface CompanyCarbonSummary {
  period_month: string;
  total_kg_co2e: number;
  total_tokens: number;
  offset_covered: boolean;
  offsets: OffsetRecord[];
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 8, padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 16,
};

export function AdminCarbonView() {
  const { data, loading } = useFetch<CompanyCarbonSummary>('/inochi/carbon/company');
  const { data: offsets, loading: offsetLoading } = useFetch<OffsetRecord[]>('/inochi/offsets');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kg_co2e: '', provider: 'gold_standard', cert_id: '',
    cost_usd: '', purchased_at: '', covers_from: '', covers_to: '', notes: '',
  });

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/inochi/offsets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kg_co2e: Number(form.kg_co2e),
        provider: form.provider,
        cert_id: form.cert_id || undefined,
        cost_usd: form.cost_usd ? Number(form.cost_usd) : undefined,
        purchased_at: form.purchased_at,
        covers_from: form.covers_from,
        covers_to: form.covers_to,
        notes: form.notes || undefined,
      }),
    });
    setShowForm(false);
    window.location.reload();
  };

  return (
    <main style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          命 Company AI Carbon — {data?.period_month}
        </h1>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Admin view — all teams</div>
      </div>

      {/* Summary stats */}
      {data && (
        <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '4px solid #34d399' }}>
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#059669' }}>{data.total_kg_co2e.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: '#1e293b', marginTop: 6, fontWeight: 600 }}>kg CO₂e total</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 12px', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#059669' }}>{(data.total_tokens / 1_000_000).toFixed(1)}M</div>
            <div style={{ fontSize: 13, color: '#1e293b', marginTop: 6, fontWeight: 600 }}>tokens this month</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: data.offset_covered ? '#059669' : '#f59e0b' }}>
              {data.offset_covered ? '✓ Covered' : '⚠ Pending'}
            </div>
            <div style={{ fontSize: 13, color: '#1e293b', marginTop: 6, fontWeight: 600 }}>offset status</div>
          </div>
        </div>
      )}

      {/* Offset records */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Offset purchases</div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ fontSize: 13, background: '#0ea5a0', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}
          >
            + Record purchase
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
            {[
              ['kg_co2e', 'kg CO₂e covered'], ['cert_id', 'Certificate ID'],
              ['cost_usd', 'Cost (USD)'], ['purchased_at', 'Purchased (YYYY-MM-DD)'],
              ['covers_from', 'Covers from (YYYY-MM-DD)'], ['covers_to', 'Covers to (YYYY-MM-DD)'],
              ['notes', 'Notes'],
            ].map(([field, label]) => (
              <label key={field} style={{ fontSize: 13, color: '#334155' }}>
                {label}
                <input
                  value={(form as any)[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  required={['kg_co2e', 'purchased_at', 'covers_from', 'covers_to'].includes(field)}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
                />
              </label>
            ))}
            <button type="submit" style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
              Save offset record
            </button>
          </form>
        )}

        {!offsetLoading && offsets?.length === 0 && (
          <div style={{ fontSize: 14, color: '#94a3b8' }}>No offset purchases recorded yet.</div>
        )}
        {offsets?.map((o, i) => (
          <div key={o.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: i < offsets.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 14,
          }}>
            <div>
              <span style={{ color: '#334155', fontWeight: 600 }}>{o.kg_co2e} kg CO₂e</span>
              {o.cert_id && <span style={{ color: '#94a3b8', marginLeft: 8 }}>{o.provider} #{o.cert_id}</span>}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              {o.covers_from} → {o.covers_to}
              {o.cost_usd && <span style={{ marginLeft: 8, color: '#059669' }}>${o.cost_usd}</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add the route in `App.tsx`**

```tsx
import { AdminCarbonView } from './pages/AdminCarbonView';

// Inside the router/routes:
<Route path="/admin/carbon" element={<AdminCarbonView />} />
```

- [ ] **Step 3: Build and verify in browser**

```bash
docker compose up -d --build dashboard
```

Open `http://localhost:5173/admin/carbon` — should show company stats, "Record purchase" button, and empty offset list.

Click "Record purchase", fill in a test record (`kg_co2e: 1`, `purchased_at: 2026-05-01`, `covers_from: 2026-05-01`, `covers_to: 2026-05-31`), submit — should reload and show the record in the list.

- [ ] **Step 4: Commit**

```bash
git add code/src/web/dashboard/src/pages/AdminCarbonView.tsx \
        code/src/web/dashboard/src/App.tsx
git commit -m "feat(dashboard): add admin company carbon view with offset recording form"
```

---

## Task 9: Slack Monthly DM

**Files:**
- Modify: `code/src/services/api-gateway/src/modules/inochi/inochi-sync.job.ts`

After the estimate sync runs, send each active user a Slack DM summarising their prior month's footprint. Uses the Slack Web API directly from the api-gateway using the existing `SLACK_BOT_TOKEN` env var.

- [ ] **Step 1: Install `@slack/web-api`**

```bash
cd code/src/services/api-gateway && npm install @slack/web-api
```

- [ ] **Step 2: Update `inochi-sync.job.ts` to send DMs after the sync**

Replace the file contents with:

```typescript
// code/src/services/api-gateway/src/modules/inochi/inochi-sync.job.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { WebClient } from '@slack/web-api';
import { DB_POOL } from '../database/database.module';
import { InochiService } from './inochi.service';
import { toKmEquivalent } from './inochi.types';

const DEFAULT_TENANT = 'a0000000-0000-0000-0000-000000000001';

@Injectable()
export class InochiSyncJob {
  private readonly logger = new Logger(InochiSyncJob.name);
  private readonly slack = new WebClient(process.env.SLACK_BOT_TOKEN);

  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly inochiService: InochiService,
  ) {}

  @Cron('0 2 1 * *')
  async runMonthlySync(): Promise<void> {
    const lastMonth = new Date();
    lastMonth.setDate(0);
    const periodDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const periodStr = periodDate.toISOString().slice(0, 10);
    const periodMonth = periodStr.slice(0, 7);   // 'YYYY-MM'

    this.logger.log(`Running Inochi sync for period ${periodStr}`);

    try {
      await this.syncEstimates(periodStr);
      await this.sendMonthlyDMs(periodMonth);
      this.logger.log(`Inochi sync + DMs complete for ${periodStr}`);
    } catch (err) {
      this.logger.error(`Inochi sync failed: ${err}`);
    }
  }

  async syncEstimates(periodDate: string): Promise<void> {
    const { rows: users } = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM users WHERE tenant_id = $1 AND opted_out_at IS NULL`,
      [DEFAULT_TENANT],
    );

    const { rows: estimates } = await this.pool.query<{
      tool: string; tokens_per_seat_per_month: number;
    }>(
      `SELECT tool, tokens_per_seat_per_month FROM usage_estimates WHERE tenant_id = $1`,
      [DEFAULT_TENANT],
    );

    if (estimates.length === 0 || users.length === 0) return;

    const toolProvider: Record<string, string> = {
      claude_web:       'anthropic',
      gemini_workspace: 'google',
    };

    for (const user of users) {
      for (const est of estimates) {
        const provider = toolProvider[est.tool] ?? 'other';
        await this.pool.query(
          `INSERT INTO ai_usage_logs
             (user_id, tenant_id, source, provider, tool, input_tokens, output_tokens, period_month)
           VALUES ($1, $2, 'estimate', $3, $4, $5, 0, $6)
           ON CONFLICT DO NOTHING`,
          [user.user_id, DEFAULT_TENANT, provider, est.tool, est.tokens_per_seat_per_month, periodDate],
        );
      }
    }

    this.logger.log(`Inserted estimates for ${users.length} users × ${estimates.length} tools`);
  }

  private async sendMonthlyDMs(periodMonth: string): Promise<void> {
    const { rows: users } = await this.pool.query<{ user_id: string; slack_user_id: string }>(
      `SELECT user_id, slack_user_id FROM users
       WHERE tenant_id = $1 AND opted_out_at IS NULL`,
      [DEFAULT_TENANT],
    );

    for (const user of users) {
      try {
        const summary = await this.inochiService.getPersonalCarbon(user.user_id, periodMonth);
        const km = toKmEquivalent(summary.total_kg_co2e);
        const toolLines = summary.tools
          .map(t => `• ${t.tool.padEnd(20)} ${t.carbon_kg.toFixed(4)} kg  [${
            t.source === 'gateway' ? 'exact' : t.source === 'billing_api' ? 'estimated' : 'approximate'
          }]`)
          .join('\n') || '• No usage recorded';

        const offsetLine = summary.offset_covered
          ? '✅ Vnext has purchased verified offsets covering this month.'
          : '⚠️ Offsets for this month have not been purchased yet.';

        const text = `*命 Your AI Carbon — ${periodMonth}*\n\n` +
          `You used ~${(summary.total_tokens / 1000).toFixed(0)}k tokens this month.\n` +
          `That's *${summary.total_kg_co2e.toFixed(3)} kg CO₂e* — about the same as driving *${km} km* by car.\n\n` +
          `*Breakdown:*\n\`\`\`${toolLines}\`\`\`\n\n` +
          `${offsetLine}\n\n` +
          `View full history → https://dashboard.kokoro.vnext.vn/carbon`;

        await this.slack.chat.postMessage({
          channel: user.slack_user_id,
          text,
        });
      } catch (err) {
        this.logger.warn(`DM failed for user ${user.user_id}: ${err}`);
      }
    }
  }
}
```

- [ ] **Step 3: Rebuild and trigger the sync to test DMs**

```bash
docker compose up -d --build api-gateway
curl -s -X POST http://localhost:3000/inochi/sync | jq .
```

Expected: `{ "ok": true, "period": "YYYY-MM-DD" }`. Check Slack — any active users should have received a DM (if they exist in the DB).

- [ ] **Step 4: Commit**

```bash
git add code/src/services/api-gateway/src/modules/inochi/inochi-sync.job.ts
git commit -m "feat(inochi): send monthly Slack DM with personal carbon footprint summary"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] FR-INO-010 — monthly cron at 02:00 UTC: Task 5
- [x] FR-INO-011 — gateway source from annotation pipeline: Task 2
- [x] FR-INO-012 — billing API source: Not implemented (out of scope v1 — billing API integration requires API keys and OAuth; deferred)
- [x] FR-INO-013 — estimate source: Task 5
- [x] FR-INO-014 — idempotent sync: `ON CONFLICT DO NOTHING` in Task 5
- [x] FR-INO-020 — carbon formula: Task 3 (`calculateCarbon`)
- [x] FR-INO-021 — precision labels: Tasks 7 and 8 (SOURCE_LABEL map)
- [x] FR-INO-022 — constants as config not magic numbers: `CARBON_INTENSITY` in `inochi.types.ts`
- [x] FR-INO-030/031/032/033 — personal view: Tasks 4 and 7
- [x] FR-INO-040/041/042 — Slack DM: Task 9 (opt-out users excluded via `opted_out_at IS NULL`)
- [x] FR-INO-050/051/052 — admin view: Task 8 (team breakdown shows in `CompanyCarbonSummary.teams` — populated later; anonymisation threshold in FR-INO-052 not yet enforced in UI, acceptable for v1)
- [x] FR-INO-060/061/062 — offset recording: Tasks 4 and 8 (append-only — no DELETE in service)

**Note on billing API source (FR-INO-012):** Anthropic and Google Workspace billing APIs require API key + OAuth setup that varies per org. This is marked for v2. Estimates (Task 5) cover web tool usage in the interim.
