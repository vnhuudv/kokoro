# Kokoro — Cultural Intelligence Platform

Kokoro is an AI-powered cultural intelligence system for global teams. It annotates Slack messages in real time, flags register mismatches and cross-cultural risks, and surfaces coaching suggestions — all without storing raw message content. A React dashboard provides team leads and programme managers with fluency trend data, anonymised teaching cases, and pillar-level metrics.

Built for the **Vnext Japan** pilot programme (M3–M6).

---

## Architecture Overview

```
┌─────────────┐   Socket Mode   ┌─────────────────────┐
│  Slack App  │ ──────────────▶ │  Annotation Pipeline │ ──▶ Kafka ──▶ Feedback Learner
└─────────────┘                 │  (FastAPI, 6-stage)  │
                                └──────────┬──────────-┘
                                           │ HTTP
                                ┌──────────▼──────────-┐
                                │    LLM Gateway        │  Claude (primary) / GPT / Gemini
                                └──────────────────────┘

┌─────────────────────┐         ┌──────────────────────┐
│  React Dashboard    │ ──HTTP─▶│   API Gateway (NestJS)│ ──▶ PostgreSQL + Redis
│  (Vite + TS)        │         └──────────────────────┘
└─────────────────────┘

┌─────────────────────┐
│  Google Chat App    │ ──HTTP─▶ API Gateway
└─────────────────────┘
```

### Services

| Service | Tech | Port | Purpose |
|---|---|---|---|
| `api-gateway` | NestJS | 3000 | REST + WebSocket; auth (Slack OAuth); all API routes |
| `slack-app` | Slack Bolt | — | Socket Mode listener; sends Block Kit annotations |
| `annotation-pipeline` | FastAPI | 8001 | 6-stage NLP pipeline (redact → detect → score → suggest) |
| `llm-gateway` | FastAPI | 8002 | Claude primary; GPT/Gemini failover |
| `feedback-learner` | Python | — | Kafka consumer; writes accepted suggestions to case library |
| `google-chat-app` | NestJS | 3001 | Google Chat slash commands and webhooks |
| `dashboard` | React 18 + Vite | 5173 | Manager/participant web UI |

### Infrastructure

| Component | Purpose |
|---|---|
| PostgreSQL 16 + pgvector | Primary database; vector embeddings for case similarity |
| Redis 7 | Session cache; rate limiting |
| Kafka (Confluent) | Annotation events; feedback pipeline |

---

## Prerequisites

- Docker ≥ 24 and Docker Compose v2
- Node.js ≥ 20 (for dashboard dev mode only)
- Python 3.11+ (for running Python services locally outside Docker)
- A Slack app with **Socket Mode** enabled (bot + app tokens)
- An Anthropic API key

---

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url>
cd kokoro/code
cp .env.example .env
```

Open `.env` and fill in the required secrets:

```env
# Required — won't start without these
ANTHROPIC_API_KEY=sk-ant-...
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
JWT_SECRET=<any random 32+ char string>

# Optional — GPT/Gemini fallback
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
```

All other values have working defaults for local development.

### 2. Start the full stack

```bash
cd code
docker compose up -d
```

This starts: PostgreSQL, Redis, Kafka, Zookeeper, API Gateway, Slack App, Annotation Pipeline, LLM Gateway, Feedback Learner, and the Dashboard (served at port 5173).

Wait for health checks to pass (~30–60 seconds on first run):

```bash
docker compose ps   # all services should show "healthy" or "running"
```

### 3. Apply database migrations

```bash
for f in src/database/migrations/*.sql; do
  docker exec -i kokoro-postgres-1 psql -U kokoro -d kokoro < "$f"
done
```

Or using `psql` if you have it installed locally:

```bash
for f in src/database/migrations/*.sql; do
  psql postgresql://kokoro:kokoro@localhost:5432/kokoro -f "$f"
done
```

### 4. Open the dashboard

```
http://localhost:5173
```

Sign in with Slack (OAuth redirect handled by the API Gateway at `localhost:3000/api/auth/slack`).

---

## Dashboard — Dev Mode (frontend only)

If you want hot-reload for UI changes without running the full Docker stack:

```bash
cd code/src/web/dashboard
npm install
npm run dev
```

Opens at `http://localhost:5173`. The dev Vite config proxies `/api` to `http://localhost:3000` — so you still need the API Gateway running (via Docker or directly).

---

## Running Tests

### Dashboard (Vitest)

```bash
cd code/src/web/dashboard
npm run test
```

### API Gateway (Jest)

```bash
cd code/src/services/api-gateway
npm run test
```

### Python services (pytest)

```bash
cd code/src/services/annotation-pipeline
pytest

cd code/src/services/llm-gateway
pytest
```

### Smoke Tests (end-to-end against live stack)

Requires the full Docker stack to be running and migrations applied.

```bash
# Tâm pillar
bash tests/smoke/tam.sh

# Makoto pillar
bash tests/smoke/makoto.sh

# Nominication module
bash tests/smoke/nominication.sh
```

Each script exercises every endpoint in the module with real HTTP calls and prints PASS/FAIL per endpoint.

---

## Project Structure

```
kokoro/
├── code/
│   ├── docker-compose.yml
│   ├── .env.example
│   └── src/
│       ├── services/
│       │   ├── api-gateway/          NestJS REST API + Slack OAuth
│       │   ├── slack-app/            Slack Bolt Socket Mode listener
│       │   ├── annotation-pipeline/  FastAPI 6-stage NLP pipeline
│       │   ├── llm-gateway/          FastAPI LLM abstraction layer
│       │   ├── feedback-learner/     Kafka consumer + case library writer
│       │   ├── google-chat-app/      Google Chat integration
│       │   └── python_shared/        Shared DB client, Kafka helpers, types
│       ├── database/
│       │   └── migrations/           SQL migrations (001–007)
│       └── web/
│           └── dashboard/            React 18 + Vite + TypeScript
├── specs/
│   ├── requirements/                 Structured feature specs (FR-XXX-NNN format)
│   ├── design/                       UX/UI design specs
│   ├── database/                     Schema, Redis conventions, Kafka topics
│   ├── infra/                        AWS, EKS, CI/CD design
│   └── decisions/                    Architecture Decision Records (ADRs)
├── docs/
│   └── superpowers/
│       ├── specs/                    Design docs from brainstorming sessions
│       └── plans/                    Implementation plans (task-by-task)
└── tests/
    ├── smoke/                        End-to-end smoke scripts per module
    └── known-failures.md             Pre-existing failures logged here (never silently accept red CI)
```

---

## Database Migrations

Migrations are plain SQL files applied in order. Never edit a committed migration — add a new one.

| File | What it creates |
|---|---|
| `001_init.sql` | Core schema: tenants, users, sessions, annotations |
| `002_seed_default_tenant.sql` | Seeds `default-tenant` row |
| `003_token_tracking.sql` | LLM token usage tracking |
| `004_inochi_carbon.sql` | Carbon / Inochi 命 pillar tables |
| `005_nominication.sql` | En score, nominations, nudges, friction events |
| `006_tam.sql` | Tâm 心 pillar: posts, points, badges, leaderboard |
| `007_makoto.sql` | Makoto 誠 pillar: articles, comments, reactions |

---

## Key Design Decisions

| ADR | Decision |
|---|---|
| [ADR-001](specs/decisions/ADR-001-privacy-architecture.md) | On-device PII redaction before any LLM call; per-tenant encryption at rest |
| [ADR-002](specs/decisions/ADR-002-llm-provider-strategy.md) | Claude primary, GPT/Gemini automatic failover, LoRA fine-tuning path |
| [ADR-003](specs/decisions/ADR-003-slack-integration-approach.md) | Socket Mode (no public webhook); Block Kit ephemeral messages only |

---

## Development Workflow

Every feature follows a six-phase cycle: **Brainstorm → Plan → Preflight → Implement → Review → Smoke test → Retro**. See [CLAUDE.md](CLAUDE.md) for the full protocol.

Feature specs live in `specs/requirements/`. Implementation plans live in `docs/superpowers/plans/`. Both are committed before any code is written.

---

## Pillar Color System

The dashboard uses pillar-specific accent colors throughout:

| Pillar | Kanji | Color | Hex |
|---|---|---|---|
| Inochi / Carbon | 命 | Emerald | `#10b981` |
| Tâm | 心 | Amber | `#f59e0b` |
| Makoto | 誠 | Indigo | `#6366f1` |
| En Score | — | Violet | `#8b5cf6` |
| Kokoro / Team | — | Sky | `#0ea5e9` |

---

## Environment Variables Reference

See [.env.example](code/.env.example) for the full list with descriptions. Critical variables:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `SLACK_BOT_TOKEN` | Yes | Slack bot token (`xoxb-`) |
| `SLACK_APP_TOKEN` | Yes | Slack app-level token (`xapp-`) for Socket Mode |
| `SLACK_CLIENT_ID` | Yes | Slack OAuth app client ID |
| `SLACK_CLIENT_SECRET` | Yes | Slack OAuth app client secret |
| `JWT_SECRET` | Yes | Session signing secret (32+ random chars) |
| `DATABASE_URL` | Auto | Set by Docker Compose; override for external DB |
| `NUDGE_FRICTION_THRESHOLD` | No | Default `0.6` — friction score threshold for nudge engine |
