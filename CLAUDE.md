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

## Development Workflow

Every feature or module follows this 6-phase cycle without exception. No phase may be skipped.

```
Phase 1        Phase 2        Preflight      Phase 3        Phase 4        Phase 5        Phase 6
Brainstorm  →  Plan +      →  Gate        →  Subagent    →  Two-stage   →  Smoke test  →  Retro →
& Design       Dep. Graph     tests green    impl.           review         + script       CLAUDE.md
```

---

### Phase 1 — Brainstorm & Design

**Output:** Spec document committed to `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`

1. Describe the feature in plain language. Claude explores the project context first.
2. Answer clarifying questions one at a time — purpose, actors, constraints, edge cases, success criteria.
3. Review 2–3 proposed approaches with trade-offs. Claude makes a recommendation.
4. Approve the design section by section — architecture, data model, error handling, testing.
5. Claude writes, self-reviews for gaps, and commits the spec.
6. You review the committed spec file. Request changes if needed. **Only proceed when approved.**

> **Gate:** No implementation starts until the spec is committed and explicitly approved. If code and spec diverge, fix the spec first.

---

### Phase 2 — Implementation Plan with Dependency Graph

**Output:** Plan committed to `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`

1. Claude reads the spec and produces ordered tasks — each 1–4 hours, with named files and acceptance criteria.
2. Each task names the exact files to create or modify.
3. **Each task declares its dependencies** (`depends_on: [1, 3]`). Tasks with no shared dependencies are flagged for parallel dispatch.
4. Plan is committed. You review and approve before any implementation begins.

---

### Preflight Gate — Pre-Task Check

Runs **before every Phase 4 review** is dispatched.

1. Run the full test suite (`npm test` / `pytest`) — all services.
2. New failures → task is **BLOCKED**. Reviews do not start.
3. Pre-existing failure found → log in `tests/known-failures.md` and investigate. Never silently accept a failing test.
4. Only a green suite (excluding logged known failures) allows Phase 4 to proceed.

---

### Phase 3 — Subagent Implementation

**Output:** Committed code + unit tests per task

1. Controller dispatches each task with: full task text, architectural context, working directory, and the implementer prompt template.
2. **Independent tasks are dispatched in parallel** — one subagent per task, running concurrently.
3. Subagent implements → writes tests → self-reviews → commits → reports back.
4. Report status must be one of: `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`.
5. `BLOCKED` or `NEEDS_CONTEXT` stops the queue. Controller provides context or splits the task.

---

### Phase 4 — Two-Stage Independent Review

**Output:** Verified task or fix list

1. **Spec compliance review:** Did the implementer build exactly what was requested? Missing requirements? Wrong interpretation? Extra features not in spec?
2. If spec compliance passes → dispatch code quality review. If not → return to implementer with specific findings.
3. **Code quality review:** Clean naming, single responsibility, correct file sizing, adequate test coverage, consistent with existing codebase patterns.
4. Critical or important issues → fix inline before marking task complete. Minor issues → log for the retrospective.

---

### Phase 5 — Integration Smoke Test + Committed Script

**Output:** All new endpoints exercised end-to-end; smoke script committed to `tests/smoke/<module>.sh`

1. **Step 0 — Env drift check:** Diff `.env` against `.env.example`. Any key in example but missing from `.env` must be added before the stack starts.
2. Start infrastructure: `docker compose up -d [required services]` — wait for health checks.
3. Apply all pending migrations. Rebuild service images.
4. Exercise every new endpoint with real HTTP calls. Seed required DB rows where needed.
5. Check service logs for runtime errors. Fix any issues found.
6. **Commit the smoke script** — save all curl commands with PASS/FAIL output per endpoint to `tests/smoke/<module>.sh` before moving on.

---

### Phase 6 — Post-Module Retrospective

**Output:** Updated `CLAUDE.md` conventions; ADR filed if requirements changed

1. Review every `DONE_WITH_CONCERNS` report, every bug caught in review, and every issue found in smoke testing.
2. For each one, ask: "Is there a rule that would have prevented this?" If yes, add it to `CLAUDE.md` as a standing convention — not a note.
3. **Spec change protocol:** If requirements changed during the module, document the change as an ADR (`specs/decisions/ADR-NNN-title.md`). Record what changed, why, and which tasks were affected. Never let requirements drift silently.
4. Update the plan template with any new checklist items for future implementers.

---

### Standing Protocol — Spec Change Mid-Implementation

When requirements change after implementation has started:

1. **Stop the queue.** No new tasks are dispatched until the impact is assessed.
2. **Update the spec first.** Commit the change with a clear message explaining what changed and why.
3. **Audit the plan.** Mark each remaining task as: unaffected, needs revision, or replace with new task.
4. For completed tasks affected by the change, create a new fix task — never amend history.
5. **Resume dispatch** from the revised plan once it is approved.

---

## Working Conventions

- Before starting a new feature, create or update its spec in `specs/requirements/` first.
- When a significant architectural choice is made, record it in `specs/decisions/` immediately.
- Raw materials in `specs/input/` are never modified — they are the ground truth of what was originally asked.
- Requirements use the format: Purpose → Actors → Functional Requirements (FR-XXX-NNN) → Acceptance Criteria → Constraints → Edge Cases → Out of Scope → Phase Map.

### CI/CD

- CI runs on every PR and push to `main` via `.github/workflows/ci.yml`.
- Three jobs: **env-drift** (all `.env.example` keys present in CI), **unit-tests** (Jest + pytest), **smoke-tests** (real stack + `tests/smoke/*.sh`).
- Every new module must ship a smoke script at `tests/smoke/<module>.sh` before the PR is merged — this is the Phase 5 deliverable.
- Pre-existing test failures go in `tests/known-failures.md`. Never silently accept a red CI run.
- Secrets (API keys, tokens) are stored in GitHub Actions secrets — never in the workflow file.

### Lessons from Pilot (added via Phase 6 retrospective)

- Every `INSERT` into a table with a `tenant_id NOT NULL` column must include `tenant_id` explicitly in the column list — never omit it and rely on surrounding context.
- After any task that adds new environment variables, diff `.env` against `.env.example` immediately and add the missing keys before the next smoke test.
- When a NestJS app uses `app.setGlobalPrefix('api')`, all API routes are under `/api/...` — never test at the root path.
- Container images built before a module was added to the application module registry must be rebuilt (`docker compose build <service>`) before smoke testing. A 404 on a new route is almost always a stale image.

#### Lessons from Tâm module (2026-05-28)

- **DTO field naming is a silent failure**: A mismatched field name between the frontend form (`actionLink`) and the API DTO (`externalUrl`) creates a post but silently drops the value — no error, no warning. Always cross-check the exact field names in the POST body against the service DTO before marking a form task complete.
- **`SELECT COUNT(*) ... FOR UPDATE` is invalid in PostgreSQL**: Aggregate functions cannot be combined with `FOR UPDATE`. For first-action bonus idempotency, use a UNIQUE constraint on the actions table or accept advisory semantics — not row-level locking on a COUNT.
- **Compute derived display values from joined data, not hardcoded literals**: `totalPoints` was initially `0::int` — a placeholder literal that passed review but broke the UI. When a query already JOINs a related table, compute summary fields (`COUNT(a.id) * 20`) rather than leaving a `0::int` stub.
- **React SPA navigation: use `<Link>`, never `<a href>`**: Bare `<a href="/tam/...">` triggers full page reloads and drops client-side state. All internal navigation in the dashboard must use React Router's `<Link>` component.
- **`head -n -1` is not portable**: BSD `head` (macOS) does not support negative line counts. Use `sed '$d'` to strip the last line in smoke scripts for macOS compatibility.
- **Badge category filter requires a matching `category` column on `tam_points`**: Category-scoped badges (e.g., Climate Champion) need the point-award rows to carry a `category` field. Design the points table with `category` from the start whenever category-filtered recognition is in scope.
- **Multiple `evaluateBadges` calls per action**: If `awardPoints` is called multiple times in one request (action pts + bonus pts + link-click pts), each call triggers badge evaluation. Extract `awardPointsNoEval` / private inner methods and call `evaluateBadges` exactly once at the end of the transaction.
- **UNIQUE constraints on junction tables must include `tenant_id`**: `tam_link_clicks (post_id, user_id)` without `tenant_id` leaks deduplication across tenants. Every UNIQUE constraint on a multi-tenant table must include `tenant_id` as the first column.
