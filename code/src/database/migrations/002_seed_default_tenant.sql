-- Seed default tenant for local dev / pilot
-- Uses a fixed UUID so application code can reference it as a constant.

INSERT INTO tenants (tenant_id, name, kms_key_id, pilot_start, pilot_end)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'default-tenant',
  'local-dev-kms-key',
  '2025-09-01',
  '2026-04-30'
)
ON CONFLICT (tenant_id) DO NOTHING;
