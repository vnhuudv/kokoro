# Code Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full Kokoro monorepo — root workspace, 5 backend services, 1 React dashboard, shared TypeScript package, shared Python module, and Docker Compose for local dev.

**Architecture:** Grouped monorepo under `code/src/` with `services/`, `web/`, and `packages/` directories. TypeScript services share `@kokoro/shared` (types + Prisma) via npm workspaces. Python services share `python_shared/` via PYTHONPATH. Each service has a health check endpoint and a passing test before the task is complete.

**Tech Stack:** Node.js 20, TypeScript 5, NestJS 10, Slack Bolt SDK, FastAPI, Python 3.11, React 18, Vite, Prisma 5, PostgreSQL 16, Redis 7, Kafka (via `aiokafka`), Docker Compose, Jest, pytest, Vitest.

---

## File Map

```
code/
├── package.json                                   root workspaces + scripts
├── .env.example                                   all env vars documented
├── .gitignore
├── docker-compose.yml                             local dev: infra + all services
├── docker-compose.test.yml                        isolated test DB
├── src/
│   ├── packages/
│   │   └── shared/
│   │       ├── package.json                       name: @kokoro/shared
│   │       ├── tsconfig.json
│   │       ├── src/
│   │       │   ├── types/index.ts                 all domain types
│   │       │   ├── db/
│   │       │   │   ├── index.ts                   Prisma client singleton
│   │       │   │   └── schema.prisma
│   │       │   └── index.ts                       re-exports types + db
│   │       └── prisma/schema.prisma               (symlink or copy)
│   ├── services/
│   │   ├── python_shared/
│   │   │   ├── __init__.py
│   │   │   ├── types.py                           Pydantic domain models
│   │   │   ├── db.py                              asyncpg connection helper
│   │   │   └── kafka.py                           producer/consumer base
│   │   ├── slack-app/
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   ├── Dockerfile
│   │   │   └── src/
│   │   │       ├── index.ts                       app entry + health check
│   │   │       ├── handlers/
│   │   │       │   └── message.ts                 incoming message handler
│   │   │       └── middleware/
│   │   │           └── logger.ts                  request logger
│   │   ├── api-gateway/
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   ├── Dockerfile
│   │   │   └── src/
│   │   │       ├── main.ts
│   │   │       ├── app.module.ts
│   │   │       └── modules/
│   │   │           ├── auth/
│   │   │           │   ├── auth.module.ts
│   │   │           │   ├── auth.controller.ts
│   │   │           │   └── auth.service.ts
│   │   │           ├── users/
│   │   │           │   ├── users.module.ts
│   │   │           │   ├── users.controller.ts
│   │   │           │   └── users.service.ts
│   │   │           ├── annotations/
│   │   │           │   ├── annotations.module.ts
│   │   │           │   ├── annotations.controller.ts
│   │   │           │   └── annotations.service.ts
│   │   │           └── dashboard/
│   │   │               ├── dashboard.module.ts
│   │   │               ├── dashboard.controller.ts
│   │   │               └── dashboard.service.ts
│   │   ├── annotation-pipeline/
│   │   │   ├── requirements.txt
│   │   │   ├── Dockerfile
│   │   │   └── app/
│   │   │       ├── main.py
│   │   │       ├── routers/
│   │   │       │   └── annotation.py
│   │   │       ├── pipeline/
│   │   │       │   ├── anonymiser.py
│   │   │       │   ├── register_detector.py
│   │   │       │   ├── intent_extractor.py
│   │   │       │   └── annotator.py
│   │   │       └── schemas/
│   │   │           └── annotation.py
│   │   ├── llm-gateway/
│   │   │   ├── requirements.txt
│   │   │   ├── Dockerfile
│   │   │   └── app/
│   │   │       ├── main.py
│   │   │       ├── routers/
│   │   │       │   └── llm.py
│   │   │       ├── providers/
│   │   │       │   ├── base.py
│   │   │       │   ├── claude.py
│   │   │       │   ├── openai.py
│   │   │       │   └── gemini.py
│   │   │       └── schemas/
│   │   │           └── llm.py
│   │   └── feedback-learner/
│   │       ├── requirements.txt
│   │       ├── Dockerfile
│   │       └── app/
│   │           ├── main.py
│   │           ├── consumers/
│   │           │   └── annotation_consumer.py
│   │           └── processors/
│   │               ├── case_library.py
│   │               └── fluency.py
│   └── web/
│       └── dashboard/
│           ├── package.json
│           ├── tsconfig.json
│           ├── vite.config.ts
│           ├── index.html
│           ├── Dockerfile
│           └── src/
│               ├── main.tsx
│               ├── App.tsx
│               ├── pages/
│               │   ├── TeamView.tsx
│               │   ├── PersonalView.tsx
│               │   └── PublicView.tsx
│               ├── components/
│               │   └── .gitkeep
│               └── hooks/
│                   └── .gitkeep
└── tests/
    ├── unit/
    │   ├── services/
    │   │   ├── slack-app/          index.test.ts
    │   │   ├── api-gateway/        app.module.spec.ts
    │   │   ├── annotation-pipeline/test_pipeline.py
    │   │   ├── llm-gateway/        test_providers.py
    │   │   └── feedback-learner/   test_processors.py
    │   └── web/
    │       └── dashboard/          App.test.tsx
    ├── integration/
    │   └── .gitkeep
    └── e2e/
        └── .gitkeep
```

---

## Task 1: Root Workspace Setup

**Files:**
- Create: `code/package.json`
- Create: `code/.env.example`
- Create: `code/.gitignore`

- [ ] **Step 1: Create the root directory structure**

```bash
mkdir -p code/src/services code/src/web code/src/packages \
         code/tests/unit/services code/tests/unit/web \
         code/tests/integration code/tests/e2e
```

Expected: directories created, no output.

- [ ] **Step 2: Create `code/package.json`**

```json
{
  "name": "kokoro",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "src/packages/shared",
    "src/services/slack-app",
    "src/services/api-gateway",
    "src/web/dashboard"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces --if-present"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 3: Create `code/.env.example`**

```bash
# ── Infrastructure ────────────────────────────────────────
DATABASE_URL=postgresql://kokoro:kokoro@localhost:5432/kokoro
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# ── LLM Providers ─────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# ── Slack ─────────────────────────────────────────────────
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...

# ── API Gateway ───────────────────────────────────────────
JWT_SECRET=change-me-in-production
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.kokoro.app

# ── Service URLs (internal) ───────────────────────────────
ANNOTATION_PIPELINE_URL=http://annotation-pipeline:8001
LLM_GATEWAY_URL=http://llm-gateway:8002

# ── App ───────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
```

- [ ] **Step 4: Create `code/.gitignore`**

```
node_modules/
dist/
.env
*.pyc
__pycache__/
.venv/
*.egg-info/
.pytest_cache/
.DS_Store
```

- [ ] **Step 5: Commit**

```bash
cd code
git add package.json .env.example .gitignore
git commit -m "feat: root workspace setup"
```

---

## Task 2: @kokoro/shared Package

**Files:**
- Create: `code/src/packages/shared/package.json`
- Create: `code/src/packages/shared/tsconfig.json`
- Create: `code/src/packages/shared/src/types/index.ts`
- Create: `code/src/packages/shared/src/db/schema.prisma`
- Create: `code/src/packages/shared/src/db/index.ts`
- Create: `code/src/packages/shared/src/index.ts`

- [ ] **Step 1: Create `src/packages/shared/package.json`**

```json
{
  "name": "@kokoro/shared",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `src/packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `src/packages/shared/src/types/index.ts`**

```typescript
export type Language = 'vi' | 'ja';
export type Register = 'formal' | 'neutral' | 'informal';
export type EventType =
  | 'annotation_viewed'
  | 'suggestion_used'
  | 'suggestion_dismissed'
  | 'pattern_understood'
  | 'coaching_panel_opened'
  | 'pre_send_flag_viewed'
  | 'pre_send_original_sent'
  | 'pre_send_suggestion_used';

export interface Tenant {
  tenantId: string;
  name: string;
  kmsKeyId: string;
  pilotStart?: Date;
  pilotEnd?: Date;
  createdAt: Date;
}

export interface User {
  userId: string;
  tenantId: string;
  slackUserId: string;
  language: Language;
  fluencyScore: number;
  optedInAt: Date;
  optedOutAt?: Date;
  preferences: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestionChip {
  label: string;
  register: Register;
  text: string;
}

export interface AnnotationResult {
  register: Register;
  intentLabel: string;
  riskCategory?: string;
  annotationText: string;
  coachingRationale: string;
  suggestions: SuggestionChip[];
}

export interface CulturalPair {
  pairId: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  register: Register;
  phrasePattern: string;
  intentLabel: string;
  riskCategory?: string;
  annotationTemplate: string;
  coachingRationale: string;
  culturalConcept?: string;
  isActive: boolean;
}

export interface FluencyEvent {
  eventId: string;
  userId: string;
  eventType: EventType;
  pairId?: string;
  createdAt: Date;
}
```

- [ ] **Step 4: Create `src/packages/shared/src/db/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  tenantId   String    @id @default(uuid()) @map("tenant_id")
  name       String
  kmsKeyId   String    @map("kms_key_id")
  pilotStart DateTime? @map("pilot_start")
  pilotEnd   DateTime? @map("pilot_end")
  createdAt  DateTime  @default(now()) @map("created_at")

  users       User[]
  auditLogs   AuditLog[]
  caseLibrary CaseLibrary[]

  @@map("tenants")
}

model User {
  userId       String    @id @default(uuid()) @map("user_id")
  tenantId     String    @map("tenant_id")
  slackUserId  String    @map("slack_user_id")
  language     String
  fluencyScore Int       @default(0) @map("fluency_score")
  optedInAt    DateTime  @map("opted_in_at")
  optedOutAt   DateTime? @map("opted_out_at")
  preferences  Json      @default("{}")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  tenant        Tenant         @relation(fields: [tenantId], references: [tenantId])
  fluencyEvents FluencyEvent[]

  @@unique([tenantId, slackUserId])
  @@map("users")
}

model CulturalPair {
  pairId             String   @id @default(uuid()) @map("pair_id")
  sourceLanguage     String   @map("source_language")
  targetLanguage     String   @map("target_language")
  register           String
  phrasePattern      String   @map("phrase_pattern")
  intentLabel        String   @map("intent_label")
  riskCategory       String?  @map("risk_category")
  annotationTemplate String   @map("annotation_template")
  coachingRationale  String   @map("coaching_rationale")
  culturalConcept    String?  @map("cultural_concept")
  version            Int      @default(1)
  createdBy          String   @map("created_by")
  isActive           Boolean  @default(true) @map("is_active")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  fluencyEvents FluencyEvent[]

  @@map("cultural_pairs")
}

model CaseLibrary {
  caseId            String   @id @default(uuid()) @map("case_id")
  tenantId          String   @map("tenant_id")
  sourceLanguage    String   @map("source_language")
  targetLanguage    String   @map("target_language")
  register          String
  intentLabel       String   @map("intent_label")
  riskCategories    String[] @map("risk_categories")
  suggestionOffered Boolean  @default(false) @map("suggestion_offered")
  suggestionUsed    Boolean? @map("suggestion_used")
  anonymisedAt      DateTime @default(now()) @map("anonymised_at")
  expiresAt         DateTime @map("expires_at")
  createdAt         DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [tenantId])

  @@map("case_library")
}

model FluencyEvent {
  eventId   String   @id @default(uuid()) @map("event_id")
  userId    String   @map("user_id")
  eventType String   @map("event_type")
  pairId    String?  @map("pair_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User          @relation(fields: [userId], references: [userId], onDelete: Cascade)
  pair CulturalPair? @relation(fields: [pairId], references: [pairId])

  @@map("fluency_events")
}

model SurveyResponse {
  responseId             String   @id @default(uuid()) @map("response_id")
  tenantId               String   @map("tenant_id")
  pilotWeek              Int      @map("pilot_week")
  hadCrossCulturalEvent  Boolean  @map("had_cross_cultural_event")
  difficultyScore        Int?     @map("difficulty_score")
  comment                String?
  submittedAt            DateTime @default(now()) @map("submitted_at")

  @@map("survey_responses")
}

model AuditLog {
  logId         String   @id @default(uuid()) @map("log_id")
  tenantId      String   @map("tenant_id")
  action        String
  pipelineStage String?  @map("pipeline_stage")
  providerUsed  String?  @map("provider_used")
  latencyMs     Int?     @map("latency_ms")
  success       Boolean
  dataClass     String   @default("anonymised") @map("data_class")
  expiresAt     DateTime @map("expires_at")
  createdAt     DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [tenantId])

  @@map("audit_log")
}
```

- [ ] **Step 5: Create `src/packages/shared/src/db/index.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { PrismaClient };
```

- [ ] **Step 6: Create `src/packages/shared/src/index.ts`**

```typescript
export * from './types/index';
export * from './db/index';
```

- [ ] **Step 7: Install dependencies and generate Prisma client**

```bash
cd code/src/packages/shared
npm install
npx prisma generate --schema=src/db/schema.prisma
```

Expected: `✔ Generated Prisma Client` in output.

- [ ] **Step 8: Build the package**

```bash
npm run build
```

Expected: `dist/` folder created with `.js` and `.d.ts` files. No TypeScript errors.

- [ ] **Step 9: Commit**

```bash
cd code
git add src/packages/shared
git commit -m "feat: add @kokoro/shared package with domain types and Prisma schema"
```

---

## Task 3: python_shared Module

**Files:**
- Create: `code/src/services/python_shared/__init__.py`
- Create: `code/src/services/python_shared/types.py`
- Create: `code/src/services/python_shared/db.py`
- Create: `code/src/services/python_shared/kafka.py`

- [ ] **Step 1: Write the failing test**

```bash
mkdir -p code/tests/unit/services/python_shared
```

Create `code/tests/unit/services/python_shared/test_types.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))

from python_shared.types import AnnotationResult, Language, Register

def test_annotation_result_model():
    result = AnnotationResult(
        register=Register.formal,
        intent_label="Firm request",
        annotation_text="This is a formal request.",
        coaching_rationale="Japanese keigo signals strong intent.",
        suggestions=[],
    )
    assert result.register == Register.formal
    assert result.intent_label == "Firm request"

def test_language_enum():
    assert Language.vi == "vi"
    assert Language.ja == "ja"
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code
python -m pytest tests/unit/services/python_shared/test_types.py -v
```

Expected: `ModuleNotFoundError: No module named 'python_shared'`

- [ ] **Step 3: Create `src/services/python_shared/__init__.py`**

```python
# python_shared: domain models, DB helpers, and Kafka base classes
# consumed by annotation-pipeline, llm-gateway, and feedback-learner via PYTHONPATH
```

- [ ] **Step 4: Create `src/services/python_shared/types.py`**

```python
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class Language(str, Enum):
    vi = "vi"
    ja = "ja"


class Register(str, Enum):
    formal = "formal"
    neutral = "neutral"
    informal = "informal"


class SuggestionChip(BaseModel):
    label: str
    register: Register
    text: str


class AnnotationResult(BaseModel):
    register: Register
    intent_label: str
    risk_category: Optional[str] = None
    annotation_text: str
    coaching_rationale: str
    suggestions: list[SuggestionChip] = []


class AnnotationRequest(BaseModel):
    message_id: str
    tenant_id: str
    source_language: Language
    target_language: Language
    redacted_text: str


class LLMRequest(BaseModel):
    prompt: str
    system_prompt: str
    max_tokens: int = 512
    temperature: float = 0.3


class LLMResponse(BaseModel):
    text: str
    provider: str
    latency_ms: int
```

- [ ] **Step 5: Create `src/services/python_shared/db.py`**

```python
import os
import asyncpg
from typing import Optional

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=os.environ["DATABASE_URL"],
            min_size=2,
            max_size=10,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
```

- [ ] **Step 6: Create `src/services/python_shared/kafka.py`**

```python
import json
import os
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer


async def get_producer() -> AIOKafkaProducer:
    producer = AIOKafkaProducer(
        bootstrap_servers=os.environ.get("KAFKA_BROKERS", "localhost:9092"),
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    await producer.start()
    return producer


async def get_consumer(topic: str, group_id: str) -> AIOKafkaConsumer:
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=os.environ.get("KAFKA_BROKERS", "localhost:9092"),
        group_id=group_id,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
    )
    await consumer.start()
    return consumer
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
pip install pydantic  # if not already installed
cd code
python -m pytest tests/unit/services/python_shared/test_types.py -v
```

Expected: `PASSED tests/unit/services/python_shared/test_types.py::test_annotation_result_model`

- [ ] **Step 8: Commit**

```bash
cd code
git add src/services/python_shared tests/unit/services/python_shared
git commit -m "feat: add python_shared module with Pydantic domain types"
```

---

## Task 4: slack-app Scaffold

**Files:**
- Create: `code/src/services/slack-app/package.json`
- Create: `code/src/services/slack-app/tsconfig.json`
- Create: `code/src/services/slack-app/src/index.ts`
- Create: `code/src/services/slack-app/src/handlers/message.ts`
- Create: `code/src/services/slack-app/src/middleware/logger.ts`
- Create: `code/src/services/slack-app/Dockerfile`
- Test: `code/tests/unit/services/slack-app/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `code/tests/unit/services/slack-app/index.test.ts`:

```typescript
describe('slack-app health', () => {
  it('exports a createApp function', async () => {
    const { createApp } = await import('../../../../src/services/slack-app/src/index');
    expect(typeof createApp).toBe('function');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code/src/services/slack-app
npx jest ../../../../tests/unit/services/slack-app/index.test.ts 2>&1 | head -20
```

Expected: `Cannot find module` error.

- [ ] **Step 3: Create `src/services/slack-app/package.json`**

```json
{
  "name": "@kokoro/slack-app",
  "version": "0.1.0",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "@slack/bolt": "^3.17.0",
    "@kokoro/shared": "*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0",
    "@types/jest": "^29.0.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 4: Create `src/services/slack-app/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create `src/services/slack-app/src/middleware/logger.ts`**

```typescript
export function logRequest(action: string, metadata: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), action, ...metadata }));
}
```

- [ ] **Step 6: Create `src/services/slack-app/src/handlers/message.ts`**

```typescript
import { logRequest } from '../middleware/logger';

export interface MessageEvent {
  text: string;
  user: string;
  channel: string;
  ts: string;
}

export async function handleIncomingMessage(event: MessageEvent): Promise<void> {
  logRequest('message.received', { channel: event.channel, ts: event.ts });
  // Pipeline call will be implemented in the annotation pipeline task
}
```

- [ ] **Step 7: Create `src/services/slack-app/src/index.ts`**

```typescript
import { App, LogLevel } from '@slack/bolt';
import { handleIncomingMessage } from './handlers/message';
import { logRequest } from './middleware/logger';

export function createApp(): App {
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.ERROR,
  });

  app.message(async ({ message, say: _say }) => {
    if (message.subtype) return; // skip bot messages, edits, deletes
    await handleIncomingMessage({
      text: (message as { text?: string }).text ?? '',
      user: (message as { user?: string }).user ?? '',
      channel: (message as { channel?: string }).channel ?? '',
      ts: message.ts,
    });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  (async () => {
    await app.start();
    logRequest('slack-app.started');
  })();
}
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd code
npm install
npx jest tests/unit/services/slack-app/index.test.ts -v
```

Expected: `PASS tests/unit/services/slack-app/index.test.ts`

- [ ] **Step 9: Create `src/services/slack-app/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
CMD ["node", "dist/index.js"]
```

- [ ] **Step 10: Commit**

```bash
cd code
git add src/services/slack-app tests/unit/services/slack-app
git commit -m "feat: scaffold slack-app service with Socket Mode and message handler"
```

---

## Task 5: api-gateway Scaffold

**Files:**
- Create: `code/src/services/api-gateway/package.json`
- Create: `code/src/services/api-gateway/tsconfig.json`
- Create: `code/src/services/api-gateway/src/main.ts`
- Create: `code/src/services/api-gateway/src/app.module.ts`
- Create: `code/src/services/api-gateway/src/modules/auth/` (module + controller + service)
- Create: `code/src/services/api-gateway/src/modules/users/` (module + controller + service)
- Create: `code/src/services/api-gateway/src/modules/annotations/` (module + controller + service)
- Create: `code/src/services/api-gateway/src/modules/dashboard/` (module + controller + service)
- Create: `code/src/services/api-gateway/Dockerfile`
- Test: `code/tests/unit/services/api-gateway/app.module.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `code/tests/unit/services/api-gateway/app.module.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../../src/services/api-gateway/src/app.module';

describe('AppModule', () => {
  it('compiles the module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(module).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code
npx jest tests/unit/services/api-gateway/app.module.spec.ts 2>&1 | head -10
```

Expected: `Cannot find module` error.

- [ ] **Step 3: Create `src/services/api-gateway/package.json`**

```json
{
  "name": "@kokoro/api-gateway",
  "version": "0.1.0",
  "scripts": {
    "start": "node dist/main.js",
    "dev": "nest start --watch",
    "build": "nest build",
    "test": "jest"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@kokoro/shared": "*",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0",
    "@types/jest": "^29.0.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 4: Create `src/services/api-gateway/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create all four NestJS modules**

Create `src/services/api-gateway/src/modules/auth/auth.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
@Injectable()
export class AuthService {}
```

Create `src/services/api-gateway/src/modules/auth/auth.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('health') health() { return { status: 'ok' }; }
}
```

Create `src/services/api-gateway/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
@Module({ controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
```

Repeat the same pattern for `users`, `annotations`, and `dashboard` modules (replace `Auth` with `Users`, `Annotations`, `Dashboard` and controller path accordingly):

Create `src/services/api-gateway/src/modules/users/users.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
@Injectable()
export class UsersService {}
```

Create `src/services/api-gateway/src/modules/users/users.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get('health') health() { return { status: 'ok' }; }
}
```

Create `src/services/api-gateway/src/modules/users/users.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
@Module({ controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
```

Create `src/services/api-gateway/src/modules/annotations/annotations.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
@Injectable()
export class AnnotationsService {}
```

Create `src/services/api-gateway/src/modules/annotations/annotations.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
@Controller('annotations')
export class AnnotationsController {
  constructor(private readonly annotationsService: AnnotationsService) {}
  @Get('health') health() { return { status: 'ok' }; }
}
```

Create `src/services/api-gateway/src/modules/annotations/annotations.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';
@Module({ controllers: [AnnotationsController], providers: [AnnotationsService] })
export class AnnotationsModule {}
```

Create `src/services/api-gateway/src/modules/dashboard/dashboard.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
@Injectable()
export class DashboardService {}
```

Create `src/services/api-gateway/src/modules/dashboard/dashboard.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  @Get('health') health() { return { status: 'ok' }; }
}
```

Create `src/services/api-gateway/src/modules/dashboard/dashboard.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
```

- [ ] **Step 6: Create `src/services/api-gateway/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AnnotationsModule } from './modules/annotations/annotations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [AuthModule, UsersModule, AnnotationsModule, DashboardModule],
})
export class AppModule {}
```

- [ ] **Step 7: Create `src/services/api-gateway/src/main.ts`**

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
  console.log(`api-gateway listening on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd code
npm install
npx jest tests/unit/services/api-gateway/app.module.spec.ts -v
```

Expected: `PASS tests/unit/services/api-gateway/app.module.spec.ts`

- [ ] **Step 9: Create `src/services/api-gateway/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 10: Commit**

```bash
cd code
git add src/services/api-gateway tests/unit/services/api-gateway
git commit -m "feat: scaffold api-gateway with NestJS modules for auth, users, annotations, dashboard"
```

---

## Task 6: annotation-pipeline Scaffold

**Files:**
- Create: `code/src/services/annotation-pipeline/requirements.txt`
- Create: `code/src/services/annotation-pipeline/Dockerfile`
- Create: `code/src/services/annotation-pipeline/app/main.py`
- Create: `code/src/services/annotation-pipeline/app/schemas/annotation.py`
- Create: `code/src/services/annotation-pipeline/app/routers/annotation.py`
- Create: `code/src/services/annotation-pipeline/app/pipeline/anonymiser.py`
- Create: `code/src/services/annotation-pipeline/app/pipeline/register_detector.py`
- Create: `code/src/services/annotation-pipeline/app/pipeline/intent_extractor.py`
- Create: `code/src/services/annotation-pipeline/app/pipeline/annotator.py`
- Test: `code/tests/unit/services/annotation-pipeline/test_pipeline.py`

- [ ] **Step 1: Write the failing test**

Create `code/tests/unit/services/annotation-pipeline/test_pipeline.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/annotation-pipeline'))

from app.pipeline.anonymiser import anonymise
from app.pipeline.register_detector import detect_register
from python_shared.types import Register

def test_anonymise_removes_placeholder_name():
    result = anonymise("Hello [NAME], please review this.")
    assert "[NAME]" not in result or result == "Hello [REDACTED], please review this."

def test_detect_register_returns_register_enum():
    result = detect_register("ご検討いただけますと幸いです", source_lang="ja")
    assert result in (Register.formal, Register.neutral, Register.informal)
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code
python -m pytest tests/unit/services/annotation-pipeline/test_pipeline.py -v 2>&1 | head -15
```

Expected: `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: Create `src/services/annotation-pipeline/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
httpx==0.27.0
pydantic==2.7.0
asyncpg==0.29.0
aiokafka==0.10.0
```

- [ ] **Step 4: Create `src/services/annotation-pipeline/app/schemas/annotation.py`**

```python
from pydantic import BaseModel
from python_shared.types import AnnotationResult, Language


class AnnotationRequest(BaseModel):
    message_id: str
    tenant_id: str
    source_language: Language
    target_language: Language
    redacted_text: str


class AnnotationResponse(BaseModel):
    message_id: str
    result: AnnotationResult
    latency_ms: int
```

- [ ] **Step 5: Create the four pipeline stage files**

Create `src/services/annotation-pipeline/app/pipeline/anonymiser.py`:
```python
import re


_PII_PATTERNS = [
    (r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', '[REDACTED]'),   # full names
    (r'\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b', '[EMAIL]'), # email addresses
]


def anonymise(text: str) -> str:
    """Strip PII from text before it leaves the device."""
    for pattern, replacement in _PII_PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text
```

Create `src/services/annotation-pipeline/app/pipeline/register_detector.py`:
```python
from python_shared.types import Register


# Formal markers per language — extended in production by cultural pair DB lookup
_FORMAL_MARKERS = {
    "ja": ["いただけますと", "ございます", "よろしくお願い", "ご検討", "恐れ入ります"],
    "vi": ["kính thưa", "trân trọng", "xin phép", "kính mong"],
}

_INFORMAL_MARKERS = {
    "ja": ["じゃん", "だよね", "っていうか", "まじ"],
    "vi": ["bạn ơi", "nhé", "nha", "ơi"],
}


def detect_register(text: str, source_lang: str) -> Register:
    """Return the register of the input text."""
    formal = _FORMAL_MARKERS.get(source_lang, [])
    informal = _INFORMAL_MARKERS.get(source_lang, [])

    if any(marker in text for marker in formal):
        return Register.formal
    if any(marker in text for marker in informal):
        return Register.informal
    return Register.neutral
```

Create `src/services/annotation-pipeline/app/pipeline/intent_extractor.py`:
```python
from python_shared.types import Register


def extract_intent(text: str, register: Register, source_lang: str) -> str:
    """
    Return a plain-language intent label.
    In production this calls the LLM gateway with a structured prompt.
    At scaffold stage returns a placeholder derived from register.
    """
    if register == Register.formal and source_lang == "ja":
        if any(w in text for w in ["検討", "お願い", "いただけ"]):
            return "Firm request"
        return "Formal statement"
    if register == Register.informal:
        return "Casual exchange"
    return "Neutral message"
```

Create `src/services/annotation-pipeline/app/pipeline/annotator.py`:
```python
from python_shared.types import AnnotationResult, Register, SuggestionChip
from .register_detector import detect_register
from .intent_extractor import extract_intent

_COACHING = {
    Register.formal: {
        "ja": (
            "Japanese formal requests often signal stronger intent than their "
            "polite phrasing implies. Treat this as a priority."
        )
    },
    Register.neutral: {"ja": "This message uses neutral register.", "vi": "This message uses neutral register."},
    Register.informal: {"ja": "Casual phrasing — reply in kind.", "vi": "Casual phrasing — reply in kind."},
}


def build_annotation(
    text: str,
    source_lang: str,
    target_lang: str,
) -> AnnotationResult:
    register = detect_register(text, source_lang)
    intent = extract_intent(text, register, source_lang)
    rationale = _COACHING.get(register, {}).get(source_lang, "")
    suggestions = [
        SuggestionChip(label="Reply formally", register=Register.formal, text=""),
        SuggestionChip(label="Reply neutrally", register=Register.neutral, text=""),
    ]
    return AnnotationResult(
        register=register,
        intent_label=intent,
        annotation_text=f"{register.value.capitalize()} · {intent}",
        coaching_rationale=rationale,
        suggestions=suggestions,
    )
```

- [ ] **Step 6: Create `src/services/annotation-pipeline/app/routers/annotation.py`**

```python
import time
from fastapi import APIRouter
from app.schemas.annotation import AnnotationRequest, AnnotationResponse
from app.pipeline.anonymiser import anonymise
from app.pipeline.annotator import build_annotation

router = APIRouter(prefix="/annotate", tags=["annotation"])


@router.post("/", response_model=AnnotationResponse)
async def annotate(request: AnnotationRequest) -> AnnotationResponse:
    start = time.monotonic()
    clean_text = anonymise(request.redacted_text)
    result = build_annotation(
        text=clean_text,
        source_lang=request.source_language.value,
        target_lang=request.target_language.value,
    )
    latency_ms = int((time.monotonic() - start) * 1000)
    return AnnotationResponse(
        message_id=request.message_id,
        result=result,
        latency_ms=latency_ms,
    )
```

- [ ] **Step 7: Create `src/services/annotation-pipeline/app/main.py`**

```python
import sys
import os

# Add python_shared to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from fastapi import FastAPI
from app.routers.annotation import router as annotation_router

app = FastAPI(title="Kokoro Annotation Pipeline", version="0.1.0")
app.include_router(annotation_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "annotation-pipeline"}
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd code
pip install fastapi pydantic
python -m pytest tests/unit/services/annotation-pipeline/test_pipeline.py -v
```

Expected: `2 passed`

- [ ] **Step 9: Create `src/services/annotation-pipeline/Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ../../python_shared /app/python_shared
COPY app ./app
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
```

- [ ] **Step 10: Commit**

```bash
cd code
git add src/services/annotation-pipeline tests/unit/services/annotation-pipeline
git commit -m "feat: scaffold annotation-pipeline with 4-stage pipeline and FastAPI router"
```

---

## Task 7: llm-gateway Scaffold

**Files:**
- Create: `code/src/services/llm-gateway/requirements.txt`
- Create: `code/src/services/llm-gateway/Dockerfile`
- Create: `code/src/services/llm-gateway/app/main.py`
- Create: `code/src/services/llm-gateway/app/schemas/llm.py`
- Create: `code/src/services/llm-gateway/app/providers/base.py`
- Create: `code/src/services/llm-gateway/app/providers/claude.py`
- Create: `code/src/services/llm-gateway/app/providers/openai.py`
- Create: `code/src/services/llm-gateway/app/providers/gemini.py`
- Create: `code/src/services/llm-gateway/app/routers/llm.py`
- Test: `code/tests/unit/services/llm-gateway/test_providers.py`

- [ ] **Step 1: Write the failing test**

Create `code/tests/unit/services/llm-gateway/test_providers.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/llm-gateway'))

from app.providers.base import BaseProvider
from app.providers.claude import ClaudeProvider


def test_claude_provider_is_base_provider():
    assert issubclass(ClaudeProvider, BaseProvider)


def test_provider_order():
    from app.routers.llm import PROVIDER_ORDER
    assert PROVIDER_ORDER[0] == "claude"
    assert PROVIDER_ORDER[1] == "openai"
    assert PROVIDER_ORDER[2] == "gemini"
```

- [ ] **Step 2: Run to verify it fails**

```bash
python -m pytest tests/unit/services/llm-gateway/test_providers.py -v 2>&1 | head -10
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Create `src/services/llm-gateway/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
httpx==0.27.0
pydantic==2.7.0
anthropic==0.25.0
openai==1.25.0
google-generativeai==0.5.0
```

- [ ] **Step 4: Create `src/services/llm-gateway/app/schemas/llm.py`**

```python
from pydantic import BaseModel
from python_shared.types import LLMRequest, LLMResponse

__all__ = ["LLMRequest", "LLMResponse"]
```

- [ ] **Step 5: Create `src/services/llm-gateway/app/providers/base.py`**

```python
from abc import ABC, abstractmethod
from python_shared.types import LLMRequest, LLMResponse


class BaseProvider(ABC):
    name: str

    @abstractmethod
    async def complete(self, request: LLMRequest) -> LLMResponse:
        """Call the LLM and return a response. Raises on error."""
        ...
```

- [ ] **Step 6: Create each provider**

Create `src/services/llm-gateway/app/providers/claude.py`:
```python
import time
import anthropic
from python_shared.types import LLMRequest, LLMResponse
from .base import BaseProvider


class ClaudeProvider(BaseProvider):
    name = "claude"

    def __init__(self):
        self._client = anthropic.AsyncAnthropic()

    async def complete(self, request: LLMRequest) -> LLMResponse:
        start = time.monotonic()
        message = await self._client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=request.max_tokens,
            system=request.system_prompt,
            messages=[{"role": "user", "content": request.prompt}],
        )
        latency_ms = int((time.monotonic() - start) * 1000)
        return LLMResponse(
            text=message.content[0].text,
            provider=self.name,
            latency_ms=latency_ms,
        )
```

Create `src/services/llm-gateway/app/providers/openai.py`:
```python
import time
import openai
from python_shared.types import LLMRequest, LLMResponse
from .base import BaseProvider


class OpenAIProvider(BaseProvider):
    name = "openai"

    def __init__(self):
        self._client = openai.AsyncOpenAI()

    async def complete(self, request: LLMRequest) -> LLMResponse:
        start = time.monotonic()
        response = await self._client.chat.completions.create(
            model="gpt-4o",
            max_tokens=request.max_tokens,
            messages=[
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.prompt},
            ],
        )
        latency_ms = int((time.monotonic() - start) * 1000)
        return LLMResponse(
            text=response.choices[0].message.content or "",
            provider=self.name,
            latency_ms=latency_ms,
        )
```

Create `src/services/llm-gateway/app/providers/gemini.py`:
```python
import time
import google.generativeai as genai
from python_shared.types import LLMRequest, LLMResponse
from .base import BaseProvider


class GeminiProvider(BaseProvider):
    name = "gemini"

    def __init__(self):
        self._model = genai.GenerativeModel("gemini-1.5-pro")

    async def complete(self, request: LLMRequest) -> LLMResponse:
        start = time.monotonic()
        response = await self._model.generate_content_async(
            f"{request.system_prompt}\n\n{request.prompt}"
        )
        latency_ms = int((time.monotonic() - start) * 1000)
        return LLMResponse(
            text=response.text,
            provider=self.name,
            latency_ms=latency_ms,
        )
```

- [ ] **Step 7: Create `src/services/llm-gateway/app/routers/llm.py`**

```python
import asyncio
from fastapi import APIRouter, HTTPException
from python_shared.types import LLMRequest, LLMResponse
from app.providers.claude import ClaudeProvider
from app.providers.openai import OpenAIProvider
from app.providers.gemini import GeminiProvider
from app.providers.base import BaseProvider

router = APIRouter(prefix="/llm", tags=["llm"])

PROVIDER_ORDER = ["claude", "openai", "gemini"]

_providers: dict[str, BaseProvider] = {
    "claude": ClaudeProvider(),
    "openai": OpenAIProvider(),
    "gemini": GeminiProvider(),
}

TIMEOUT_SECONDS = 0.8


@router.post("/complete", response_model=LLMResponse)
async def complete(request: LLMRequest) -> LLMResponse:
    """Route to primary LLM with automatic failover."""
    for provider_name in PROVIDER_ORDER:
        provider = _providers[provider_name]
        try:
            return await asyncio.wait_for(
                provider.complete(request),
                timeout=TIMEOUT_SECONDS,
            )
        except (asyncio.TimeoutError, Exception):
            continue
    raise HTTPException(status_code=503, detail="All LLM providers unavailable")
```

- [ ] **Step 8: Create `src/services/llm-gateway/app/main.py`**

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from fastapi import FastAPI
from app.routers.llm import router as llm_router

app = FastAPI(title="Kokoro LLM Gateway", version="0.1.0")
app.include_router(llm_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "llm-gateway"}
```

- [ ] **Step 9: Run the test to verify it passes**

```bash
cd code
python -m pytest tests/unit/services/llm-gateway/test_providers.py -v
```

Expected: `2 passed`

- [ ] **Step 10: Create `src/services/llm-gateway/Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ../../python_shared /app/python_shared
COPY app ./app
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]
```

- [ ] **Step 11: Commit**

```bash
cd code
git add src/services/llm-gateway tests/unit/services/llm-gateway
git commit -m "feat: scaffold llm-gateway with Claude/GPT/Gemini providers and failover"
```

---

## Task 8: feedback-learner Scaffold

**Files:**
- Create: `code/src/services/feedback-learner/requirements.txt`
- Create: `code/src/services/feedback-learner/Dockerfile`
- Create: `code/src/services/feedback-learner/app/main.py`
- Create: `code/src/services/feedback-learner/app/consumers/annotation_consumer.py`
- Create: `code/src/services/feedback-learner/app/processors/case_library.py`
- Create: `code/src/services/feedback-learner/app/processors/fluency.py`
- Test: `code/tests/unit/services/feedback-learner/test_processors.py`

- [ ] **Step 1: Write the failing test**

Create `code/tests/unit/services/feedback-learner/test_processors.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/feedback-learner'))

from app.processors.fluency import compute_fluency_delta


def test_suggestion_used_increases_score():
    delta = compute_fluency_delta(event_type="suggestion_used", current_score=50)
    assert delta > 0

def test_pattern_understood_increases_score_more():
    delta_understood = compute_fluency_delta(event_type="pattern_understood", current_score=50)
    delta_used = compute_fluency_delta(event_type="suggestion_used", current_score=50)
    assert delta_understood >= delta_used

def test_score_cannot_exceed_100():
    delta = compute_fluency_delta(event_type="suggestion_used", current_score=99)
    assert 99 + delta <= 100
```

- [ ] **Step 2: Run to verify it fails**

```bash
python -m pytest tests/unit/services/feedback-learner/test_processors.py -v 2>&1 | head -10
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Create `src/services/feedback-learner/requirements.txt`**

```
aiokafka==0.10.0
asyncpg==0.29.0
pydantic==2.7.0
```

- [ ] **Step 4: Create `src/services/feedback-learner/app/processors/fluency.py`**

```python
_SCORE_DELTAS: dict[str, int] = {
    "annotation_viewed": 1,
    "suggestion_used": 3,
    "suggestion_dismissed": 0,
    "pattern_understood": 5,
    "coaching_panel_opened": 2,
    "pre_send_flag_viewed": 1,
    "pre_send_original_sent": 0,
    "pre_send_suggestion_used": 3,
}


def compute_fluency_delta(event_type: str, current_score: int) -> int:
    """Return how much the fluency score should increase for this event."""
    delta = _SCORE_DELTAS.get(event_type, 0)
    # Cap at 100
    return min(delta, 100 - current_score)
```

- [ ] **Step 5: Create `src/services/feedback-learner/app/processors/case_library.py`**

```python
from python_shared.types import AnnotationResult


def build_case_record(
    tenant_id: str,
    source_lang: str,
    target_lang: str,
    result: AnnotationResult,
    suggestion_used: bool | None,
) -> dict:
    """Build an anonymised case library record from an annotation event."""
    return {
        "tenant_id": tenant_id,
        "source_language": source_lang,
        "target_language": target_lang,
        "register": result.register.value,
        "intent_label": result.intent_label,
        "risk_categories": [result.risk_category] if result.risk_category else [],
        "suggestion_offered": len(result.suggestions) > 0,
        "suggestion_used": suggestion_used,
    }
```

- [ ] **Step 6: Create `src/services/feedback-learner/app/consumers/annotation_consumer.py`**

```python
from python_shared.kafka import get_consumer


async def consume_annotation_events(handler) -> None:
    """Consume annotation.created events and pass each to handler."""
    consumer = await get_consumer("annotation.created", group_id="feedback-learner")
    try:
        async for msg in consumer:
            await handler(msg.value)
    finally:
        await consumer.stop()
```

- [ ] **Step 7: Create `src/services/feedback-learner/app/main.py`**

```python
import sys, os, asyncio
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from app.consumers.annotation_consumer import consume_annotation_events
from app.processors.case_library import build_case_record


async def handle_annotation_event(event: dict) -> None:
    print(f"[feedback-learner] received event: {event.get('message_id')}")
    # DB write will be implemented when DB integration task is added


async def main() -> None:
    print("[feedback-learner] starting...")
    await consume_annotation_events(handle_annotation_event)


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd code
python -m pytest tests/unit/services/feedback-learner/test_processors.py -v
```

Expected: `3 passed`

- [ ] **Step 9: Create `src/services/feedback-learner/Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ../../python_shared /app/python_shared
COPY app ./app
ENV PYTHONPATH=/app
CMD ["python", "app/main.py"]
```

- [ ] **Step 10: Commit**

```bash
cd code
git add src/services/feedback-learner tests/unit/services/feedback-learner
git commit -m "feat: scaffold feedback-learner with Kafka consumer and fluency/case processors"
```

---

## Task 9: Dashboard Scaffold

**Files:**
- Create: `code/src/web/dashboard/package.json`
- Create: `code/src/web/dashboard/tsconfig.json`
- Create: `code/src/web/dashboard/vite.config.ts`
- Create: `code/src/web/dashboard/index.html`
- Create: `code/src/web/dashboard/src/main.tsx`
- Create: `code/src/web/dashboard/src/App.tsx`
- Create: `code/src/web/dashboard/src/pages/TeamView.tsx`
- Create: `code/src/web/dashboard/src/pages/PersonalView.tsx`
- Create: `code/src/web/dashboard/src/pages/PublicView.tsx`
- Create: `code/src/web/dashboard/Dockerfile`
- Test: `code/tests/unit/web/dashboard/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `code/tests/unit/web/dashboard/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../../src/web/dashboard/src/App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(document.body).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code/src/web/dashboard && npx vitest run ../../../../tests/unit/web/dashboard/App.test.tsx 2>&1 | head -10
```

Expected: `Cannot find module` error.

- [ ] **Step 3: Create `src/web/dashboard/package.json`**

```json
{
  "name": "@kokoro/dashboard",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@kokoro/shared": "*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 4: Create `src/web/dashboard/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `src/web/dashboard/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
  server: { port: 5173 },
});
```

- [ ] **Step 6: Create `src/web/dashboard/src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Create page components**

Create `src/web/dashboard/src/pages/TeamView.tsx`:
```tsx
export function TeamView() {
  return <main><h1>Team Fluency Dashboard</h1></main>;
}
```

Create `src/web/dashboard/src/pages/PersonalView.tsx`:
```tsx
export function PersonalView() {
  return <main><h1>My Fluency</h1></main>;
}
```

Create `src/web/dashboard/src/pages/PublicView.tsx`:
```tsx
export function PublicView() {
  return <main><h1>Kokoro Pilot — Results</h1></main>;
}
```

- [ ] **Step 8: Create `src/web/dashboard/src/App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';
import { TeamView } from './pages/TeamView';
import { PersonalView } from './pages/PersonalView';
import { PublicView } from './pages/PublicView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TeamView />} />
      <Route path="/me" element={<PersonalView />} />
      <Route path="/public" element={<PublicView />} />
    </Routes>
  );
}
```

- [ ] **Step 9: Create `src/web/dashboard/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 10: Create `src/web/dashboard/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kokoro Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 11: Create placeholder files**

```bash
touch code/src/web/dashboard/src/components/.gitkeep
touch code/src/web/dashboard/src/hooks/.gitkeep
```

- [ ] **Step 12: Run the test to verify it passes**

```bash
cd code/src/web/dashboard
npm install
npx vitest run ../../../../tests/unit/web/dashboard/App.test.tsx
```

Expected: `1 passed`

- [ ] **Step 13: Create `src/web/dashboard/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 14: Commit**

```bash
cd code
git add src/web/dashboard tests/unit/web/dashboard
git commit -m "feat: scaffold React dashboard with Team, Personal, and Public views"
```

---

## Task 10: Docker Compose — Local Dev

**Files:**
- Create: `code/docker-compose.yml`
- Create: `code/docker-compose.test.yml`

- [ ] **Step 1: Create `code/docker-compose.yml`**

```yaml
version: "3.9"

services:
  # ── Infrastructure ──────────────────────────────────────────
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: kokoro
      POSTGRES_PASSWORD: kokoro
      POSTGRES_DB: kokoro
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    depends_on: [zookeeper]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "29092:29092"

  # ── Backend Services ─────────────────────────────────────────
  api-gateway:
    build: ./src/services/api-gateway
    ports:
      - "3000:3000"
    env_file: .env
    depends_on: [postgres, redis]
    volumes:
      - ./src/services/api-gateway/src:/app/src

  slack-app:
    build: ./src/services/slack-app
    env_file: .env
    depends_on: [api-gateway]
    volumes:
      - ./src/services/slack-app/src:/app/src

  annotation-pipeline:
    build: ./src/services/annotation-pipeline
    ports:
      - "8001:8001"
    env_file: .env
    depends_on: [postgres, kafka, llm-gateway]
    volumes:
      - ./src/services/annotation-pipeline/app:/app/app
      - ./src/services/python_shared:/app/python_shared

  llm-gateway:
    build: ./src/services/llm-gateway
    ports:
      - "8002:8002"
    env_file: .env
    volumes:
      - ./src/services/llm-gateway/app:/app/app
      - ./src/services/python_shared:/app/python_shared

  feedback-learner:
    build: ./src/services/feedback-learner
    env_file: .env
    depends_on: [kafka, postgres]
    volumes:
      - ./src/services/feedback-learner/app:/app/app
      - ./src/services/python_shared:/app/python_shared

  # ── Frontend ─────────────────────────────────────────────────
  dashboard:
    build: ./src/web/dashboard
    ports:
      - "5173:80"

volumes:
  postgres_data:
```

- [ ] **Step 2: Create `code/docker-compose.test.yml`**

```yaml
version: "3.9"

services:
  postgres-test:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: kokoro_test
      POSTGRES_PASSWORD: kokoro_test
      POSTGRES_DB: kokoro_test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data   # in-memory for fast tests
```

- [ ] **Step 3: Verify Docker Compose parses without errors**

```bash
cd code
docker compose config --quiet
```

Expected: silent success (no output, exit code 0).

- [ ] **Step 4: Smoke-test infrastructure only**

```bash
docker compose up postgres redis -d
docker compose ps
```

Expected: both containers show `running`.

```bash
docker compose down
```

- [ ] **Step 5: Commit**

```bash
cd code
git add docker-compose.yml docker-compose.test.yml
git commit -m "feat: add docker-compose for local dev and test infrastructure"
```

---

## Task 11: Tests Skeleton

**Files:**
- Create: `code/tests/integration/.gitkeep`
- Create: `code/tests/e2e/.gitkeep`
- Verify: all unit test directories exist from previous tasks

- [ ] **Step 1: Add gitkeep files for empty test folders**

```bash
touch code/tests/integration/.gitkeep
touch code/tests/e2e/.gitkeep
```

- [ ] **Step 2: Run the full test suite to verify everything passes**

```bash
cd code

# Python unit tests
python -m pytest tests/unit/services/python_shared/ \
                 tests/unit/services/annotation-pipeline/ \
                 tests/unit/services/llm-gateway/ \
                 tests/unit/services/feedback-learner/ \
                 -v

# TypeScript unit tests (slack-app, api-gateway)
npx jest tests/unit/services/slack-app/ tests/unit/services/api-gateway/ --passWithNoTests

# React unit tests
cd src/web/dashboard && npx vitest run ../../../../tests/unit/web/dashboard/
```

Expected: all tests pass. No failures.

- [ ] **Step 3: Final commit**

```bash
cd code
git add tests/
git commit -m "chore: complete scaffold — all services running, all unit tests passing"
```
