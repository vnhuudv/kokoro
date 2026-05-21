# Infrastructure Design — Kokoro Engine

**ADR references:** [ADR-001-privacy-architecture.md](../decisions/ADR-001-privacy-architecture.md), [ADR-002-llm-provider-strategy.md](../decisions/ADR-002-llm-provider-strategy.md), [ADR-003-slack-integration-approach.md](../decisions/ADR-003-slack-integration-approach.md)
**Linked requirements:** [system-overview.md](../requirements/system-overview.md)
**Phase:** M1–2 (design); M3–4 (implementation)
**Status:** Draft

---

## Overview

All infrastructure runs on **AWS Tokyo region (ap-northeast-1)** to satisfy data residency requirements for Vnext Japan. The system is containerised and orchestrated with Kubernetes (EKS). Infrastructure is defined as code using Terraform.

Three environments are maintained:

| Environment | Purpose | Scale |
|---|---|---|
| `dev` | Local development via Docker Compose — no AWS required | Single machine |
| `staging` | Pre-production validation on EKS — reduced node count | Minimal |
| `prod` | Live pilot environment | Full |

---

## High-Level Architecture

```
                        ┌─────────────────────────────────────┐
                        │           Slack Workspace            │
                        │  (Vnext tenant boundary)             │
                        └──────────────┬──────────────────────┘
                                       │ Socket Mode (WebSocket)
                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        AWS ap-northeast-1 (Tokyo)                    │
│                                                                      │
│  ┌─────────────┐    ┌─────────────────────────────────────────────┐ │
│  │  CloudFront │    │                   EKS Cluster               │ │
│  │  (dashboard)│    │                                             │ │
│  └──────┬──────┘    │  ┌─────────────┐   ┌────────────────────┐  │ │
│         │           │  │ slack-app   │   │   api-gateway      │  │ │
│         │           │  │ (Node.js)   │   │   (NestJS)         │  │ │
│  ┌──────▼──────┐    │  └──────┬──────┘   └────────┬───────────┘  │ │
│  │  dashboard  │    │         │                    │              │ │
│  │  (React)    │    │         └──────────┬─────────┘              │ │
│  │  on S3      │    │                    ▼                         │ │
│  └─────────────┘    │         ┌──────────────────┐                │ │
│                     │         │  annotation-      │                │ │
│                     │         │  pipeline         │                │ │
│                     │         │  (FastAPI)        │                │ │
│                     │         └────────┬──────────┘                │ │
│                     │                  │                            │ │
│                     │         ┌────────▼──────────┐                │ │
│                     │         │  llm-gateway      │                │ │
│                     │         │  (FastAPI)        │                │ │
│                     │         └────────┬──────────┘                │ │
│                     │                  │                            │ │
│                     └──────────────────┼────────────────────────── ┘ │
│                                        │                              │
│  ┌─────────────────────────────────────┼───────────────────────────┐ │
│  │                    Data Layer       │                            │ │
│  │                                     ▼                            │ │
│  │  ┌──────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │  RDS Postgres│  │ ElastiCache│  │   MSK    │  │  AWS KMS │  │ │
│  │  │  + pgvector  │  │   Redis    │  │  Kafka   │  │ (per-ten)│  │ │
│  │  └──────────────┘  └────────────┘  └──────────┘  └──────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Supporting Services                                             │ │
│  │  AWS Secrets Manager · WAF · Route 53 · S3 · CloudWatch         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
                                        │
                          ┌─────────────┼──────────────┐
                          ▼             ▼               ▼
                   Anthropic API   OpenAI API    Google AI API
                   (Claude)        (GPT, failover)(Gemini, failover)
```

---

## Services

### `slack-app` — Slack Integration Service
- **Runtime:** Node.js
- **Framework:** Slack Bolt SDK
- **Responsibility:** Manages the Socket Mode WebSocket connection to Slack. Receives message events, calls the annotation pipeline, posts ephemeral Block Kit annotations back to the recipient.
- **Scales with:** Number of active pilot users (low traffic — 40–80 users)
- **Key env vars:** `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `PIPELINE_API_URL`

### `api-gateway` — REST + WebSocket Gateway
- **Runtime:** Node.js
- **Framework:** NestJS
- **Responsibility:** Single entry point for all external clients (dashboard web app, future mobile/email clients). Handles authentication (OIDC/OAuth2), rate limiting, request routing to internal services.
- **Exposes:** REST API + WebSocket for dashboard real-time updates
- **Key env vars:** `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `AUTH0_DOMAIN`

### `annotation-pipeline` — AI Processing Pipeline
- **Runtime:** Python
- **Framework:** FastAPI
- **Responsibility:** Orchestrates the six-stage processing pipeline (capture → anonymise → parse → analyse → translate → annotate). Calls the LLM gateway for model inference. Writes anonymised cases to the case library.
- **Key env vars:** `LLM_GATEWAY_URL`, `DATABASE_URL`, `KAFKA_BROKERS`

### `llm-gateway` — LLM Routing & Failover
- **Runtime:** Python
- **Framework:** FastAPI
- **Responsibility:** Receives anonymised prompts from the annotation pipeline. Routes to the primary LLM (Claude). Handles failover to GPT then Gemini on timeout or error. Tracks per-request cost and latency in telemetry. Never sees raw user data — only anonymised payloads.
- **Key env vars:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `KAFKA_BROKERS`

### `feedback-learner` — Async Learning Service
- **Runtime:** Python
- **Framework:** FastAPI (async workers)
- **Responsibility:** Consumes `annotation.created` and `suggestion.used` Kafka events. Updates the case library with outcome data. Triggers fine-tuning pipeline when case library accumulates enough new data.
- **Runs as:** Background worker (not user-facing)

### `dashboard` — Web Application
- **Runtime:** React 18 + TypeScript
- **Build output:** Static files served from S3 + CloudFront
- **Responsibility:** Team insights dashboard (team view, personal view, public/board-pitch view). Communicates with `api-gateway` via REST + WebSocket.
- **Key env vars:** `VITE_API_BASE_URL`, `VITE_AUTH0_DOMAIN`

---

## AWS Services

| Service | Usage |
|---|---|
| **EKS** | Kubernetes cluster hosting all backend services |
| **RDS PostgreSQL** | Primary database with pgvector extension; Multi-AZ in prod |
| **ElastiCache Redis** | Session cache, rate limiting, short-lived LLM response cache |
| **MSK (Kafka)** | Event streaming between pipeline services |
| **S3** | Dashboard static build, CSV exports, assets |
| **CloudFront** | CDN for dashboard; HTTPS termination |
| **AWS KMS** | Per-tenant encryption keys; key rotation |
| **Secrets Manager** | LLM API keys, database credentials — never in code or env files |
| **Route 53** | DNS for API and dashboard domains |
| **WAF** | Web Application Firewall on the API gateway ALB |
| **CloudWatch** | Logs aggregation, alarms, metrics |
| **ECR** | Container image registry for all services |
| **GitHub Actions** | CI/CD pipelines |

---

## Networking

```
Internet
    │
    ▼
Route 53 (DNS)
    │
    ├──▶ CloudFront ──▶ S3 (dashboard static)
    │
    └──▶ ALB (Application Load Balancer)
             │
             ▼  (WAF applied here)
         EKS Cluster (private subnets)
             │
             ├── slack-app (no inbound — outbound Socket Mode only)
             ├── api-gateway (inbound from ALB)
             ├── annotation-pipeline (internal only)
             ├── llm-gateway (internal + outbound to LLM APIs)
             └── feedback-learner (internal only)
                     │
             Data Layer (private subnets, no internet access)
             ├── RDS PostgreSQL
             ├── ElastiCache Redis
             └── MSK Kafka
```

**Subnet design:**
- Public subnets: ALB, NAT Gateway
- Private subnets: EKS nodes, RDS, ElastiCache, MSK
- No direct internet access to any data store

**Outbound traffic from EKS:**
- LLM API calls (Claude, GPT, Gemini) — via NAT Gateway
- Slack Socket Mode — via NAT Gateway
- All other internal traffic stays within the VPC

---

## Kubernetes Structure

```
kokoro-namespace/
├── Deployments
│   ├── slack-app          (1 replica, min 1)
│   ├── api-gateway        (2 replicas, HPA: 2–5)
│   ├── annotation-pipeline (2 replicas, HPA: 2–8)
│   ├── llm-gateway        (2 replicas, HPA: 2–6)
│   ├── feedback-learner   (1 replica, min 1)
│   └── dashboard          (served from S3/CloudFront, not a K8s deployment)
├── Services
│   ├── api-gateway-svc    (LoadBalancer → ALB)
│   └── internal ClusterIP services for pipeline, llm-gateway
├── ConfigMaps
│   └── app-config (non-sensitive env vars)
├── Secrets
│   └── References to AWS Secrets Manager via External Secrets Operator
└── HorizontalPodAutoscaler
    ├── api-gateway (CPU >60% → scale up)
    └── annotation-pipeline (CPU >70% → scale up)
```

---

## CI/CD Pipeline

**Tool:** GitHub Actions

```
Push to branch
      │
      ▼
[CI] Lint + type check + unit tests
      │
      ▼
[CI] Build Docker images → push to ECR
      │
      ▼
[CI] Integration tests (against staging DB)
      │
      ▼  (merge to main only)
[CD] Deploy to staging → smoke tests
      │
      ▼  (manual approval gate for prod)
[CD] Deploy to prod via rolling update
```

**Environments per branch:**
- `feature/*` → CI only (no deploy)
- `main` → CI + deploy to staging (automatic)
- `release/*` → CI + deploy to prod (manual gate)

---

## Observability

| Tool | Purpose |
|---|---|
| **CloudWatch Logs** | Centralised log aggregation for all services |
| **CloudWatch Metrics** | Infrastructure metrics (CPU, memory, latency) |
| **Datadog** | Application-level metrics, dashboards, alerting |
| **Sentry** | Error tracking and stack traces for all services |

**Key metrics to monitor:**

| Metric | Alert threshold |
|---|---|
| Annotation pipeline P95 latency | > 2 seconds |
| LLM gateway error rate | > 5% over 5 minutes |
| API gateway 5xx rate | > 1% over 5 minutes |
| RDS connection pool usage | > 80% |
| Kafka consumer lag | > 1000 messages |

---

## Local Development (Docker Compose)

For development, all services run locally via Docker Compose. No AWS account required.

```yaml
# docker-compose.yml (summary)
services:
  postgres:       # PostgreSQL 16 + pgvector
  redis:          # Redis 7
  kafka:          # Kafka + Zookeeper
  slack-app:      # Node.js (hot reload)
  api-gateway:    # NestJS (hot reload)
  annotation-pipeline: # FastAPI (hot reload)
  llm-gateway:    # FastAPI (hot reload)
  feedback-learner:    # Python worker
```

LLM calls in dev use real API keys from a local `.env` file (never committed). A mock LLM mode is available for offline development (`LLM_MOCK=true`).

---

## Security Checklist

- [ ] All secrets loaded from AWS Secrets Manager — no secrets in code, config files, or environment variables checked into git
- [ ] Per-tenant KMS keys provisioned at tenant creation
- [ ] WAF rules applied to ALB: rate limiting, SQL injection, XSS protection
- [ ] All inter-service traffic within EKS uses mTLS (Istio or AWS App Mesh)
- [ ] RDS, ElastiCache, MSK in private subnets — no public endpoints
- [ ] ECR image scanning enabled for all container images
- [ ] GitHub Actions secrets stored in GitHub Secrets — not in workflow files
- [ ] `slack_user_id` encrypted at application layer before DB write

---

## Phase Map

| Deliverable | Phase |
|---|---|
| Terraform modules written: VPC, EKS, RDS, Redis, MSK, KMS | M2–3 |
| Docker Compose local dev environment working | M3 (start of build) |
| Staging environment deployed, services running | M3–4 |
| CI/CD pipeline live (lint, test, build, deploy to staging) | M3–4 |
| Production environment deployed, Slack app installed at Vnext | M4–5 |
| Observability (Datadog + Sentry) configured with alerts | M4–5 |
| Prod deploy pipeline with manual gate operational | M5 |
