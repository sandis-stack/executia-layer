-- ============================================================
-- EXECUTIA™ — COMPLETE DATABASE SCHEMA v1.0
-- Run order: this file is idempotent (safe to re-run)
-- PostgreSQL / Supabase
-- ============================================================

-- ── 0. USERS (identity anchor for RLS policies) ──────────────────
-- Required by RLS policies on execution_rules, execution_ledger, execution_results.
-- If you use Supabase Auth: this table maps auth.uid() → organization_id.
-- Adjust to match your identity model.

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users (organization_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Users can read their own record only
CREATE POLICY "users_read_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());
-- Service role manages all users
CREATE POLICY "service_manage_users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── 0.5 PROJECTS (execution budget / scope anchor) ───────────────
CREATE TABLE IF NOT EXISTS projects (
  id                TEXT PRIMARY KEY,
  organization_id   TEXT NOT NULL,
  name              TEXT NOT NULL,
  budget_total      NUMERIC NOT NULL DEFAULT 0,
  budget_remaining  NUMERIC NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'archived')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects (organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (organization_id, status);

CREATE OR REPLACE FUNCTION set_projects_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_projects_updated_at();

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_projects" ON projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_own_projects" ON projects
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));


-- ── 1. EXECUTION_RULES (core rule store) ─────────────────────────
-- Stores all rules. Only status='published' rules enter the engine.
-- AI generates rules → governance validates → human approves → published.

CREATE TABLE IF NOT EXISTS execution_rules (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  TEXT,                          -- null = system-level (all orgs)
  project_id       TEXT,                          -- null = org-wide
  rule_key         TEXT NOT NULL,                 -- unique slug, e.g. "payment_block_overlimit"
  event_type       TEXT NOT NULL,                 -- snake_case or "*" wildcard
  name             TEXT NOT NULL,                 -- human-readable label
  effect           TEXT NOT NULL                  -- what engine does when rule matches
                   CHECK (effect IN ('ALLOW', 'ESCALATE', 'BLOCK')),
  condition_json   JSONB,                         -- null = always match; strict grammar only
  priority         INT NOT NULL DEFAULT 100,      -- lower = higher priority (10=system, 50=org, 100=project)
  status           TEXT NOT NULL DEFAULT 'generated'
                   CHECK (status IN (
                     'generated',       -- AI produced, not yet validated
                     'validated',       -- schema valid, not yet reviewed
                     'invalid',         -- failed validation — terminal
                     'pending_review',  -- awaiting human decision
                     'approved',        -- human approved, not yet activated
                     'rejected',        -- human rejected — terminal
                     'published'        -- active in engine
                   )),
  created_by       TEXT NOT NULL DEFAULT 'system',
  approved_by      TEXT,                          -- set when status→published
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_key ON execution_rules (rule_key);
CREATE INDEX IF NOT EXISTS idx_rules_org        ON execution_rules (organization_id);
CREATE INDEX IF NOT EXISTS idx_rules_project    ON execution_rules (project_id);
CREATE INDEX IF NOT EXISTS idx_rules_event      ON execution_rules (event_type);
CREATE INDEX IF NOT EXISTS idx_rules_status     ON execution_rules (status);
CREATE INDEX IF NOT EXISTS idx_rules_published  ON execution_rules (status, event_type)
  WHERE status = 'published';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_rules_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS rules_updated_at ON execution_rules;
CREATE TRIGGER rules_updated_at BEFORE UPDATE ON execution_rules
  FOR EACH ROW EXECUTE FUNCTION set_rules_updated_at();

-- Set approved_at when status transitions to published
CREATE OR REPLACE FUNCTION set_rules_approved_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.approved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS rules_approved_at ON execution_rules;
CREATE TRIGGER rules_approved_at BEFORE UPDATE ON execution_rules
  FOR EACH ROW EXECUTE FUNCTION set_rules_approved_at();

-- ── MIGRATION: active=true → status='published' ──────────────────
-- Run once if you have existing rules with active BOOLEAN column.
-- Safe to run on fresh install (no rows match, no-op).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'execution_rules' AND column_name = 'active'
  ) THEN
    UPDATE execution_rules SET status = 'published' WHERE active = TRUE AND status = 'generated';
    UPDATE execution_rules SET status = 'rejected'  WHERE active = FALSE AND status = 'generated';
    -- Remove old column after migration (comment out if you need rollback ability)
    -- ALTER TABLE execution_rules DROP COLUMN IF EXISTS active;
  END IF;
END $$;

-- RLS
ALTER TABLE execution_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_rules" ON execution_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_published_rules" ON execution_rules
  FOR SELECT TO authenticated
  USING (status = 'published' AND (
    organization_id IS NULL OR
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));


-- ── 2. EXECUTION_LEDGER (decision truth — immutable) ─────────────
-- Every engine decision is recorded here before any execution.
-- Append-only. Never updated. Never deleted.

CREATE TABLE IF NOT EXISTS execution_ledger (
  id               BIGSERIAL PRIMARY KEY,
  session_id       TEXT NOT NULL,
  event_type       TEXT NOT NULL,
  organization_id  TEXT NOT NULL,
  project_id       TEXT,
  decision         TEXT NOT NULL
                   CHECK (decision IN ('APPROVE', 'ESCALATE', 'BLOCK')),
  reason_codes     TEXT[]   NOT NULL DEFAULT '{}',
  truth_hash       TEXT     NOT NULL UNIQUE,      -- SHA-256 of canonical payload
  prev_hash        TEXT,                          -- previous ledger truth_hash for chain continuity
  payload          JSONB    NOT NULL DEFAULT '{}', -- full snapshot: event, ctx, rules, decision
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_org        ON execution_ledger (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_session    ON execution_ledger (session_id);
CREATE INDEX IF NOT EXISTS idx_ledger_decision   ON execution_ledger (decision, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_hash       ON execution_ledger (truth_hash);
CREATE INDEX IF NOT EXISTS idx_ledger_prev_hash  ON execution_ledger (prev_hash);
CREATE INDEX IF NOT EXISTS idx_ledger_created    ON execution_ledger (created_at DESC);

-- Append-only enforcement
CREATE OR REPLACE FUNCTION block_ledger_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'EXECUTIA: execution_ledger is immutable. Entry %: cannot be updated or deleted.', OLD.id;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS no_update_ledger ON execution_ledger;
DROP TRIGGER IF EXISTS no_delete_ledger ON execution_ledger;
CREATE TRIGGER no_update_ledger BEFORE UPDATE ON execution_ledger
  FOR EACH ROW EXECUTE FUNCTION block_ledger_mutation();
CREATE TRIGGER no_delete_ledger BEFORE DELETE ON execution_ledger
  FOR EACH ROW EXECUTE FUNCTION block_ledger_mutation();

ALTER TABLE execution_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_write_ledger" ON execution_ledger
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_read_ledger" ON execution_ledger
  FOR SELECT TO service_role USING (true);
CREATE POLICY "auth_read_own_ledger" ON execution_ledger
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));


-- ── 3. EXECUTION_TICKETS (gateway authorization tokens) ──────────
-- One ticket per committed APPROVE decision.
-- Exactly one use. Expires after TTL.
-- status is a cache — execution_results is authoritative.

CREATE TABLE IF NOT EXISTS execution_tickets (
  id               TEXT PRIMARY KEY,              -- xt_{hex16}
  ledger_id        BIGINT NOT NULL REFERENCES execution_ledger(id),
  truth_hash       TEXT NOT NULL,                 -- mirrors ledger entry
  organization_id  TEXT NOT NULL,
  project_id       TEXT,
  session_id       TEXT NOT NULL,
  allowed_action   TEXT NOT NULL,                 -- event_type permitted by this ticket
  payload          JSONB NOT NULL DEFAULT '{}',   -- action-specific data for provider
  idempotency_key  TEXT NOT NULL UNIQUE,          -- SHA-256 derived — DB-level double-execution lock
  status           TEXT NOT NULL DEFAULT 'NOT_STARTED'
                   CHECK (status IN (
                     'NOT_STARTED',                     -- issued, not yet dispatched
                     'DISPATCHED',                      -- sent to provider, awaiting result
                     'EXECUTED',                        -- provider confirmed execution
                     'PROVIDER_REJECTED',               -- provider refused
                     'FAILED',                          -- network/engine error
                     'UNKNOWN_REQUIRES_RECONCILIATION'  -- ambiguous — needs manual check
                   )),
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_ledger    ON execution_tickets (ledger_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org       ON execution_tickets (organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status    ON execution_tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_idem      ON execution_tickets (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_tickets_expires   ON execution_tickets (expires_at)
  WHERE status = 'NOT_STARTED';  -- partial index for expiry cleanup

ALTER TABLE execution_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_tickets" ON execution_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── 4. EXECUTION_RESULTS (external execution truth — immutable) ───
-- Authoritative record of every provider interaction.
-- execution_tickets.status is a cache derived from this table.
-- Append-only. Multiple rows per ticket allowed (retries, reconciliation events).

CREATE TABLE IF NOT EXISTS execution_results (
  id                       TEXT PRIMARY KEY,      -- xr_{timestamp}_{ticket_suffix}
  execution_ticket_id      TEXT NOT NULL REFERENCES execution_tickets(id),
  ledger_id                BIGINT NOT NULL,       -- for direct audit queries without ticket join
  organization_id          TEXT NOT NULL,
  provider_name            TEXT NOT NULL,         -- "mock_bank", "webhook", "executia_internal"
  provider_transaction_id  TEXT,                  -- from provider (null if failed/unknown)
  provider_status          TEXT NOT NULL,         -- raw provider status string
  response_payload         JSONB NOT NULL DEFAULT '{}',
  final_status             TEXT NOT NULL
                           CHECK (final_status IN (
                             'EXECUTED',                        -- confirmed by provider
                             'PROVIDER_REJECTED',               -- provider refused
                             'FAILED',                          -- engine/network error
                             'UNKNOWN_REQUIRES_RECONCILIATION'  -- ambiguous — formal recon event
                           )),
  -- Reconciliation metadata (populated for reconciliation events)
  is_reconciliation_event  BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_of_id     TEXT REFERENCES execution_results(id),  -- which result this resolves
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_ticket   ON execution_results (execution_ticket_id);
CREATE INDEX IF NOT EXISTS idx_results_ledger   ON execution_results (ledger_id);
CREATE INDEX IF NOT EXISTS idx_results_org      ON execution_results (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_status   ON execution_results (final_status);
CREATE INDEX IF NOT EXISTS idx_results_recon    ON execution_results (is_reconciliation_event)
  WHERE is_reconciliation_event = TRUE;
CREATE INDEX IF NOT EXISTS idx_results_created  ON execution_results (created_at DESC);

-- Append-only: no updates or deletes
CREATE OR REPLACE FUNCTION block_results_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'EXECUTIA: execution_results is immutable. Entry %: cannot be updated or deleted.', OLD.id;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS no_update_results ON execution_results;
DROP TRIGGER IF EXISTS no_delete_results ON execution_results;
CREATE TRIGGER no_update_results BEFORE UPDATE ON execution_results
  FOR EACH ROW EXECUTE FUNCTION block_results_mutation();
CREATE TRIGGER no_delete_results BEFORE DELETE ON execution_results
  FOR EACH ROW EXECUTE FUNCTION block_results_mutation();

ALTER TABLE execution_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_results" ON execution_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_own_results" ON execution_results
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));



-- ── 4.5 ENGINE RATE LIMITS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS engine_rate_limits (
  bucket_key     TEXT PRIMARY KEY,
  request_count  INT NOT NULL DEFAULT 0,
  window_start   TIMESTAMPTZ NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_rate_limits_updated ON engine_rate_limits (updated_at);

ALTER TABLE engine_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_rate_limits" ON engine_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 5. SCOPED RULES VIEW + RPC ────────────────────────────────────
-- Canonical rule loading path for production.
-- Replaces multi-.or() JS queries with a single auditable SQL call.

CREATE OR REPLACE VIEW scoped_published_rules AS
SELECT
  r.*,
  CASE
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NOT NULL AND r.event_type != '*' THEN 'PROJECT_EVENT'
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NOT NULL                         THEN 'PROJECT_WILDCARD'
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NULL AND r.event_type != '*'     THEN 'ORG_EVENT'
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NULL                             THEN 'ORG_WILDCARD'
    WHEN r.organization_id IS NULL AND r.project_id IS NULL AND r.event_type != '*'         THEN 'GLOBAL_EVENT'
    ELSE                                                                                         'GLOBAL_WILDCARD'
  END AS scope_level,
  CASE
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NOT NULL THEN 6
    WHEN r.organization_id IS NOT NULL AND r.event_type != '*'      THEN 5
    WHEN r.organization_id IS NOT NULL                              THEN 4
    WHEN r.project_id IS NOT NULL AND r.event_type != '*'           THEN 3
    WHEN r.event_type != '*'                                         THEN 2
    ELSE                                                              1
  END AS specificity_score
FROM execution_rules r
WHERE r.status = 'published';

-- Single-call rule loading RPC — use this in production
CREATE OR REPLACE FUNCTION get_scoped_rules(
  p_event_type      TEXT,
  p_organization_id TEXT DEFAULT NULL,
  p_project_id      TEXT DEFAULT NULL
)
RETURNS SETOF scoped_published_rules
LANGUAGE sql STABLE AS $$
  SELECT * FROM scoped_published_rules r
  WHERE
    (r.event_type = p_event_type OR r.event_type = '*')
    AND (r.organization_id = p_organization_id OR r.organization_id IS NULL)
    AND (
      r.project_id IS NULL
      OR (
        r.project_id = p_project_id
        AND (r.organization_id = p_organization_id OR r.organization_id IS NULL)
      )
    )
  ORDER BY r.specificity_score DESC, r.priority ASC, r.id ASC
$$;


-- ── 6. AUDIT VIEWS ────────────────────────────────────────────────

-- Current execution status per ticket (joins authoritative result)
CREATE OR REPLACE VIEW execution_status_view AS
SELECT
  t.id                     AS ticket_id,
  t.ledger_id,
  t.organization_id,
  t.allowed_action,
  t.idempotency_key,
  t.status                 AS ticket_status_cache,  -- may lag behind results
  l.decision               AS ledger_decision,
  l.truth_hash,
  r.final_status           AS authoritative_status, -- from execution_results
  r.provider_name,
  r.provider_transaction_id,
  r.provider_status,
  r.is_reconciliation_event,
  t.expires_at,
  t.created_at             AS ticket_created_at,
  r.created_at             AS result_recorded_at
FROM execution_tickets t
JOIN execution_ledger l ON l.id = t.ledger_id
LEFT JOIN LATERAL (
  SELECT * FROM execution_results er
  WHERE er.execution_ticket_id = t.id
  ORDER BY er.created_at DESC
  LIMIT 1
) r ON TRUE;

-- Tickets needing reconciliation
CREATE OR REPLACE VIEW pending_reconciliation AS
SELECT
  t.id              AS ticket_id,
  t.organization_id,
  t.allowed_action,
  t.idempotency_key AS idempotency_key,
  t.created_at,
  t.expires_at,
  r.provider_name,
  r.provider_transaction_id,
  r.response_payload
FROM execution_tickets t
JOIN execution_results r ON r.execution_ticket_id = t.id
WHERE t.status = 'UNKNOWN_REQUIRES_RECONCILIATION'
  AND r.is_reconciliation_event = FALSE
ORDER BY t.created_at ASC;

-- Decision + execution truth per ledger entry
CREATE OR REPLACE VIEW ledger_execution_summary AS
SELECT
  l.id             AS ledger_id,
  l.session_id,
  l.event_type,
  l.organization_id,
  l.project_id,
  l.decision,
  l.reason_codes,
  l.truth_hash,
  l.created_at     AS decided_at,
  t.id             AS ticket_id,
  t.allowed_action,
  t.status         AS ticket_status,
  r.final_status   AS execution_status,
  r.provider_name,
  r.provider_transaction_id,
  r.created_at     AS executed_at
FROM execution_ledger l
LEFT JOIN execution_tickets t   ON t.ledger_id = l.id
LEFT JOIN LATERAL (
  SELECT * FROM execution_results er
  WHERE er.execution_ticket_id = t.id
  ORDER BY er.created_at DESC LIMIT 1
) r ON TRUE
ORDER BY l.created_at DESC;


-- ── 7. SEED: EXAMPLE SYSTEM RULE ─────────────────────────────────
-- One global payment rule as reference.
-- Remove before production, or modify to your needs.
INSERT INTO execution_rules (
  rule_key, event_type, name, effect, condition_json, priority, status, created_by
) VALUES (
  'payment_block_zero_budget',
  'payment',
  'Block payment when budget is zero',
  'BLOCK',
  '{"field": "budgetRemaining", "op": "lte", "value": 0}'::jsonb,
  10,
  'published',
  'system_seed'
) ON CONFLICT (rule_key) DO NOTHING;

-- ── 8. SEED: PILOT RULES ───────────────────────────────────────────
-- Payment: allow verified supplier + budget
INSERT INTO execution_rules (rule_key, event_type, name, effect, condition_json, priority, status, created_by)
VALUES (
  'payment_allow_verified_supplier', 'payment',
  'Allow payment when supplier verified and budget available',
  'ALLOW',
  '{"and": [
    {"field": "supplierVerified", "op": "eq", "value": true},
    {"field": "contractValid",    "op": "eq", "value": true},
    {"field": "budgetRemaining",  "op": "gt", "value": 0}
  ]}'::jsonb,
  100, 'published', 'system_seed'
) ON CONFLICT (rule_key) DO NOTHING;

-- Payment: escalate high amount (> 10000)
INSERT INTO execution_rules (rule_key, event_type, name, effect, condition_json, priority, status, created_by)
VALUES (
  'payment_escalate_high_amount', 'payment',
  'Escalate payment when amount exceeds manual review threshold',
  'ESCALATE',
  '{"field": "amount", "op": "gt", "value": 10000}'::jsonb,
  50, 'published', 'system_seed'
) ON CONFLICT (rule_key) DO NOTHING;

-- Worker unavailable: escalate
INSERT INTO execution_rules (rule_key, event_type, name, effect, condition_json, priority, status, created_by)
VALUES (
  'worker_unavailable_escalate', 'worker_unavailable',
  'Escalate when no workers available for assignment',
  'ESCALATE',
  '{"field": "workersAvailable", "op": "eq", "value": 0}'::jsonb,
  100, 'published', 'system_seed'
) ON CONFLICT (rule_key) DO NOTHING;

-- Task completed: allow (default pass-through)
INSERT INTO execution_rules (rule_key, event_type, name, effect, condition_json, priority, status, created_by)
VALUES (
  'task_completed_allow', 'task_completed',
  'Allow task completion events by default',
  'ALLOW',
  NULL,
  100, 'published', 'system_seed'
) ON CONFLICT (rule_key) DO NOTHING;


-- ── 4.6 API KEYS / OPERATORS / AUDIT LOGS (V3) ──────────────────
CREATE TABLE IF NOT EXISTS operators (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL,
  email            TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','operator','admin')),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operators_org ON operators (organization_id, role);
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_operators" ON operators FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS api_keys (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL,
  operator_id      TEXT REFERENCES operators(id),
  label            TEXT,
  key_hash         TEXT NOT NULL UNIQUE,
  scopes           TEXT[] NOT NULL DEFAULT ARRAY['read','execute'],
  plan             TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  last_used_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys (organization_id, status);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_api_keys" ON api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS audit_logs (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT,
  actor_type       TEXT NOT NULL DEFAULT 'system',
  actor_id         TEXT,
  actor_label      TEXT,
  action           TEXT NOT NULL,
  entity           TEXT NOT NULL,
  entity_id        TEXT,
  status           TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','review','error')),
  request_id       TEXT,
  payload          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs (organization_id, created_at DESC);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_audit_logs" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS reconciled_by TEXT;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS reconciliation_note TEXT;

CREATE OR REPLACE VIEW pending_reconciliation AS
SELECT
  t.id              AS ticket_id,
  t.organization_id,
  l.event_type,
  l.decision,
  COALESCE(r.final_status, t.status) AS execution_status,
  t.allowed_action,
  t.idempotency_key AS idempotency_key,
  t.created_at,
  t.expires_at,
  r.provider_name,
  r.provider_transaction_id,
  r.response_payload
FROM execution_tickets t
JOIN execution_ledger l ON l.id = t.ledger_id
JOIN execution_results r ON r.execution_ticket_id = t.id
WHERE t.status = 'UNKNOWN_REQUIRES_RECONCILIATION'
  AND r.is_reconciliation_event = FALSE
ORDER BY t.created_at ASC;


-- V4 additions
CREATE TABLE IF NOT EXISTS operator_sessions (
  id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL REFERENCES operators(id),
  organization_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  provider_name TEXT,
  signature TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
