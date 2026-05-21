# Kokoro — Project Guide

This file is loaded automatically by Claude Code on every session. Use it as the single source of truth for project conventions, structure, and decisions.

---

## Project Structure

```
kokoro/
├── specs/
│   ├── input/          # Raw, unprocessed requirements — client briefs, notes, PDFs, exports
│   ├── requirements/   # Structured specifications — one file per feature or module
│   ├── design/         # UX and UI design specs — layouts, flows, component behaviour
│   ├── database/       # Database schema, ERD, indexing, retention policy
│   ├── infra/          # Infrastructure design — AWS, Kubernetes, CI/CD, networking
│   └── decisions/      # Architecture Decision Records (ADRs) — what was decided and why
├── code/
│   ├── src/            # Application source code
│   ├── tests/          # Test suites (unit, integration, e2e)
│   └── docs/           # Technical documentation — API references, setup guides
└── assets/             # Wireframes, diagrams, mockups referenced by specs or code
```

---

## Folder Conventions

### `specs/input/`
Drop raw materials here without processing — original requirement documents, interview notes, client emails, exported files. Nothing in this folder should be edited; it is a record of the original source.

### `specs/requirements/`
Structured specifications written in Markdown. Each file covers one feature, module, or user story. Derived from `input/` but expanded and clarified. Naming convention: `<module-or-feature-name>.md` (e.g., `user-authentication.md`).

### `specs/decisions/`
Architecture Decision Records (ADRs). Each file captures a significant decision: the context, the options considered, the choice made, and the rationale. Naming convention: `ADR-<number>-<short-title>.md` (e.g., `ADR-001-database-choice.md`).

### `code/src/`
All application source code. Internal structure follows the chosen framework's conventions.

### `code/tests/`
Test suites. Mirror the `src/` structure where possible so test files are easy to locate.

### `code/docs/`
Technical documentation generated or written alongside the code — API references, environment setup, deployment guides.

### `assets/`
Visual references: wireframes, UI mockups, system diagrams, ERDs. Link to these from `specs/requirements/` files as needed.

---

## Code Structure

```
code/
├── docker-compose.yml          # Local dev — all services + infra
├── .env.example                # Environment variable template
├── src/
│   ├── services/
│   │   ├── api-gateway/        # NestJS — REST + WebSocket gateway
│   │   ├── slack-app/          # Slack Bolt — Socket Mode + Block Kit
│   │   ├── annotation-pipeline/# FastAPI — 6-stage processing pipeline
│   │   ├── llm-gateway/        # FastAPI — Claude primary, GPT/Gemini failover
│   │   ├── feedback-learner/   # Python — Kafka consumer, case library writer
│   │   └── python_shared/      # Shared types, DB client, Kafka helpers
│   ├── packages/
│   │   └── shared/             # TypeScript types, Prisma schema
│   ├── web/
│   │   └── dashboard/          # React 18 + Vite + TypeScript
│   └── database/
│       └── migrations/         # SQL migration files (001_init.sql, ...)
└── tests/                      # Integration and e2e test suites
```

**Local dev:** `cp .env.example .env` → fill in API keys → `docker compose up`

---

## Database & Infrastructure Index

| File | What it covers |
|---|---|
| [database-design.md](specs/database/database-design.md) | PostgreSQL schema (7 tables), Redis key conventions, Kafka topics, retention policy |
| [infra-design.md](specs/infra/infra-design.md) | AWS architecture, EKS services, networking, CI/CD, observability, local dev setup |

---

## Decisions Index (ADRs)

| File | Decision | Status |
|---|---|---|
| [ADR-001-privacy-architecture.md](specs/decisions/ADR-001-privacy-architecture.md) | On-device PII redaction + per-tenant encryption | Accepted |
| [ADR-002-llm-provider-strategy.md](specs/decisions/ADR-002-llm-provider-strategy.md) | Claude primary, GPT/Gemini failover, LoRA fine-tuning | Accepted |
| [ADR-003-slack-integration-approach.md](specs/decisions/ADR-003-slack-integration-approach.md) | Socket Mode + Block Kit ephemeral annotations | Accepted |

---

## Design Index

| File | What it covers | Phase |
|---|---|---|
| [design-inline-annotation.md](specs/design/design-inline-annotation.md) | Annotation block layout, adaptive behaviour, interaction flow | M3–4 |
| [design-pre-send-check.md](specs/design/design-pre-send-check.md) | Pre-send panel layout, multi-flag stacking, interaction flow | M3–4 |
| [design-coaching-panel.md](specs/design/design-coaching-panel.md) | Coaching modal layout, adaptive depth, "mark as understood" | M3–4 |
| [design-team-dashboard.md](specs/design/design-team-dashboard.md) | Team view, personal view, public/board pitch view | M5–6 |

---

## Requirements Index

### System
| File | What it covers | Phase |
|---|---|---|
| [system-overview.md](specs/requirements/system-overview.md) | Components, pipeline, integration points, system-wide constraints | M1–2 |

### AI Engine
| File | What it covers | Phase |
|---|---|---|
| [engine-inline-annotation.md](specs/requirements/engine-inline-annotation.md) | Slack inline cultural annotation, register detection, suggestion chips | M3–4 |
| [engine-pre-send-check.md](specs/requirements/engine-pre-send-check.md) | Pre-send tone and intent check for outgoing messages | M3–4 |
| [engine-coaching-panel.md](specs/requirements/engine-coaching-panel.md) | On-demand cultural coaching and explanation UI | M3–4 |
| [engine-team-dashboard.md](specs/requirements/engine-team-dashboard.md) | Team fluency metrics, anonymised case library, research export | M5–6 |
| [engine-privacy-and-data.md](specs/requirements/engine-privacy-and-data.md) | Privacy architecture, consent, data minimisation, retention, deletion | M1–2 |

### Pilot Programme
| File | What it covers | Phase |
|---|---|---|
| [pilot-onboarding.md](specs/requirements/pilot-onboarding.md) | Consent, week-one setup, baseline interview, participant rights | M1–2 |
| [pilot-programme-rhythm.md](specs/requirements/pilot-programme-rhythm.md) | 8-month schedule, weekly check-ins, team rituals, interviews | M1–8 |

### Framework
| File | What it covers | Phase |
|---|---|---|
| [framework-five-pillars.md](specs/requirements/framework-five-pillars.md) | Five pillars (Kokoro, Inochi, Tâm, En, Makoto) with KPIs and practices | M1–2 |
| [framework-sustainability-paper.md](specs/requirements/framework-sustainability-paper.md) | Companion academic paper — religion, sustainability, trustee org model | M3–4 |

---

## Working Conventions

- Before starting a new feature, create or update its spec in `specs/requirements/` first.
- When a significant architectural choice is made, record it in `specs/decisions/` immediately.
- Raw materials in `specs/input/` are never modified — they are the ground truth of what was originally asked.
- Requirements use the format: Purpose → Actors → Functional Requirements (FR-XXX-NNN) → Acceptance Criteria → Constraints → Edge Cases → Out of Scope → Phase Map.
