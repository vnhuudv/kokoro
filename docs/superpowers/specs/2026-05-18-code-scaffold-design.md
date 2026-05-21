# Code Scaffold Design

**Date:** 2026-05-18
**Project:** Kokoro — AI Cultural Translation Engine
**Status:** Approved

---

## Summary

A grouped monorepo under `code/` containing 5 backend services, 1 web app, and 1 shared TypeScript package. Each service follows its own framework's conventions internally. Python services share a lightweight `python-shared/` module at the services level.

---

## Top-Level Structure

```
code/
├── src/
│   ├── services/        backend services (Node.js + Python)
│   ├── web/             frontend (React)
│   └── packages/        shared TypeScript types + DB client
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml   local dev (all services + dependencies)
├── docker-compose.test.yml
└── package.json         root npm workspaces config
```

---

## Services

### `slack-app` — Node.js · Slack Bolt SDK
Manages the Socket Mode WebSocket connection to Slack. Receives message events, calls the annotation pipeline, posts ephemeral Block Kit annotations back to the recipient.

```
slack-app/
├── src/
│   ├── handlers/       message, action, event handlers
│   ├── middleware/     auth, logging
│   └── index.ts
├── Dockerfile
└── package.json
```

### `api-gateway` — NestJS · REST + WebSocket
Single entry point for all external clients. Handles authentication (OIDC/OAuth2), rate limiting, and routing to internal services.

```
api-gateway/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── annotations/
│   │   └── dashboard/
│   └── main.ts
├── Dockerfile
└── package.json
```

### `annotation-pipeline` — FastAPI · 6-stage pipeline
Orchestrates the six-stage processing pipeline: capture → anonymise → parse → analyse → translate → annotate.

```
annotation-pipeline/
├── app/
│   ├── routers/
│   ├── pipeline/
│   │   ├── anonymiser.py
│   │   ├── register_detector.py
│   │   ├── intent_extractor.py
│   │   └── annotator.py
│   ├── schemas/           Pydantic models
│   └── main.py
├── Dockerfile
└── requirements.txt
```

### `llm-gateway` — FastAPI · LLM routing + failover
Routes anonymised prompts to the primary LLM (Claude) with automatic failover to GPT then Gemini on timeout or error.

```
llm-gateway/
├── app/
│   ├── routers/
│   ├── providers/
│   │   ├── claude.py
│   │   ├── openai.py
│   │   └── gemini.py
│   ├── schemas/
│   └── main.py
├── Dockerfile
└── requirements.txt
```

### `feedback-learner` — Python async worker
Consumes Kafka events (`annotation.created`, `suggestion.used`) to update the case library and fluency profiles.

```
feedback-learner/
├── app/
│   ├── consumers/         Kafka event consumers
│   ├── processors/        case library + fluency updater
│   └── main.py
├── Dockerfile
└── requirements.txt
```

### `python-shared/` — shared Python module
Shared Pydantic types, DB connection helper, and Kafka base classes consumed by all three Python services via `PYTHONPATH`.

```
python-shared/
├── types.py     domain models (AnnotationResult, UserProfile, etc.)
├── db.py        asyncpg connection helper
├── kafka.py     producer/consumer base classes
└── __init__.py
```

---

## Web

### `dashboard` — React 18 · TypeScript · Vite
Team insights dashboard with three views: team aggregate, personal fluency, and public/board-pitch.

```
dashboard/
├── src/
│   ├── components/   reusable UI components
│   ├── pages/        Team, Personal, Public views
│   ├── hooks/        data fetching, WebSocket, auth
│   └── main.tsx
├── Dockerfile
└── package.json
```

---

## Packages

### `@kokoro/shared` — TypeScript types + Prisma DB client
Consumed by `slack-app`, `api-gateway`, and `dashboard` via npm workspaces.

```
shared/
├── src/
│   ├── types/    domain types (User, Tenant, Annotation, CulturalPair…)
│   ├── db/       Prisma client + schema.prisma
│   └── index.ts
└── package.json  ("name": "@kokoro/shared")
```

---

## Root Configuration

### `package.json` — npm workspaces
```json
{
  "workspaces": [
    "src/services/slack-app",
    "src/services/api-gateway",
    "src/web/dashboard",
    "src/packages/shared"
  ]
}
```

### `docker-compose.yml` — local dev
Spins up all infrastructure dependencies (PostgreSQL, Redis, Kafka) plus all 5 backend services with hot reload. No AWS account required for local development.

### `.env.example`
Documents all required environment variables for every service. Committed to the repo. Actual `.env` is gitignored.

---

## Tests

```
tests/
├── unit/
│   ├── services/     one test file per source file in services/
│   └── web/          component + hook tests for dashboard
├── integration/      tests that cross service boundaries or hit a real DB
└── e2e/              full user journeys (annotation flow, opt-out, fluency fade)
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Repo structure | Grouped monorepo (services/ web/ packages/) | Clear separation, standard pattern, easy to add tooling later |
| Shared TS package | Types + DB client only | Minimal shared surface; utilities added only when real duplication appears |
| Internal structure | Framework conventions per service | Natural to each ecosystem; easier to follow docs and tutorials |
| Python sharing | `python-shared/` via PYTHONPATH | No pip packaging overhead; simple for MBA project scope |
