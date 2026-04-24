-- ============================================================================
-- Audit logs table for order mutation history
-- Minimal JSONB schema to capture before/after snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  audit_id BIGSERIAL PRIMARY KEY,
  entity_table VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(30) NOT NULL,
  actor_id VARCHAR(100) NOT NULL,
  state_before JSONB,
  state_after JSONB,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup
  ON public.audit_logs(entity_table, entity_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs(actor_id, "timestamp" DESC);

