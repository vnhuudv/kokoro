-- Kokoro — Initial Schema Migration
-- Run order: this file only; subsequent changes get 002_*.sql, 003_*.sql etc.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Tenants ──────────────────────────────────────────────────────────────────

CREATE TABLE tenants (
  tenant_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  kms_key_id  TEXT NOT NULL,
  pilot_start DATE,
  pilot_end   DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  user_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(tenant_id),
  slack_user_id TEXT NOT NULL,   -- encrypted at application layer
  language      TEXT NOT NULL CHECK (language IN ('vi', 'ja')),
  fluency_score SMALLINT NOT NULL DEFAULT 0 CHECK (fluency_score BETWEEN 0 AND 100),
  opted_in_at   TIMESTAMPTZ NOT NULL,
  opted_out_at  TIMESTAMPTZ,
  preferences   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, slack_user_id)
);

CREATE INDEX idx_users_tenant        ON users(tenant_id);
CREATE INDEX idx_users_active        ON users(opted_out_at) WHERE opted_out_at IS NULL;

-- ── Cultural Pairs ────────────────────────────────────────────────────────────

CREATE TABLE cultural_pairs (
  pair_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_language     TEXT NOT NULL CHECK (source_language IN ('vi', 'ja')),
  target_language     TEXT NOT NULL CHECK (target_language IN ('vi', 'ja')),
  register            TEXT NOT NULL CHECK (register IN ('formal', 'neutral', 'informal')),
  phrase_pattern      TEXT NOT NULL,
  intent_label        TEXT NOT NULL,
  risk_category       TEXT,
  annotation_template TEXT NOT NULL,
  coaching_rationale  TEXT NOT NULL,
  cultural_concept    TEXT,
  embedding           vector(1536),
  version             INTEGER NOT NULL DEFAULT 1,
  created_by          TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cultural_pairs_lang      ON cultural_pairs(source_language, target_language);
CREATE INDEX idx_cultural_pairs_register  ON cultural_pairs(register);
CREATE INDEX idx_cultural_pairs_active    ON cultural_pairs(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_cultural_pairs_embedding ON cultural_pairs USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ── Case Library ──────────────────────────────────────────────────────────────

CREATE TABLE case_library (
  case_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id),
  source_language    TEXT NOT NULL CHECK (source_language IN ('vi', 'ja')),
  target_language    TEXT NOT NULL CHECK (target_language IN ('vi', 'ja')),
  register           TEXT NOT NULL CHECK (register IN ('formal', 'neutral', 'informal')),
  intent_label       TEXT NOT NULL,
  risk_categories    TEXT[] NOT NULL DEFAULT '{}',
  suggestion_offered BOOLEAN NOT NULL DEFAULT FALSE,
  suggestion_used    BOOLEAN,
  embedding          vector(1536),
  anonymised_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_library_tenant    ON case_library(tenant_id);
CREATE INDEX idx_case_library_expires   ON case_library(expires_at);
CREATE INDEX idx_case_library_embedding ON case_library USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ── Fluency Events ────────────────────────────────────────────────────────────

CREATE TABLE fluency_events (
  event_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'annotation_viewed',
    'suggestion_used',
    'suggestion_dismissed',
    'pattern_understood',
    'coaching_panel_opened',
    'pre_send_flag_viewed',
    'pre_send_original_sent',
    'pre_send_suggestion_used'
  )),
  pair_id    UUID REFERENCES cultural_pairs(pair_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fluency_events_user ON fluency_events(user_id, created_at DESC);
CREATE INDEX idx_fluency_events_type ON fluency_events(event_type);

-- ── Survey Responses ──────────────────────────────────────────────────────────

CREATE TABLE survey_responses (
  response_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id                UUID NOT NULL REFERENCES tenants(tenant_id),
  pilot_week               SMALLINT NOT NULL,
  had_cross_cultural_event BOOLEAN NOT NULL,
  difficulty_score         SMALLINT CHECK (difficulty_score BETWEEN 1 AND 5),
  comment                  TEXT,
  submitted_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_responses_tenant_week ON survey_responses(tenant_id, pilot_week);

-- ── Audit Log ─────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  log_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(tenant_id),
  action         TEXT NOT NULL,
  pipeline_stage TEXT,
  provider_used  TEXT,
  latency_ms     INTEGER,
  success        BOOLEAN NOT NULL,
  data_class     TEXT NOT NULL DEFAULT 'anonymised',
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tenant  ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_expires ON audit_log(expires_at);

-- Append-only: enforce no updates or deletes during pilot via row security
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_insert_only ON audit_log FOR INSERT WITH CHECK (TRUE);
CREATE POLICY audit_log_select_only ON audit_log FOR SELECT USING (TRUE);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cultural_pairs_updated_at
  BEFORE UPDATE ON cultural_pairs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
