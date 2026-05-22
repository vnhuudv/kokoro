# Inochi — AI Token Carbon Tracker

**Pillar:** II — 命 Inochi: Stewardship of Nature
**Linked specs:** [pillar-inochi.md](pillar-inochi.md), [framework-five-pillars.md](framework-five-pillars.md)
**Phase:** M5–6 (internal Vnext rollout); M7–8 (productization readiness)
**Status:** Draft — approved for implementation

---

## Purpose

In the era of widespread AI adoption, every token consumed by an employee is an act with an environmental cost. This module makes that cost visible — to each individual, to their team, and to the company — and closes the loop by recording the offsets that cover it.

The system is built for Vnext first (dogfood), with a clean architecture designed to be extracted as a standalone SaaS product.

---

## Actors

| Actor | Role |
|---|---|
| Employee | Views personal monthly AI carbon footprint in dashboard and Slack |
| Team lead | Views team-level rollup on admin dashboard |
| Admin | Records offset purchases; configures flat-rate estimates per tool |
| Vnext leadership | Views company-level footprint; approves offset budget |

---

## Architecture

The Inochi tracker is a module inside the existing `api-gateway` (NestJS). It aggregates token usage from three sources with explicitly different precision levels:

```
┌─────────────────────────────────────────────────────────┐
│                    Data Sources                         │
│                                                         │
│  1. llm-gateway logs       EXACT                        │
│     (case_library table)   input/output tokens per      │
│                            call, attributed to user_id  │
│                                                         │
│  2. Provider billing APIs  MONTHLY BATCH                │
│     (Anthropic /usage,     org-level token totals,      │
│      Google Workspace SDK) distributed evenly by seat   │
│                                                         │
│  3. Manual estimates       APPROXIMATE                  │
│     (Claude.ai web,        flat-rate tokens/seat/month  │
│      personal Gemini)      configurable by admin        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              inochi module (api-gateway)
              ┌──────────────────────────┐
              │ inochi.service.ts        │
              │ inochi.controller.ts     │
              │ inochi-sync.job.ts       │  monthly cron
              └──────────────────────────┘
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
    Personal dashboard card     Slack monthly DM
```

**Data precision is always shown to users.** Every figure in the UI is labelled `exact`, `estimated`, or `approximate` so employees understand what the numbers represent.

---

## Carbon Calculation

### Formula

```
carbon_kg_co2e = (input_tokens + output_tokens) / 1000 × intensity_kg_per_1k_tokens
```

Applied per usage record, then summed for the period.

### Carbon Intensity Constants

| Provider / Tool | kg CO₂e per 1,000 tokens | Basis |
|---|---|---|
| Anthropic (Claude API) | 0.000029 | Anthropic net-zero ops; US East, 100% renewable |
| OpenAI (GPT-4o API) | 0.000043 | Microsoft Azure infrastructure |
| Google (Gemini API) | 0.000022 | Google carbon-neutral data centres |
| Unknown / other | 0.000035 | Conservative average |

### Flat-Rate Estimates for Web Tools

When token-level data is unavailable (Claude.ai web, personal Gemini), the system uses a configurable flat-rate default stored in `usage_estimates`:

| Tool | Default tokens/seat/month | Basis |
|---|---|---|
| Claude.ai (Teams/Pro) | 500,000 | Conservative estimate; Anthropic published benchmarks |
| Gemini (Google Workspace) | 400,000 | Conservative estimate; Google Workspace AI usage reports |

These defaults are configurable by admin. They are labelled `estimated` in all views.

### Real-World Comparison Scale

To make carbon figures tangible, the Slack notification and dashboard include a human comparison:

| kg CO₂e | Equivalent |
|---|---|
| 0.1 | Boiling a kettle 10 times |
| 1.0 | Driving ~6 km in a petrol car |
| 10.0 | A return trip Hanoi → Ho Chi Minh City by bus |
| 100.0 | One return flight Hanoi → Tokyo |

Formula: `km_equivalent = kg_co2e / 0.171` (average petrol car, 171g CO₂/km).

---

## Data Model

### New Tables

#### `ai_usage_logs`
Normalised record of every usage event across all sources.

```sql
CREATE TABLE ai_usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(user_id) ON DELETE SET NULL,
  tenant_id       UUID NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('gateway', 'billing_api', 'estimate')),
  provider        TEXT NOT NULL CHECK (provider IN ('anthropic', 'google', 'openai', 'other')),
  tool            TEXT NOT NULL,
  -- tool values: 'kokoro' | 'claude_api' | 'claude_web' | 'gemini_workspace' | 'gemini_web' | 'openai_api'
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  period_month    DATE NOT NULL,   -- first day of the month
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_user_month ON ai_usage_logs (user_id, period_month);
CREATE INDEX idx_ai_usage_logs_tenant_month ON ai_usage_logs (tenant_id, period_month);
```

#### `carbon_offsets`
Records of verified offset purchases made by the company.

```sql
CREATE TABLE carbon_offsets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  kg_co2e         NUMERIC(10,3) NOT NULL,
  provider        TEXT NOT NULL,  -- 'gold_standard' | 'verra_vcs' | 'other'
  cert_id         TEXT,           -- certificate reference number
  cost_usd        NUMERIC(10,2),
  purchased_at    DATE NOT NULL,
  covers_from     DATE NOT NULL,  -- period this offset covers (start)
  covers_to       DATE NOT NULL,  -- period this offset covers (end)
  notes           TEXT,
  recorded_by     UUID REFERENCES users(user_id)
);
```

#### `usage_estimates`
Admin-configurable flat-rate defaults per tool per tenant.

```sql
CREATE TABLE usage_estimates (
  tenant_id                  UUID NOT NULL,
  tool                       TEXT NOT NULL,
  tokens_per_seat_per_month  INTEGER NOT NULL,
  notes                      TEXT,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, tool)
);
```

### Existing Table (already populated)
`case_library` rows with `input_tokens`, `output_tokens`, `llm_provider` are the source of truth for gateway-originated usage. The sync job reads these and writes normalised records into `ai_usage_logs`.

---

## Functional Requirements

### Data Collection

**FR-INO-010:** The sync job (`inochi-sync.job.ts`) must run on the 1st of each month at 02:00 UTC and populate `ai_usage_logs` for the prior month from all three sources.

**FR-INO-011:** Gateway-source records must be derived from `case_library` rows where `created_at` falls within the month, grouped by `user_id`, `llm_provider`, and summed for `input_tokens` + `output_tokens`.

**FR-INO-012:** Billing API source must query the Anthropic usage API and Google Workspace Admin SDK for org-level token totals, then distribute the total evenly across active seats for that month (active = `opted_out_at IS NULL`).

**FR-INO-013:** Estimate source must insert one record per active user per configured tool using the `usage_estimates` flat-rate, labelled `source = 'estimate'`.

**FR-INO-014:** The sync job must be idempotent — re-running it for the same month must not create duplicate records (use `ON CONFLICT DO NOTHING` or equivalent).

### Carbon Calculation

**FR-INO-020:** Carbon in kg CO₂e must be calculated as:
`(input_tokens + output_tokens) / 1000 × intensity`
where `intensity` is the per-provider constant defined in the Carbon Calculation section above.

**FR-INO-021:** Every carbon figure shown in any UI must include a label indicating its precision: `exact` (source = gateway), `estimated` (source = billing_api), or `approximate` (source = estimate).

**FR-INO-022:** The carbon intensity constants must be stored as named configuration (not magic numbers in code) so they can be updated without a code change when provider data improves.

### Personal View

**FR-INO-030:** Each authenticated employee must be able to view their personal AI carbon footprint for the current and previous 11 months via the dashboard "My Carbon" tab.

**FR-INO-031:** The personal view must show: total kg CO₂e this month, total tokens this month, estimated offset cost in USD, breakdown by tool (with precision label per row), and company offset status for the current month.

**FR-INO-032:** A real-world comparison (km equivalent in a petrol car) must be shown alongside the kg CO₂e figure, calculated as `kg_co2e / 0.171`.

**FR-INO-033:** The offset cost estimate shown to employees must use USD 15 per tonne CO₂e as the default rate (midpoint of Gold Standard range USD 8–20), configurable by admin.

### Slack Monthly Notification

**FR-INO-040:** On the 2nd of each month, the system must send a Slack DM to every active employee summarising their prior month's AI carbon footprint.

**FR-INO-041:** The Slack message must include: total kg CO₂e, total tokens, breakdown by tool, real-world comparison, company offset status, and a link to the full dashboard view.

**FR-INO-042:** Employees who have opted out of Kokoro data collection (`opted_out_at IS NOT NULL`) must not receive the Slack notification and must not appear in any team or company rollup.

### Team & Company Rollup (Admin)

**FR-INO-050:** Admin users must be able to view a company-level dashboard showing: total kg CO₂e for the current month, total tokens, breakdown by team, and a list of offset purchases with their coverage periods.

**FR-INO-051:** Team-level breakdown must group users by their Slack workspace channel/team assignment (to be configured per tenant).

**FR-INO-052:** If a team has fewer than 5 active members, individual-level data must not be shown in the team breakdown (same anonymisation threshold as the case library dashboard).

### Offset Recording

**FR-INO-060:** Admin users must be able to record a verified offset purchase by entering: provider name, certificate ID, kg CO₂e covered, cost in USD, purchase date, and the date range the offset covers.

**FR-INO-061:** Once a period is marked as covered by an offset, every employee's personal view must show "Company offset: ✓ Covered" for that period.

**FR-INO-062:** The system must never delete or modify offset records — only new records can be added (append-only audit trail).

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/inochi/carbon/me` | Personal carbon summary (authenticated user) |
| `GET` | `/inochi/carbon/me/history` | Monthly history, last 12 months |
| `GET` | `/inochi/carbon/team` | Team rollup (admin only) |
| `GET` | `/inochi/carbon/company` | Company rollup (admin only) |
| `POST` | `/inochi/offsets` | Record an offset purchase (admin only) |
| `GET` | `/inochi/offsets` | List all offset purchases |
| `POST` | `/inochi/sync` | Manually trigger sync job (admin only) |

The existing `GET /inochi/carbon` endpoint (pilot-level aggregate) is preserved for the public dashboard.

---

## Acceptance Criteria

- [ ] Sync job runs on schedule and populates `ai_usage_logs` for the prior month from all three sources without duplicates
- [ ] Personal dashboard tab shows monthly carbon, token count, tool breakdown with precision labels, and offset status
- [ ] Slack DM is sent to all active employees on the 2nd of each month
- [ ] Real-world comparison (km equivalent) is displayed alongside every kg CO₂e figure
- [ ] Admin can record an offset purchase and it immediately reflects as "covered" on all employee views
- [ ] Carbon intensity constants are configurable without a code change
- [ ] Opted-out employees are excluded from all views and notifications
- [ ] Teams with fewer than 5 members do not show individual-level data

---

## Out of Scope (v1)

- Automated offset purchasing (Stripe or marketplace API integration) — v2
- SBTi-aligned Scope 1/2/3 reporting — Horizon 2
- Browser extension for capturing web tool usage at token level — v2
- Multi-tenant SaaS billing and tenant onboarding — productization phase
- Historical data import (pre-system token usage) — v2
- Mobile notifications — v2

---

## Phase Map

| Deliverable | Phase |
|---|---|
| DB migration (3 new tables) | M5 |
| Sync job — gateway source | M5 |
| Personal dashboard tab | M5 |
| Sync job — billing API source | M5–6 |
| Slack monthly notification | M6 |
| Admin team/company rollup | M6 |
| Offset recording UI | M6 |
| Sync job — estimate source | M6 |
| Productization design review | M7–8 |
