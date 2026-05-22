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
