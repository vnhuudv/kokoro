-- 004_inochi_carbon.sql
-- Inochi pillar: AI token carbon tracking tables

CREATE TABLE ai_usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(user_id) ON DELETE SET NULL,
  tenant_id       UUID NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('gateway', 'billing_api', 'estimate')),
  provider        TEXT NOT NULL CHECK (provider IN ('anthropic', 'google', 'openai', 'other')),
  tool            TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  period_month    DATE NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_user_month  ON ai_usage_logs (user_id, period_month);
CREATE INDEX idx_ai_usage_logs_tenant_month ON ai_usage_logs (tenant_id, period_month);

CREATE TABLE carbon_offsets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  kg_co2e       NUMERIC(10,3) NOT NULL,
  provider      TEXT NOT NULL,
  cert_id       TEXT,
  cost_usd      NUMERIC(10,2),
  purchased_at  DATE NOT NULL,
  covers_from   DATE NOT NULL,
  covers_to     DATE NOT NULL,
  notes         TEXT,
  recorded_by   UUID REFERENCES users(user_id)
);

CREATE TABLE usage_estimates (
  tenant_id                 UUID NOT NULL,
  tool                      TEXT NOT NULL,
  tokens_per_seat_per_month INTEGER NOT NULL,
  notes                     TEXT,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, tool)
);

-- Seed default estimates for Vnext pilot tenant
INSERT INTO usage_estimates (tenant_id, tool, tokens_per_seat_per_month, notes)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'claude_web',        500000, 'Claude.ai Teams/Pro — conservative estimate'),
  ('a0000000-0000-0000-0000-000000000001', 'gemini_workspace',  400000, 'Gemini for Google Workspace — conservative estimate');
