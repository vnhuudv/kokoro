# Nominication Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Nominication module — En pillar community feature that detects cross-cultural friction, nudges teams to gather, and measures whether gatherings improved communication.

**Architecture:** API Gateway owns session/attendance/nudge REST API (new `nominication` NestJS module, no auth guard — internal network isolation). Feedback-learner writes channel friction snapshots per annotation event and runs hourly nudge engine + periodic correlation job (asyncpg + asyncio, same pattern as pattern_learner). Slack-app and Google Chat app handle `/nominication` slash commands and poll every 5 minutes for pending nudges to send as ephemerals.

**Tech Stack:** NestJS + PostgreSQL direct Pool (api-gateway), asyncpg + asyncio (feedback-learner), Slack Bolt (slack-app), Express (google-chat-app)

---

## File Map

**New files:**
- `code/src/database/migrations/005_nominication.sql` — 5 new tables
- `code/src/services/api-gateway/src/modules/nominication/nominication.types.ts`
- `code/src/services/api-gateway/src/modules/nominication/nominication.service.ts`
- `code/src/services/api-gateway/src/modules/nominication/nominication.controller.ts`
- `code/src/services/api-gateway/src/modules/nominication/nominication.module.ts`
- `code/src/services/api-gateway/src/modules/dashboard/en-score.types.ts`
- `code/src/services/feedback-learner/app/processors/friction_tracker.py`
- `code/src/services/feedback-learner/app/processors/nudge_engine.py`
- `code/src/services/feedback-learner/app/processors/correlation_job.py`
- `code/src/services/slack-app/src/handlers/nominication.ts`
- `code/src/services/slack-app/src/handlers/nudge-poller.ts`
- `code/src/services/google-chat-app/src/handlers/nominication.ts`
- `code/tests/unit/services/api-gateway/nominication.service.test.ts`
- `code/tests/unit/services/slack-app/nominication-handler.test.ts`
- `code/tests/unit/services/feedback-learner/nudge_engine_test.py`

**Modified files:**
- `code/src/services/api-gateway/src/app.module.ts` — import NomicationModule
- `code/src/services/api-gateway/src/modules/dashboard/dashboard.service.ts` — add `getEnScore()`
- `code/src/services/api-gateway/src/modules/dashboard/dashboard.controller.ts` — add `GET /en-score`
- `code/src/services/api-gateway/src/modules/dashboard/dashboard.module.ts` — add DatabaseModule import
- `code/src/services/feedback-learner/app/main.py` — register friction tracker + nudge engine + correlation job
- `code/src/services/feedback-learner/app/consumers/annotation_consumer.py` — pass channel_id in event
- `code/src/services/slack-app/src/index.ts` — register `/nominication` command + nudge poller interval
- `code/src/services/google-chat-app/src/handlers/slash.ts` — add `/nominication` case
- `code/src/services/google-chat-app/src/index.ts` — start nudge poller interval
- `code/.env.example` — add new env vars

---

## Task 1: Database Migration

**Files:**
- Create: `code/src/database/migrations/005_nominication.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 005_nominication.sql
-- En pillar: Nominication module tables

-- Channel-level friction aggregates (written by feedback-learner, no PII)
CREATE TABLE channel_friction_snapshots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(tenant_id),
  channel_id TEXT NOT NULL,
  is_risky   BOOLEAN NOT NULL,  -- true when annotation had non-empty risk_categories
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfs_tenant_channel_time
  ON channel_friction_snapshots (tenant_id, channel_id, created_at DESC);

-- Nudge records (must be created before sessions because sessions FK → nudges)
CREATE TABLE nominication_nudges (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(tenant_id),
  channel_id           TEXT NOT NULL,
  target_slack_user_id TEXT NOT NULL,
  reason               TEXT NOT NULL,
  friction_score       NUMERIC(5,2),
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'sent', 'accepted', 'dismissed', 'expired')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at         TIMESTAMPTZ
);

CREATE INDEX idx_nominication_nudges_tenant_channel
  ON nominication_nudges (tenant_id, channel_id, status);
CREATE INDEX idx_nominication_nudges_target_user
  ON nominication_nudges (target_slack_user_id, status);

-- Gathering sessions
CREATE TABLE nominication_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(tenant_id),
  channel_id              TEXT NOT NULL,
  initiator_slack_user_id TEXT NOT NULL,
  beer_app_group_id       TEXT,
  trigger_type            TEXT NOT NULL CHECK (trigger_type IN ('manual', 'ai_nudged')),
  nudge_id                UUID REFERENCES nominication_nudges(id),
  scheduled_at            TIMESTAMPTZ,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  venue                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nominication_sessions_tenant_channel
  ON nominication_sessions (tenant_id, channel_id);
CREATE INDEX idx_nominication_sessions_beer_app_group
  ON nominication_sessions (beer_app_group_id)
  WHERE beer_app_group_id IS NOT NULL;

-- Attendance records
CREATE TABLE nominication_attendees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES nominication_sessions(id),
  slack_user_id TEXT NOT NULL,
  confirmed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, slack_user_id)
);

CREATE INDEX idx_nominication_attendees_session
  ON nominication_attendees (session_id);

-- Post-event friction correlations
CREATE TABLE nominication_correlations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES nominication_sessions(id),
  channel_id      TEXT NOT NULL,
  friction_before NUMERIC(5,2),
  friction_after  NUMERIC(5,2),
  delta           NUMERIC(5,2),  -- negative = friction improved after gathering
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nominication_correlations_session
  ON nominication_correlations (session_id);
```

- [ ] **Step 2: Apply migration against local Postgres**

```bash
docker compose exec postgres psql -U kokoro -d kokoro \
  -f /dev/stdin < code/src/database/migrations/005_nominication.sql
```

Expected: No errors. Each `CREATE TABLE` / `CREATE INDEX` line completes.

- [ ] **Step 3: Verify tables exist**

```bash
docker compose exec postgres psql -U kokoro -d kokoro -c "\dt nominication_*"
```

Expected: 4 rows — `nominication_attendees`, `nominication_correlations`, `nominication_nudges`, `nominication_sessions`.

```bash
docker compose exec postgres psql -U kokoro -d kokoro -c "\dt channel_friction_snapshots"
```

Expected: 1 row.

- [ ] **Step 4: Commit**

```bash
git add code/src/database/migrations/005_nominication.sql
git commit -m "feat: add nominication module DB migration (005)"
```

---

## Task 2: Channel Friction Snapshot Writer

**Context:** The feedback-learner's `handle_annotation_event` in `main.py` receives each annotation event from Kafka. The event dict contains message metadata. We need to write one `channel_friction_snapshots` row per annotation so the nudge engine has friction data to query. The feedback-learner uses `asyncpg` directly (same as `pattern_learner.py`).

**Files:**
- Create: `code/src/services/feedback-learner/app/processors/friction_tracker.py`
- Modify: `code/src/services/feedback-learner/app/main.py`

- [ ] **Step 1: Write the failing test**

Create `code/tests/unit/services/feedback-learner/friction_tracker_test.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

pytestmark = pytest.mark.asyncio


async def test_record_channel_friction_inserts_row():
    mock_conn = AsyncMock()
    with patch("asyncpg.connect", return_value=mock_conn):
        from app.processors.friction_tracker import record_channel_friction
        await record_channel_friction(
            channel_id="C001",
            tenant_id="a0000000-0000-0000-0000-000000000001",
            is_risky=True,
        )
    mock_conn.execute.assert_awaited_once()
    call_args = mock_conn.execute.call_args[0]
    assert "channel_friction_snapshots" in call_args[0]
    assert call_args[1] == "a0000000-0000-0000-0000-000000000001"
    assert call_args[2] == "C001"
    assert call_args[3] is True
    mock_conn.close.assert_awaited_once()


async def test_record_channel_friction_closes_on_error():
    mock_conn = AsyncMock()
    mock_conn.execute.side_effect = Exception("db error")
    with patch("asyncpg.connect", return_value=mock_conn):
        from app.processors.friction_tracker import record_channel_friction
        with pytest.raises(Exception, match="db error"):
            await record_channel_friction("C001", "tenant-1", False)
    mock_conn.close.assert_awaited_once()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd code && python -m pytest tests/unit/services/feedback-learner/friction_tracker_test.py -v
```

Expected: `ImportError` — `friction_tracker` module not found.

- [ ] **Step 3: Implement friction_tracker.py**

```python
# code/src/services/feedback-learner/app/processors/friction_tracker.py
import os
import asyncpg
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kokoro:kokoro@postgres:5432/kokoro")


async def record_channel_friction(channel_id: str, tenant_id: str, is_risky: bool) -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(
            """INSERT INTO channel_friction_snapshots (tenant_id, channel_id, is_risky)
               VALUES ($1, $2, $3)""",
            tenant_id, channel_id, is_risky,
        )
    finally:
        await conn.close()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd code && python -m pytest tests/unit/services/feedback-learner/friction_tracker_test.py -v
```

Expected: 2 PASSED.

- [ ] **Step 5: Wire into main.py**

In `code/src/services/feedback-learner/app/main.py`, update `handle_annotation_event`:

```python
from app.processors.friction_tracker import record_channel_friction

TENANT_ID = os.environ.get("SLACK_TENANT_ID", "a0000000-0000-0000-0000-000000000001")


async def handle_annotation_event(event: dict) -> None:
    logger.info("[feedback-learner] annotation event: %s", event.get("message_id"))
    channel_id = event.get("channel_id")
    is_risky = bool(event.get("risk_categories"))
    if channel_id:
        try:
            await record_channel_friction(channel_id, TENANT_ID, is_risky)
        except Exception as exc:
            logger.warning("[friction-tracker] failed to record: %s", exc)
```

- [ ] **Step 6: Commit**

```bash
git add code/src/services/feedback-learner/app/processors/friction_tracker.py \
        code/src/services/feedback-learner/app/main.py \
        code/tests/unit/services/feedback-learner/friction_tracker_test.py
git commit -m "feat: record channel friction snapshots in feedback-learner"
```

---

## Task 3: Nominication Module Scaffold

**Context:** API Gateway uses NestJS modules. Each module has: `types.ts`, `service.ts` (business logic + DB), `controller.ts` (HTTP routes), `module.ts` (wires them together). The service injects `DB_POOL` from `DatabaseModule` — see `dashboard.service.ts` for the exact pattern. Controllers have no auth guard (internal network, same as `users.controller.ts`).

**Files:**
- Create: `code/src/services/api-gateway/src/modules/nominication/nominication.types.ts`
- Create: `code/src/services/api-gateway/src/modules/nominication/nominication.module.ts`
- Create (stub): `code/src/services/api-gateway/src/modules/nominication/nominication.service.ts`
- Create (stub): `code/src/services/api-gateway/src/modules/nominication/nominication.controller.ts`

- [ ] **Step 1: Create types file**

```typescript
// code/src/services/api-gateway/src/modules/nominication/nominication.types.ts

export type TriggerType = 'manual' | 'ai_nudged';
export type SessionStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type NudgeStatus = 'pending' | 'sent' | 'accepted' | 'dismissed' | 'expired';

export interface CreateSessionDto {
  channelId: string;
  scheduledAt?: string;    // ISO date string
  venue?: string;
  beerAppGroupId?: string;
  triggerType?: TriggerType;
  nudgeId?: string;
}

export interface NomicationSession {
  id: string;
  tenantId: string;
  channelId: string;
  initiatorSlackUserId: string;
  beerAppGroupId?: string;
  triggerType: TriggerType;
  nudgeId?: string;
  scheduledAt?: Date;
  status: SessionStatus;
  venue?: string;
  createdAt: Date;
}

export interface NomicationNudge {
  id: string;
  tenantId: string;
  channelId: string;
  targetSlackUserId: string;
  reason: string;
  frictionScore?: number;
  status: NudgeStatus;
  createdAt: Date;
  respondedAt?: Date;
}
```

- [ ] **Step 2: Create stub service**

```typescript
// code/src/services/api-gateway/src/modules/nominication/nominication.service.ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import type { CreateSessionDto, NomicationSession, NomicationNudge } from './nominication.types';

@Injectable()
export class NomicationService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async createSession(_tenantId: string, _initiatorSlackUserId: string, _dto: CreateSessionDto): Promise<NomicationSession> {
    throw new Error('not implemented');
  }

  async getSession(_id: string, _tenantId: string): Promise<NomicationSession> {
    throw new Error('not implemented');
  }

  async markAttendance(_sessionId: string, _tenantId: string, _slackUserId: string): Promise<void> {
    throw new Error('not implemented');
  }

  async getPendingNudges(_tenantId: string): Promise<NomicationNudge[]> {
    throw new Error('not implemented');
  }

  async updateNudgeStatus(_id: string, _tenantId: string, _status: string): Promise<void> {
    throw new Error('not implemented');
  }
}
```

- [ ] **Step 3: Create stub controller**

```typescript
// code/src/services/api-gateway/src/modules/nominication/nominication.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Query, Logger } from '@nestjs/common';
import { NomicationService } from './nominication.service';
import type { CreateSessionDto } from './nominication.types';

@Controller('nominication')
export class NomicationController {
  private readonly logger = new Logger(NomicationController.name);
  constructor(private readonly service: NomicationService) {}

  @Get('health')
  health() { return { status: 'ok' }; }
}
```

- [ ] **Step 4: Create module file**

```typescript
// code/src/services/api-gateway/src/modules/nominication/nominication.module.ts
import { Module } from '@nestjs/common';
import { NomicationController } from './nominication.controller';
import { NomicationService } from './nominication.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NomicationController],
  providers: [NomicationService],
})
export class NomicationModule {}
```

- [ ] **Step 5: Register in app.module.ts**

Open `code/src/services/api-gateway/src/app.module.ts`. Add the import and module:

```typescript
import { NomicationModule } from './modules/nominication/nominication.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AnnotationsModule,
    DashboardModule,
    InochiModule,
    NomicationModule,   // ← add this line
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd code/src/services/api-gateway && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add code/src/services/api-gateway/src/modules/nominication/ \
        code/src/services/api-gateway/src/app.module.ts
git commit -m "feat: add nominication module scaffold (stub)"
```

---

## Task 4: Sessions API — POST /sessions and GET /sessions/:id

**Files:**
- Modify: `code/src/services/api-gateway/src/modules/nominication/nominication.service.ts`
- Modify: `code/src/services/api-gateway/src/modules/nominication/nominication.controller.ts`
- Create: `code/tests/unit/services/api-gateway/nominication.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// code/tests/unit/services/api-gateway/nominication.service.test.ts
import { NomicationService } from '../../../../src/services/api-gateway/src/modules/nominication/nominication.service';

const mockPool = {
  query: jest.fn(),
};

describe('NomicationService', () => {
  let service: NomicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NomicationService(mockPool as any);
  });

  describe('createSession', () => {
    it('inserts session and returns it', async () => {
      const session = {
        id: 'sess-1',
        tenantId: 'tenant-1',
        channelId: 'C001',
        initiatorSlackUserId: 'U001',
        beerAppGroupId: null,
        triggerType: 'manual',
        nudgeId: null,
        scheduledAt: null,
        status: 'pending',
        venue: null,
        createdAt: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [session] });

      const result = await service.createSession('tenant-1', 'U001', { channelId: 'C001' });

      expect(result).toEqual(session);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nominication_sessions'),
        expect.arrayContaining(['tenant-1', 'C001', 'U001']),
      );
    });
  });

  describe('getSession', () => {
    it('returns session for matching tenant', async () => {
      const session = { id: 'sess-1', tenantId: 'tenant-1', status: 'pending' };
      mockPool.query.mockResolvedValueOnce({ rows: [session] });

      const result = await service.getSession('sess-1', 'tenant-1');
      expect(result).toEqual(session);
    });

    it('throws NotFoundException when session not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(service.getSession('bad-id', 'tenant-1')).rejects.toThrow('Session not found');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd code && npx jest tests/unit/services/api-gateway/nominication.service.test.ts --no-coverage
```

Expected: FAIL — `createSession` throws "not implemented".

- [ ] **Step 3: Implement createSession and getSession in service**

Replace the stub methods in `nominication.service.ts`:

```typescript
async createSession(tenantId: string, initiatorSlackUserId: string, dto: CreateSessionDto): Promise<NomicationSession> {
  const { rows } = await this.pool.query<NomicationSession>(
    `INSERT INTO nominication_sessions
       (tenant_id, channel_id, initiator_slack_user_id, beer_app_group_id,
        trigger_type, nudge_id, scheduled_at, venue)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING
       id,
       tenant_id               AS "tenantId",
       channel_id              AS "channelId",
       initiator_slack_user_id AS "initiatorSlackUserId",
       beer_app_group_id       AS "beerAppGroupId",
       trigger_type            AS "triggerType",
       nudge_id                AS "nudgeId",
       scheduled_at            AS "scheduledAt",
       status,
       venue,
       created_at              AS "createdAt"`,
    [
      tenantId,
      dto.channelId,
      initiatorSlackUserId,
      dto.beerAppGroupId ?? null,
      dto.triggerType ?? 'manual',
      dto.nudgeId ?? null,
      dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      dto.venue ?? null,
    ],
  );
  return rows[0];
}

async getSession(id: string, tenantId: string): Promise<NomicationSession> {
  const { rows } = await this.pool.query<NomicationSession>(
    `SELECT
       id,
       tenant_id               AS "tenantId",
       channel_id              AS "channelId",
       initiator_slack_user_id AS "initiatorSlackUserId",
       beer_app_group_id       AS "beerAppGroupId",
       trigger_type            AS "triggerType",
       nudge_id                AS "nudgeId",
       scheduled_at            AS "scheduledAt",
       status,
       venue,
       created_at              AS "createdAt"
     FROM nominication_sessions
     WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  if (rows.length === 0) throw new NotFoundException('Session not found');
  return rows[0];
}
```

- [ ] **Step 4: Add routes to controller**

Replace the stub controller body:

```typescript
@Controller('nominication')
export class NomicationController {
  private readonly logger = new Logger(NomicationController.name);
  constructor(private readonly service: NomicationService) {}

  @Get('health')
  health() { return { status: 'ok' }; }

  @Post('sessions')
  async createSession(
    @Query('tenantId') tenantId: string,
    @Query('slackUserId') slackUserId: string,
    @Body() dto: CreateSessionDto,
  ) {
    const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
    return this.service.createSession(tenant, slackUserId, dto);
  }

  @Get('sessions/:id')
  async getSession(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
    return this.service.getSession(id, tenant);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd code && npx jest tests/unit/services/api-gateway/nominication.service.test.ts --no-coverage
```

Expected: 3 PASSED.

- [ ] **Step 6: Commit**

```bash
git add code/src/services/api-gateway/src/modules/nominication/ \
        code/tests/unit/services/api-gateway/nominication.service.test.ts
git commit -m "feat: add nominication sessions API (POST + GET)"
```

---

## Task 5: Attendance API — POST /sessions/:id/attend

**Files:**
- Modify: `code/src/services/api-gateway/src/modules/nominication/nominication.service.ts`
- Modify: `code/src/services/api-gateway/src/modules/nominication/nominication.controller.ts`
- Modify: `code/tests/unit/services/api-gateway/nominication.service.test.ts`

- [ ] **Step 1: Add failing tests**

Add to the `describe` block in `nominication.service.test.ts`:

```typescript
describe('markAttendance', () => {
  it('inserts attendee record', async () => {
    // verify session exists
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'sess-1' }] });
    // insert attendee (ON CONFLICT DO NOTHING)
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    // tryCompleteSession update
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await service.markAttendance('sess-1', 'tenant-1', 'U002');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO nominication_attendees'),
      expect.arrayContaining(['sess-1', 'U002']),
    );
  });

  it('throws NotFoundException when session not in tenant', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    await expect(service.markAttendance('bad-id', 'tenant-1', 'U002')).rejects.toThrow('Session not found');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd code && npx jest tests/unit/services/api-gateway/nominication.service.test.ts --no-coverage
```

Expected: 2 new tests FAIL — `markAttendance` throws "not implemented".

- [ ] **Step 3: Implement markAttendance in service**

Replace the stub `markAttendance` method:

```typescript
async markAttendance(sessionId: string, tenantId: string, slackUserId: string): Promise<void> {
  const { rows } = await this.pool.query<{ id: string }>(
    `SELECT id FROM nominication_sessions WHERE id = $1 AND tenant_id = $2`,
    [sessionId, tenantId],
  );
  if (rows.length === 0) throw new NotFoundException('Session not found');

  await this.pool.query(
    `INSERT INTO nominication_attendees (session_id, slack_user_id)
     VALUES ($1, $2)
     ON CONFLICT (session_id, slack_user_id) DO NOTHING`,
    [sessionId, slackUserId],
  );

  await this.pool.query(
    `UPDATE nominication_sessions
     SET status = 'completed'
     WHERE id = $1
       AND status = 'pending'
       AND scheduled_at < NOW() - INTERVAL '24 hours'`,
    [sessionId],
  );
}
```

- [ ] **Step 4: Add route to controller**

Add inside `NomicationController`:

```typescript
@Post('sessions/:id/attend')
async markAttendance(
  @Param('id') id: string,
  @Query('tenantId') tenantId: string,
  @Body('slackUserId') slackUserId: string,
) {
  const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
  await this.service.markAttendance(id, tenant, slackUserId);
  return { ok: true };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd code && npx jest tests/unit/services/api-gateway/nominication.service.test.ts --no-coverage
```

Expected: All 5 tests PASSED.

- [ ] **Step 6: Commit**

```bash
git add code/src/services/api-gateway/src/modules/nominication/ \
        code/tests/unit/services/api-gateway/nominication.service.test.ts
git commit -m "feat: add nominication attendance API"
```

---

## Task 6: Nudges API — GET pending, PATCH status

**Files:**
- Modify: `code/src/services/api-gateway/src/modules/nominication/nominication.service.ts`
- Modify: `code/src/services/api-gateway/src/modules/nominication/nominication.controller.ts`
- Modify: `code/tests/unit/services/api-gateway/nominication.service.test.ts`

- [ ] **Step 1: Add failing tests**

Add to `nominication.service.test.ts`:

```typescript
describe('getPendingNudges', () => {
  it('returns nudges with status pending or sent', async () => {
    const nudges = [{ id: 'n-1', status: 'pending', targetSlackUserId: 'U001', channelId: 'C001' }];
    mockPool.query.mockResolvedValueOnce({ rows: nudges });

    const result = await service.getPendingNudges('tenant-1');

    expect(result).toEqual(nudges);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("status IN ('pending')"),
      ['tenant-1'],
    );
  });
});

describe('updateNudgeStatus', () => {
  it('updates nudge status and responded_at', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await service.updateNudgeStatus('n-1', 'tenant-1', 'sent');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE nominication_nudges'),
      expect.arrayContaining(['sent', 'n-1', 'tenant-1']),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd code && npx jest tests/unit/services/api-gateway/nominication.service.test.ts --no-coverage
```

Expected: 2 new tests FAIL.

- [ ] **Step 3: Implement getPendingNudges and updateNudgeStatus**

Replace stub methods:

```typescript
async getPendingNudges(tenantId: string): Promise<NomicationNudge[]> {
  const { rows } = await this.pool.query<NomicationNudge>(
    `SELECT
       id,
       tenant_id               AS "tenantId",
       channel_id              AS "channelId",
       target_slack_user_id    AS "targetSlackUserId",
       reason,
       friction_score          AS "frictionScore",
       status,
       created_at              AS "createdAt",
       responded_at            AS "respondedAt"
     FROM nominication_nudges
     WHERE tenant_id = $1
       AND status IN ('pending')
     ORDER BY created_at ASC`,
    [tenantId],
  );
  return rows;
}

async updateNudgeStatus(id: string, tenantId: string, status: string): Promise<void> {
  await this.pool.query(
    `UPDATE nominication_nudges
     SET status = $1,
         responded_at = CASE WHEN $1 IN ('accepted', 'dismissed', 'expired') THEN NOW() ELSE responded_at END
     WHERE id = $2 AND tenant_id = $3`,
    [status, id, tenantId],
  );
}
```

- [ ] **Step 4: Add routes to controller**

Add inside `NomicationController`:

```typescript
@Get('nudges/pending')
async getPendingNudges(@Query('tenantId') tenantId: string) {
  const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
  return this.service.getPendingNudges(tenant);
}

@Patch('nudges/:id')
async updateNudgeStatus(
  @Param('id') id: string,
  @Query('tenantId') tenantId: string,
  @Body('status') status: string,
) {
  const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
  await this.service.updateNudgeStatus(id, tenant, status);
  return { ok: true };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd code && npx jest tests/unit/services/api-gateway/nominication.service.test.ts --no-coverage
```

Expected: All 7 tests PASSED.

- [ ] **Step 6: Compile check**

```bash
cd code/src/services/api-gateway && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add code/src/services/api-gateway/src/modules/nominication/ \
        code/tests/unit/services/api-gateway/nominication.service.test.ts
git commit -m "feat: add nominication nudges API (GET pending, PATCH status)"
```

---

## Task 7: Beer App Auth Bridge — POST /auth/beer-token

**Context:** Beer App users authenticate with Supabase and have a Slack user ID. They call `POST /auth/beer-token { slackUserId }` to get a short-lived JWT (15 min) that they use for all API Gateway calls. The `AuthService` already has the Pool and JwtService injected — add one method and one controller route.

**Files:**
- Modify: `code/src/services/api-gateway/src/modules/auth/auth.service.ts`
- Modify: `code/src/services/api-gateway/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Add issueBeerToken to AuthService**

Open `auth.service.ts`. Add this method (after `exchangeCodeForJwt`):

```typescript
async issueBeerToken(slackUserId: string): Promise<string> {
  const { rows } = await this.pool.query<{ user_id: string; tenant_id: string }>(
    `SELECT user_id, tenant_id FROM users
     WHERE slack_user_id = $1 AND opted_out_at IS NULL
     LIMIT 1`,
    [slackUserId],
  );
  if (rows.length === 0) {
    this.logger.warn('Beer token request: no active user for Slack ID %s', slackUserId);
    throw new Error('User not authorized');
  }
  const payload: AuthUser = {
    user_id:       rows[0].user_id,
    tenant_id:     rows[0].tenant_id,
    slack_user_id: slackUserId,
  };
  return this.jwtService.sign(payload, { expiresIn: '15m' });
}
```

- [ ] **Step 2: Add controller route**

Open `auth.controller.ts`. Add (after the `slackCallback` method):

```typescript
@Post('beer-token')
async beerToken(@Body() body: { slackUserId: string }, @Res() res: Response) {
  try {
    const token = await this.authService.issueBeerToken(body.slackUserId);
    res.json({ token });
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
```

Add `Post` and `Body` to the `@nestjs/common` import at the top of `auth.controller.ts`.

- [ ] **Step 3: Compile check**

```bash
cd code/src/services/api-gateway && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add code/src/services/api-gateway/src/modules/auth/auth.service.ts \
        code/src/services/api-gateway/src/modules/auth/auth.controller.ts
git commit -m "feat: add beer-token auth bridge for Beer App integration"
```

---

## Task 8: Nudge Engine (Python hourly cron)

**Context:** The nudge engine runs hourly. It queries `channel_friction_snapshots` for channels with friction rate ≥ 60% over 7 days, checks no nudge was sent in last 14 days, picks a random opted-in user in that tenant, and writes a `nominication_nudges` row. Follows the exact same async/asyncpg pattern as `pattern_learner.py` — `run_periodically(interval_seconds)` wraps the core function.

**Files:**
- Create: `code/src/services/feedback-learner/app/processors/nudge_engine.py`
- Create: `code/tests/unit/services/feedback-learner/nudge_engine_test.py`

- [ ] **Step 1: Write the failing tests**

```python
# code/tests/unit/services/feedback-learner/nudge_engine_test.py
import pytest
from unittest.mock import AsyncMock, patch, call
from datetime import datetime, timezone

pytestmark = pytest.mark.asyncio


async def test_run_nudge_engine_creates_nudge_for_high_friction_channel():
    mock_conn = AsyncMock()
    # High-friction channel result
    mock_conn.fetch.side_effect = [
        # High-friction channels query
        [{"tenant_id": "t-1", "channel_id": "C001", "event_count": 10, "friction_rate": 0.7}],
        # _find_target_user query
        [{"user_id": "u-uuid-1", "slack_user_id": "U001"}],
    ]
    mock_conn.execute = AsyncMock()

    with patch("asyncpg.connect", return_value=mock_conn):
        from app.processors.nudge_engine import run_nudge_engine
        await run_nudge_engine()

    mock_conn.execute.assert_awaited_once()
    call_sql = mock_conn.execute.call_args[0][0]
    assert "INSERT INTO nominication_nudges" in call_sql


async def test_run_nudge_engine_skips_low_friction_channel():
    mock_conn = AsyncMock()
    mock_conn.fetch.side_effect = [
        [],  # No high-friction channels returned
    ]
    mock_conn.execute = AsyncMock()

    with patch("asyncpg.connect", return_value=mock_conn):
        from app.processors.nudge_engine import run_nudge_engine
        await run_nudge_engine()

    mock_conn.execute.assert_not_awaited()


async def test_run_nudge_engine_skips_when_no_user_found():
    mock_conn = AsyncMock()
    mock_conn.fetch.side_effect = [
        [{"tenant_id": "t-1", "channel_id": "C001", "event_count": 5, "friction_rate": 0.8}],
        [],  # No user found
    ]
    mock_conn.execute = AsyncMock()

    with patch("asyncpg.connect", return_value=mock_conn):
        from app.processors.nudge_engine import run_nudge_engine
        await run_nudge_engine()

    mock_conn.execute.assert_not_awaited()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd code && python -m pytest tests/unit/services/feedback-learner/nudge_engine_test.py -v
```

Expected: `ImportError` — module not found.

- [ ] **Step 3: Implement nudge_engine.py**

```python
# code/src/services/feedback-learner/app/processors/nudge_engine.py
import os
import asyncio
import asyncpg
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kokoro:kokoro@postgres:5432/kokoro")
FRICTION_THRESHOLD = float(os.environ.get("NUDGE_FRICTION_THRESHOLD", "0.6"))
FRICTION_WINDOW_DAYS = int(os.environ.get("NUDGE_FRICTION_WINDOW_DAYS", "7"))
NUDGE_COOLDOWN_DAYS = int(os.environ.get("NUDGE_COOLDOWN_DAYS", "14"))
MIN_EVENTS = int(os.environ.get("NUDGE_MIN_EVENTS", "3"))


async def run_nudge_engine() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(days=FRICTION_WINDOW_DAYS)
        cooldown_start = now - timedelta(days=NUDGE_COOLDOWN_DAYS)

        rows = await conn.fetch(
            """
            SELECT cfs.tenant_id, cfs.channel_id,
                   COUNT(*) AS event_count,
                   AVG(CASE WHEN cfs.is_risky THEN 1.0 ELSE 0.0 END) AS friction_rate
            FROM channel_friction_snapshots cfs
            WHERE cfs.created_at > $1
              AND NOT EXISTS (
                SELECT 1 FROM nominication_nudges nn
                WHERE nn.tenant_id = cfs.tenant_id
                  AND nn.channel_id = cfs.channel_id
                  AND nn.created_at > $2
                  AND nn.status != 'dismissed'
              )
            GROUP BY cfs.tenant_id, cfs.channel_id
            HAVING COUNT(*) >= $3
               AND AVG(CASE WHEN cfs.is_risky THEN 1.0 ELSE 0.0 END) >= $4
            """,
            window_start, cooldown_start, MIN_EVENTS, FRICTION_THRESHOLD,
        )

        for row in rows:
            target = await _find_target_user(conn, str(row["tenant_id"]))
            if not target:
                logger.warning("[nudge-engine] no opted-in user for tenant %s", row["tenant_id"])
                continue

            friction_pct = round(float(row["friction_rate"]) * 100, 2)
            reason = (
                f"Kokoro noticed {int(friction_pct)}% cross-cultural friction "
                f"in this channel over the past {FRICTION_WINDOW_DAYS} days"
            )
            await conn.execute(
                """INSERT INTO nominication_nudges
                   (tenant_id, channel_id, target_slack_user_id, reason, friction_score)
                   VALUES ($1, $2, $3, $4, $5)""",
                row["tenant_id"], row["channel_id"], target["slack_user_id"],
                reason, friction_pct,
            )
            logger.info("[nudge-engine] nudge created for channel %s", row["channel_id"])

    finally:
        await conn.close()


async def _find_target_user(conn, tenant_id: str) -> dict | None:
    rows = await conn.fetch(
        """SELECT user_id, slack_user_id FROM users
           WHERE tenant_id = $1::uuid AND opted_out_at IS NULL
           ORDER BY RANDOM() LIMIT 1""",
        tenant_id,
    )
    return dict(rows[0]) if rows else None


async def run_periodically(interval_seconds: int = 3600) -> None:
    while True:
        logger.info("[nudge-engine] starting scan…")
        try:
            await run_nudge_engine()
            logger.info("[nudge-engine] scan complete")
        except Exception as exc:
            logger.error("[nudge-engine] scan failed: %s", exc)
        await asyncio.sleep(interval_seconds)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd code && python -m pytest tests/unit/services/feedback-learner/nudge_engine_test.py -v
```

Expected: 3 PASSED.

- [ ] **Step 5: Commit**

```bash
git add code/src/services/feedback-learner/app/processors/nudge_engine.py \
        code/tests/unit/services/feedback-learner/nudge_engine_test.py
git commit -m "feat: add nudge engine (hourly friction-triggered nudge creation)"
```

---

## Task 9: Correlation Job (Python periodic scan)

**Context:** Runs every 1800 seconds alongside `run_pattern_learning`. Finds `nominication_sessions` with `status = 'completed'` and `created_at < 14 days ago` that have no correlation record yet. Computes `friction_before` and `friction_after` from `channel_friction_snapshots` and writes to `nominication_correlations`.

**Files:**
- Create: `code/src/services/feedback-learner/app/processors/correlation_job.py`

- [ ] **Step 1: Implement correlation_job.py**

```python
# code/src/services/feedback-learner/app/processors/correlation_job.py
import os
import asyncio
import asyncpg
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kokoro:kokoro@postgres:5432/kokoro")
WINDOW_DAYS = int(os.environ.get("CORRELATION_WINDOW_DAYS", "14"))


async def run_correlation_job() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)

        sessions = await conn.fetch(
            """SELECT id, channel_id, tenant_id, created_at
               FROM nominication_sessions
               WHERE status = 'completed'
                 AND created_at < $1
                 AND NOT EXISTS (
                     SELECT 1 FROM nominication_correlations nc
                     WHERE nc.session_id = nominication_sessions.id
                 )""",
            cutoff,
        )

        for session in sessions:
            session_date = session["created_at"]
            before_start = session_date - timedelta(days=WINDOW_DAYS)
            after_end = session_date + timedelta(days=WINDOW_DAYS)

            friction_before = await _avg_friction(
                conn, str(session["tenant_id"]), session["channel_id"],
                before_start, session_date,
            )
            friction_after = await _avg_friction(
                conn, str(session["tenant_id"]), session["channel_id"],
                session_date, after_end,
            )

            if friction_before is None or friction_after is None:
                logger.info("[correlation-job] skipping session %s — insufficient data", session["id"])
                continue

            delta = friction_after - friction_before
            await conn.execute(
                """INSERT INTO nominication_correlations
                   (session_id, channel_id, friction_before, friction_after, delta)
                   VALUES ($1, $2, $3, $4, $5)""",
                session["id"], session["channel_id"],
                round(friction_before * 100, 2),
                round(friction_after * 100, 2),
                round(delta * 100, 2),
            )
            logger.info(
                "[correlation-job] session %s delta=%.1f%%",
                session["id"], delta * 100,
            )

    finally:
        await conn.close()


async def _avg_friction(conn, tenant_id: str, channel_id: str, start, end) -> float | None:
    row = await conn.fetchrow(
        """SELECT AVG(CASE WHEN is_risky THEN 1.0 ELSE 0.0 END) AS rate
           FROM channel_friction_snapshots
           WHERE tenant_id = $1::uuid
             AND channel_id = $2
             AND created_at BETWEEN $3 AND $4""",
        tenant_id, channel_id, start, end,
    )
    if row is None or row["rate"] is None:
        return None
    return float(row["rate"])


async def run_periodically(interval_seconds: int = 1800) -> None:
    while True:
        logger.info("[correlation-job] starting scan…")
        try:
            await run_correlation_job()
        except Exception as exc:
            logger.error("[correlation-job] scan failed: %s", exc)
        await asyncio.sleep(interval_seconds)
```

- [ ] **Step 2: Commit**

```bash
git add code/src/services/feedback-learner/app/processors/correlation_job.py
git commit -m "feat: add post-event friction correlation job"
```

---

## Task 10: Dashboard En Score Endpoint

**Context:** Add `GET /dashboard/en-score?userId=<slackUserId>` to the existing DashboardModule. The score is computed on-read from the four nominication tables. The DashboardModule currently has no DatabaseModule import — add it. The dashboard service already has `@Inject(DB_POOL)` in other methods, but the module import is missing.

**Files:**
- Create: `code/src/services/api-gateway/src/modules/dashboard/en-score.types.ts`
- Modify: `code/src/services/api-gateway/src/modules/dashboard/dashboard.service.ts`
- Modify: `code/src/services/api-gateway/src/modules/dashboard/dashboard.controller.ts`
- Modify: `code/src/services/api-gateway/src/modules/dashboard/dashboard.module.ts`

- [ ] **Step 1: Create en-score types**

```typescript
// code/src/services/api-gateway/src/modules/dashboard/en-score.types.ts

export interface EnScoreBreakdown {
  sessionsLast90Days: number;
  positiveCorrelations: number;
  crossCulturalRatio: number;
}

export interface EnScore {
  enScore: number;
  breakdown: EnScoreBreakdown;
  trend: 'improving' | 'stable' | 'declining';
}
```

- [ ] **Step 2: Add getEnScore to DashboardService**

Open `dashboard.service.ts`. Add import at top:

```typescript
import type { EnScore } from './en-score.types';
```

Add method at the bottom of the class:

```typescript
async getEnScore(tenantId: string, slackUserId: string): Promise<EnScore> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const { rows: sessionRows } = await this.pool.query<{
    sessions_count: string;
    positive_correlations: string;
  }>(
    `SELECT
       COUNT(DISTINCT ns.id)                                                              AS sessions_count,
       COUNT(DISTINCT nc.id) FILTER (WHERE nc.delta < -15)                               AS positive_correlations
     FROM nominication_sessions ns
     JOIN nominication_attendees na   ON na.session_id = ns.id
     LEFT JOIN nominication_correlations nc ON nc.session_id = ns.id
     WHERE ns.tenant_id = $1::uuid
       AND na.slack_user_id = $2
       AND ns.created_at > $3
       AND ns.status = 'completed'`,
    [tenantId, slackUserId, ninetyDaysAgo],
  );

  const { rows: crossRows } = await this.pool.query<{ cross_cultural_ratio: string }>(
    `SELECT
       ROUND(
         COUNT(DISTINCT na.session_id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM nominication_attendees na2
             JOIN users u2 ON u2.slack_user_id = na2.slack_user_id
             JOIN users u1 ON u1.slack_user_id = $2
             WHERE na2.session_id = na.session_id
               AND na2.slack_user_id != $2
               AND u2.language != u1.language
               AND u2.tenant_id = $1::uuid
               AND u1.tenant_id = $1::uuid
           )
         ) * 1.0 / NULLIF(COUNT(DISTINCT na.session_id), 0), 2
       ) AS cross_cultural_ratio
     FROM nominication_attendees na
     JOIN nominication_sessions ns ON ns.id = na.session_id
     WHERE na.slack_user_id = $2
       AND ns.tenant_id = $1::uuid
       AND ns.created_at > $3
       AND ns.status = 'completed'`,
    [tenantId, slackUserId, ninetyDaysAgo],
  );

  const sessions   = Number(sessionRows[0]?.sessions_count ?? 0);
  const positive   = Number(sessionRows[0]?.positive_correlations ?? 0);
  const crossRatio = Number(crossRows[0]?.cross_cultural_ratio ?? 0);

  const enScore = Math.round(
    (Math.min(sessions / 6, 1) * 40 + crossRatio * 35 + Math.min(positive / 3, 1) * 25) * 100,
  );

  return {
    enScore,
    breakdown: {
      sessionsLast90Days: sessions,
      positiveCorrelations: positive,
      crossCulturalRatio: crossRatio,
    },
    trend: 'stable',  // future: compare to previous 90-day window
  };
}
```

- [ ] **Step 3: Add route to DashboardController**

Open `dashboard.controller.ts`. Add `Query` to the `@nestjs/common` import. Add the route:

```typescript
@Get('en-score')
async getEnScore(
  @Query('userId') userId: string,
  @Query('tenantId') tenantId: string,
) {
  const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
  return this.dashboardService.getEnScore(tenant, userId);
}
```

- [ ] **Step 4: Add DatabaseModule to DashboardModule**

Open `dashboard.module.ts`. The current content is:

```typescript
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
```

Replace with:

```typescript
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

- [ ] **Step 5: Compile check**

```bash
cd code/src/services/api-gateway && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add code/src/services/api-gateway/src/modules/dashboard/
git commit -m "feat: add En pillar score endpoint (GET /dashboard/en-score)"
```

---

## Task 11: Slack /nominication Command + Nudge Poller

**Context:** The slack-app uses Slack Bolt. Commands are registered with `app.command('/nominication', ...)`. The nudge poller runs every 5 minutes using `setInterval`. Both call `http://api-gateway:3001` (same pattern as `ProfileCache.fetchMany`). No auth header needed — internal Docker network.

**Files:**
- Create: `code/src/services/slack-app/src/handlers/nominication.ts`
- Create: `code/src/services/slack-app/src/handlers/nudge-poller.ts`
- Modify: `code/src/services/slack-app/src/index.ts`
- Create: `code/tests/unit/services/slack-app/nominication-handler.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// code/tests/unit/services/slack-app/nominication-handler.test.ts
import { handleNomicationCommand } from '../../../../src/services/slack-app/src/handlers/nominication';

const mockClient = { chat: { postEphemeral: jest.fn() } };

beforeEach(() => jest.clearAllMocks());

global.fetch = jest.fn() as jest.Mock;

describe('handleNomicationCommand', () => {
  it('creates session and posts ephemeral on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'sess-1', channelId: 'C001', status: 'pending' }),
    });

    await handleNomicationCommand('C001', '', 'U001', mockClient as any);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/nominication/sessions'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockClient.chat.postEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'C001', user: 'U001' }),
    );
  });

  it('posts error ephemeral when API call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    await handleNomicationCommand('C001', '', 'U001', mockClient as any);

    expect(mockClient.chat.postEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Failed') }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd code && npx jest tests/unit/services/slack-app/nominication-handler.test.ts --no-coverage
```

Expected: `ImportError` — module not found.

- [ ] **Step 3: Implement nominication.ts handler**

```typescript
// code/src/services/slack-app/src/handlers/nominication.ts
import type { WebClient } from '@slack/web-api';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? 'http://api-gateway:3001';

export async function handleNomicationCommand(
  channelId: string,
  text: string,
  userId: string,
  client: WebClient,
): Promise<void> {
  const parts = text.trim().split(/\s+/);
  const scheduledAt = parts.length >= 2 ? tryParseDate(parts[0], parts[1]) : undefined;
  const venue = parts.length >= 3 ? parts.slice(2).join(' ') : undefined;

  const res = await fetch(`${API_GATEWAY_URL}/nominication/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelId,
      scheduledAt,
      venue,
      triggerType: 'manual',
      initiatorSlackUserId: userId,
    }),
  });

  if (!res.ok) {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: 'Failed to create Nominication. Please try again.',
    });
    return;
  }

  const session = await res.json() as { id: string };
  const dateLabel = scheduledAt ? ` for ${new Date(scheduledAt).toLocaleDateString()}` : '';
  await client.chat.postEphemeral({
    channel: channelId,
    user: userId,
    text: `Nominication created${dateLabel}.`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `✅ *Nominication created${dateLabel}!*` },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Invite team', emoji: false },
            action_id: 'nominication_invite',
            value: session.id,
          },
        ],
      },
    ],
  });
}

function tryParseDate(datePart: string, timePart: string): string | undefined {
  try {
    const d = new Date(`${datePart} ${timePart}`);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Implement nudge-poller.ts**

```typescript
// code/src/services/slack-app/src/handlers/nudge-poller.ts
import type { WebClient } from '@slack/web-api';
import { logRequest } from '../middleware/logger';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? 'http://api-gateway:3001';

interface PendingNudge {
  id: string;
  channelId: string;
  targetSlackUserId: string;
  reason: string;
}

export async function pollAndSendNudges(client: WebClient): Promise<void> {
  let nudges: PendingNudge[];
  try {
    const res = await fetch(`${API_GATEWAY_URL}/nominication/nudges/pending`);
    if (!res.ok) return;
    nudges = await res.json() as PendingNudge[];
  } catch {
    return;
  }

  for (const nudge of nudges) {
    try {
      await client.chat.postEphemeral({
        channel: nudge.channelId,
        user: nudge.targetSlackUserId,
        text: `📊 ${nudge.reason}. A team gathering might help.`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `📊 *${nudge.reason}.*\nA team gathering might help bridge the gap.` },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Start a Nominication', emoji: false },
                action_id: 'nominication_start_nudged',
                value: nudge.id,
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Dismiss', emoji: false },
                action_id: 'nominication_dismiss_nudge',
                value: nudge.id,
                style: 'danger',
              },
            ],
          },
        ],
      });
      await fetch(`${API_GATEWAY_URL}/nominication/nudges/${nudge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      logRequest('nudge.sent', { nudgeId: nudge.id, channel: nudge.channelId });
    } catch (err) {
      logRequest('nudge.send_failed', { nudgeId: nudge.id, error: String(err) });
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd code && npx jest tests/unit/services/slack-app/nominication-handler.test.ts --no-coverage
```

Expected: 2 PASSED.

- [ ] **Step 6: Register command and poller in index.ts**

Open `code/src/services/slack-app/src/index.ts`. Add imports after existing imports:

```typescript
import { handleNomicationCommand } from './handlers/nominication';
import { pollAndSendNudges } from './handlers/nudge-poller';
```

Inside `createApp()`, after the existing `app.command('/kokoro', ...)` block, add:

```typescript
// Nominication slash command
app.command('/nominication', async ({ command, ack, client }) => {
  await ack();
  await handleNomicationCommand(command.channel_id, command.text, command.user_id, client);
});
```

After the `return app;` line, add (in the exported `start()` function or in the module-level startup, wherever `app.start()` is called):

```typescript
// Nudge poller: check for pending nudges every 5 minutes
setInterval(() => {
  pollAndSendNudges(app.client).catch((err) =>
    logRequest('nudge.poller_error', { error: String(err) })
  );
}, 5 * 60 * 1000);
```

Note: `setInterval` must be called after `app.start()`. Check the bottom of `index.ts` for where `app.start()` is called and place the `setInterval` immediately after.

- [ ] **Step 7: Compile check**

```bash
cd code/src/services/slack-app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add code/src/services/slack-app/src/handlers/nominication.ts \
        code/src/services/slack-app/src/handlers/nudge-poller.ts \
        code/src/services/slack-app/src/index.ts \
        code/tests/unit/services/slack-app/nominication-handler.test.ts
git commit -m "feat: add /nominication command and nudge poller to slack-app"
```

---

## Task 12: Google Chat /nominication Command + Nudge Poller

**Context:** Google Chat app uses Express. Slash commands are handled in `handlers/slash.ts` as a switch/if on `command.commandName`. The nudge poller follows the same pattern as the Slack version (same API Gateway calls). The Google Chat cards use `cards/annotation.ts` as the model for block structure.

**Files:**
- Create: `code/src/services/google-chat-app/src/handlers/nominication.ts`
- Modify: `code/src/services/google-chat-app/src/handlers/slash.ts`
- Modify: `code/src/services/google-chat-app/src/index.ts`

- [ ] **Step 1: Implement nominication.ts for Google Chat**

```typescript
// code/src/services/google-chat-app/src/handlers/nominication.ts
import type { Response } from 'express';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? 'http://api-gateway:3001';

export async function handleNomicationCommand(
  spaceId: string,
  userId: string,
  text: string,
  res: Response,
): Promise<void> {
  const res_ = await fetch(`${API_GATEWAY_URL}/nominication/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId: spaceId, triggerType: 'manual', initiatorSlackUserId: userId }),
  });

  if (!res_.ok) {
    res.json({ text: 'Failed to create Nominication. Please try again.' });
    return;
  }

  const session = await res_.json() as { id: string };
  res.json({
    text: '✅ Nominication created!',
    cardsV2: [
      {
        cardId: 'nominication-created',
        card: {
          sections: [
            {
              widgets: [
                { textParagraph: { text: `✅ <b>Nominication created!</b>` } },
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'Invite team',
                        onClick: { action: { function: 'nominication_invite', parameters: [{ key: 'sessionId', value: session.id }] } },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  });
}

export async function pollAndSendNudgesGChat(sendMessage: (spaceId: string, userId: string, text: string) => Promise<void>): Promise<void> {
  let nudges: Array<{ id: string; channelId: string; targetSlackUserId: string; reason: string }>;
  try {
    const r = await fetch(`${API_GATEWAY_URL}/nominication/nudges/pending`);
    if (!r.ok) return;
    nudges = await r.json() as typeof nudges;
  } catch {
    return;
  }

  for (const nudge of nudges) {
    try {
      await sendMessage(nudge.channelId, nudge.targetSlackUserId,
        `📊 ${nudge.reason}. A team gathering might help bridge the gap. Reply /nominication to start one.`);
      await fetch(`${API_GATEWAY_URL}/nominication/nudges/${nudge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
    } catch {
      // best-effort
    }
  }
}
```

- [ ] **Step 2: Add /nominication case to slash.ts**

Open `code/src/services/google-chat-app/src/handlers/slash.ts`. Add import at top:

```typescript
import { handleNomicationCommand } from './nominication';
```

Inside the slash command handler, add a case for `/nominication`. The exact structure depends on what's in `slash.ts` — look for the existing command routing switch/if and add:

```typescript
case '/nominication':
  await handleNomicationCommand(
    event.space?.name ?? '',
    event.user?.name ?? '',
    event.message?.argumentText ?? '',
    res,
  );
  return;
```

- [ ] **Step 3: Add nudge poller to index.ts**

Open `code/src/services/google-chat-app/src/index.ts`. Add import:

```typescript
import { pollAndSendNudgesGChat } from './handlers/nominication';
```

After the Express server starts (after `app.listen(...)`), add:

```typescript
setInterval(() => {
  pollAndSendNudgesGChat(async (_spaceId, _userId, _text) => {
    // Google Chat DM sending requires Rooms API — log for now, implement when GChat bot token is available
    console.log('[gchat-nudge-poller] nudge pending:', _userId, _text.slice(0, 60));
  }).catch((err) => console.error('[gchat-nudge-poller] error:', err));
}, 5 * 60 * 1000);
```

Note: Full Google Chat DM delivery requires the Chat API `spaces.messages.create` call with a bot token. The poller is wired in; DM delivery should be implemented when the bot token scope is confirmed.

- [ ] **Step 4: Compile check**

```bash
cd code/src/services/google-chat-app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add code/src/services/google-chat-app/src/handlers/nominication.ts \
        code/src/services/google-chat-app/src/handlers/slash.ts \
        code/src/services/google-chat-app/src/index.ts
git commit -m "feat: add /nominication command and nudge poller to google-chat-app"
```

---

## Task 13: Wire Up Feedback-Learner + Env Vars

**Context:** Add nudge engine and correlation job to the feedback-learner's `main.py` event loop (same `asyncio.gather` pattern as `run_periodically`). Add new env vars to `.env.example`.

**Files:**
- Modify: `code/src/services/feedback-learner/app/main.py`
- Modify: `code/.env.example`

- [ ] **Step 1: Register nudge engine and correlation job in main.py**

Open `code/src/services/feedback-learner/app/main.py`. Add imports:

```python
from app.processors.nudge_engine import run_periodically as run_nudge_engine_periodically
from app.processors.correlation_job import run_periodically as run_correlation_job_periodically
```

Update `PATTERN_SCAN_INTERVAL` block and `main()`:

```python
PATTERN_SCAN_INTERVAL  = int(os.environ.get("PATTERN_SCAN_INTERVAL_SECONDS", "1800"))
NUDGE_ENGINE_INTERVAL  = int(os.environ.get("NUDGE_ENGINE_INTERVAL_SECONDS", "3600"))
CORRELATION_INTERVAL   = int(os.environ.get("CORRELATION_SCAN_INTERVAL_SECONDS", "1800"))


async def main() -> None:
    logger.info(
        "[feedback-learner] starting — pattern=%ds nudge=%ds correlation=%ds",
        PATTERN_SCAN_INTERVAL, NUDGE_ENGINE_INTERVAL, CORRELATION_INTERVAL,
    )

    await asyncio.gather(
        consume_annotation_events(handle_annotation_event),
        run_periodically(PATTERN_SCAN_INTERVAL),
        run_nudge_engine_periodically(NUDGE_ENGINE_INTERVAL),
        run_correlation_job_periodically(CORRELATION_INTERVAL),
    )
```

- [ ] **Step 2: Add new env vars to .env.example**

Open `code/.env.example`. Append:

```bash
# Nominication module
NUDGE_FRICTION_THRESHOLD=0.6
NUDGE_FRICTION_WINDOW_DAYS=7
NUDGE_COOLDOWN_DAYS=14
NUDGE_MIN_EVENTS=3
NUDGE_ENGINE_INTERVAL_SECONDS=3600
CORRELATION_WINDOW_DAYS=14
CORRELATION_SCAN_INTERVAL_SECONDS=1800
```

- [ ] **Step 3: Run full unit test suite**

```bash
cd code && npx jest tests/unit/ --no-coverage
```

Expected: All existing tests PASS, no regressions.

```bash
cd code && python -m pytest tests/unit/services/feedback-learner/ -v
```

Expected: All Python tests PASS.

- [ ] **Step 4: Commit**

```bash
git add code/src/services/feedback-learner/app/main.py \
        code/.env.example
git commit -m "feat: wire up nudge engine and correlation job in feedback-learner"
```

---

## Completion Checklist

Before declaring the implementation done, verify:

- [ ] `docker compose build` completes without errors for all modified services
- [ ] `npx jest tests/unit/ --no-coverage` — all TypeScript tests pass
- [ ] `python -m pytest tests/unit/services/feedback-learner/ -v` — all Python tests pass  
- [ ] `GET http://localhost:3000/nominication/health` returns `{ "status": "ok" }`
- [ ] `GET http://localhost:3000/dashboard/en-score?userId=U001` returns an EnScore object
- [ ] Migration 005 applied against local Postgres: all 5 tables exist
