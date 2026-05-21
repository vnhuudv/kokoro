# Database Design — Kokoro Engine

**ADR references:** [ADR-001-privacy-architecture.md](../decisions/ADR-001-privacy-architecture.md)
**Linked requirements:** [system-overview.md](../requirements/system-overview.md), [engine-privacy-and-data.md](../requirements/engine-privacy-and-data.md)
**Phase:** M1–2 (design); M3–4 (implementation)
**Status:** Draft

---

## Overview

The Kokoro engine uses three data stores, each with a distinct responsibility:

| Store | Technology | Purpose |
|---|---|---|
| Primary DB | PostgreSQL + pgvector | Persistent data: users, cultural pairs, case library, surveys, audit log |
| Cache | Redis | Session state, rate limiting, short-lived LLM response cache |
| Event stream | Kafka | Async pipeline events: annotation created, suggestion used, opt-out triggered |

All personally identifiable data is encrypted at rest using per-tenant AWS KMS keys. No raw message content is stored anywhere in the database.

---

## Entity Relationship Overview

```
tenants
  │
  ├──< users (tenant_id)
  │       │
  │       ├──< fluency_events (user_id)
  │       └──< survey_responses (anonymised → tenant_id only)
  │
  ├──< audit_log (tenant_id only, no user_id)
  └──< case_library (tenant_id only, no user_id)

cultural_pairs (global — not tenant-scoped)
  │
  └──< fluency_events (pattern_id)
```

---

## Table Schemas

### `tenants`

Stores one row per organisation using the platform. The encryption key lives here.

```sql
CREATE TABLE tenants (
  tenant_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,          -- encrypted at application layer
  kms_key_id    TEXT NOT NULL,          -- AWS KMS key ARN for this tenant
  pilot_start   DATE,
  pilot_end     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### `users`

Stores one row per consenting pilot participant. Linked to their tenant. Contains fluency state and preferences — no message content.

```sql
CREATE TABLE users (
  user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
  slack_user_id   TEXT NOT NULL,          -- encrypted; used to match Slack events to user profile
  language        TEXT NOT NULL CHECK (language IN ('vi', 'ja')),
  fluency_score   SMALLINT DEFAULT 0 CHECK (fluency_score BETWEEN 0 AND 100),
  opted_in_at     TIMESTAMPTZ NOT NULL,
  opted_out_at    TIMESTAMPTZ,            -- NULL = still active
  preferences     JSONB DEFAULT '{}',     -- user settings (e.g., annotation detail level)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, slack_user_id)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_opted_out ON users(opted_out_at) WHERE opted_out_at IS NULL;
```

**Privacy note:** `slack_user_id` is encrypted at the application layer before storage. The database stores the encrypted value only.

---

### `cultural_pairs`

The cultural knowledge base — built and maintained by the cultural advisor. Global (not tenant-scoped). Powers register detection and annotation generation. Uses pgvector for semantic similarity search.

```sql
CREATE TABLE cultural_pairs (
  pair_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_language     TEXT NOT NULL CHECK (source_language IN ('vi', 'ja')),
  target_language     TEXT NOT NULL CHECK (target_language IN ('vi', 'ja')),
  register            TEXT NOT NULL CHECK (register IN ('formal', 'neutral', 'informal')),
  phrase_pattern      TEXT NOT NULL,          -- example phrase or pattern (not user data)
  intent_label        TEXT NOT NULL,          -- e.g., "Firm request", "Indirect refusal"
  risk_category       TEXT,                   -- e.g., "Face risk", "Missing acknowledgement"
  annotation_template TEXT NOT NULL,          -- template for micro-text coaching
  coaching_rationale  TEXT NOT NULL,          -- deeper "why this matters" explanation
  cultural_concept    TEXT,                   -- e.g., "Keigo", "Saving face", "Tâm"
  embedding           VECTOR(1536),           -- pgvector embedding for semantic search
  version             INTEGER NOT NULL DEFAULT 1,
  created_by          TEXT NOT NULL,          -- 'advisor' or 'system'
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cultural_pairs_lang ON cultural_pairs(source_language, target_language);
CREATE INDEX idx_cultural_pairs_register ON cultural_pairs(register);
CREATE INDEX idx_cultural_pairs_embedding ON cultural_pairs USING ivfflat (embedding vector_cosine_ops);
```

---

### `case_library`

Anonymised teaching cases generated from pilot usage. Contributes to the feedback learner and the team dashboard case count. Never contains identifiable user or message data.

```sql
CREATE TABLE case_library (
  case_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id),
  source_language     TEXT NOT NULL CHECK (source_language IN ('vi', 'ja')),
  target_language     TEXT NOT NULL CHECK (target_language IN ('vi', 'ja')),
  register            TEXT NOT NULL CHECK (register IN ('formal', 'neutral', 'informal')),
  intent_label        TEXT NOT NULL,
  risk_categories     TEXT[] DEFAULT '{}',
  suggestion_offered  BOOLEAN NOT NULL DEFAULT FALSE,
  suggestion_used     BOOLEAN,                -- NULL if no suggestion was offered
  embedding           VECTOR(1536),           -- for semantic similarity in feedback learner
  anonymised_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,   -- retention boundary; computed from pilot_end + 12 months
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_library_tenant ON case_library(tenant_id);
CREATE INDEX idx_case_library_expires ON case_library(expires_at);
CREATE INDEX idx_case_library_embedding ON case_library USING ivfflat (embedding vector_cosine_ops);
```

**Retention:** A scheduled job deletes rows where `expires_at < now()`.

---

### `fluency_events`

One row per meaningful user interaction with the engine — annotation viewed, suggestion used, pattern marked as understood. Powers the personal fluency view and the fluency trend chart.

```sql
CREATE TABLE fluency_events (
  event_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN (
                'annotation_viewed',
                'suggestion_used',
                'suggestion_dismissed',
                'pattern_understood',
                'coaching_panel_opened',
                'pre_send_flag_viewed',
                'pre_send_original_sent',
                'pre_send_suggestion_used'
              )),
  pair_id     UUID REFERENCES cultural_pairs(pair_id),  -- which pattern triggered this event
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fluency_events_user ON fluency_events(user_id, created_at DESC);
CREATE INDEX idx_fluency_events_type ON fluency_events(event_type);
```

**Privacy note:** Deleted in cascade when a user opts out (`ON DELETE CASCADE`).

---

### `survey_responses`

Weekly check-in survey responses. Linked to tenant only — not to individual users — to enforce anonymisation.

```sql
CREATE TABLE survey_responses (
  response_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(tenant_id),
  pilot_week              SMALLINT NOT NULL,              -- week number since pilot start (1–34)
  had_cross_cultural_event BOOLEAN NOT NULL,
  difficulty_score        SMALLINT CHECK (difficulty_score BETWEEN 1 AND 5),
  comment                 TEXT,                           -- optional free text; stored without name
  submitted_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_responses_tenant_week ON survey_responses(tenant_id, pilot_week);
```

---

### `audit_log`

Immutable append-only log of every pipeline action. Linked to tenant only — never to individual users. Exportable by the privacy lead.

```sql
CREATE TABLE audit_log (
  log_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
  action          TEXT NOT NULL,          -- e.g., 'annotation_generated', 'opt_out_processed'
  pipeline_stage  TEXT,                   -- e.g., 'anonymise', 'analyse', 'translate'
  provider_used   TEXT,                   -- 'claude', 'gpt', 'gemini', or NULL
  latency_ms      INTEGER,
  success         BOOLEAN NOT NULL,
  data_class      TEXT NOT NULL DEFAULT 'anonymised',
  expires_at      TIMESTAMPTZ NOT NULL,   -- 12 months post-pilot-end
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_expires ON audit_log(expires_at);
```

**Append-only:** No UPDATE or DELETE permitted on this table during the pilot. Retention deletion runs only after `expires_at`.

---

## Redis Schema (Key Conventions)

| Key pattern | Type | TTL | Purpose |
|---|---|---|---|
| `session:{user_id}` | Hash | 24h | User session state (fluency score, preferences snapshot) |
| `ratelimit:{tenant_id}:{minute}` | Counter | 60s | Per-tenant API rate limiting |
| `llm_cache:{prompt_hash}` | String | 5m | Short-lived LLM response cache for repeated phrase patterns |
| `pipeline:{message_id}` | Hash | 30s | In-flight pipeline state for a message being processed |
| `fluency:{user_id}` | Hash | 1h | Cached fluency score to avoid repeated DB reads |

---

## Kafka Topics

| Topic | Producer | Consumer | Purpose |
|---|---|---|---|
| `annotation.created` | Annotation renderer | Feedback learner, telemetry | Fired when an annotation is generated and delivered |
| `suggestion.used` | Slack app | Fluency updater, case library writer | Fired when user taps a suggestion chip |
| `pattern.understood` | Slack app | Fluency updater | Fired when user marks a pattern as understood |
| `user.opted_in` | API gateway | User provisioner | Fired when consent is received and user is activated |
| `user.opted_out` | API gateway | Data deletion job | Fired when user opts out; triggers cascade deletion |
| `survey.submitted` | Dashboard web | Survey aggregator | Fired when weekly check-in is submitted |

---

## Migrations Strategy

- All schema changes managed via numbered migration files (`001_init.sql`, `002_add_embedding.sql`, etc.)
- Migrations stored in `code/src/database/migrations/`
- Run automatically on deploy via the migration runner before the application starts
- No destructive migrations (DROP COLUMN, DROP TABLE) without an explicit data backup step first

---

## Indexing Summary

| Table | Key indexes |
|---|---|
| `users` | `tenant_id`, `opted_out_at` (partial — active users) |
| `cultural_pairs` | `(source_language, target_language)`, `register`, `embedding` (ivfflat) |
| `case_library` | `tenant_id`, `expires_at`, `embedding` (ivfflat) |
| `fluency_events` | `(user_id, created_at DESC)` |
| `survey_responses` | `(tenant_id, pilot_week)` |
| `audit_log` | `(tenant_id, created_at DESC)`, `expires_at` |

---

## Data Retention Summary

| Data | Retention policy | Deletion trigger |
|---|---|---|
| User profile + fluency events | Until opt-out or pilot end + 12 months | `user.opted_out` event or scheduled job |
| Case library | Pilot end + 12 months | Scheduled job on `expires_at` |
| Audit log | Pilot end + 12 months | Scheduled job on `expires_at` |
| Survey responses | Pilot end + 12 months | Scheduled job |
| Redis session data | TTL-based (24h max) | Automatic TTL expiry |
| Kafka events | 7-day retention | Kafka log retention policy |
