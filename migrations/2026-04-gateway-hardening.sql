-- SUPERSEDED by schema.sql (canonical source of truth)
-- Kept for migration history only. Do not run independently.

-- EXECUTIA™ — Execution Gateway Tables
-- Run in Supabase SQL Editor AFTER execution_ledger table exists

-- ── EXECUTION TICKETS ────────────────────────────────────────────
-- One ticket per committed approval. Used exactly once.
CREATE TABLE IF NOT EXISTS execution_tickets (
  id               TEXT PRIMARY KEY,
  ledger_id        TEXT NOT NULL,         -- references execution_ledger.id
  truth_hash       TEXT NOT NULL,
  organization_id  TEXT NOT NULL,
  project_id       TEXT,
  session_id       TEXT,
  allowed_action   TEXT NOT NULL,         -- what this ticket permits
  payload          JSONB NOT NULL DEFAULT '{}',
  idempotency_key  TEXT NOT NULL UNIQUE,  -- prevents double-execution
  status           TEXT NOT NULL DEFAULT 'NOT_STARTED'
                   CHECK (status IN (
                     'NOT_STARTED', 'DISPATCHED',
                     'PROVIDER_ACCEPTED', 'PROVIDER_REJECTED',
                     'EXECUTED', 'FAILED',
                     'UNKNOWN_REQUIRES_RECONCILIATION'
                   )),
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_ledger   ON execution_tickets (ledger_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org      ON execution_tickets (organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON execution_tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_idem_key ON execution_tickets (idempotency_key);

-- RLS
ALTER TABLE execution_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_tickets" ON execution_tickets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── EXECUTION RESULTS ────────────────────────────────────────────
-- Immutable record of every provider interaction.
-- Append-only — never update, never delete.
CREATE TABLE IF NOT EXISTS execution_results (
  id                       TEXT PRIMARY KEY,
  execution_ticket_id      TEXT NOT NULL REFERENCES execution_tickets(id),
  ledger_id                TEXT NOT NULL,
  organization_id          TEXT NOT NULL,
  provider_name            TEXT NOT NULL,
  provider_transaction_id  TEXT,          -- from provider, null if unknown/failed
  provider_status          TEXT NOT NULL,
  response_payload         JSONB NOT NULL DEFAULT '{}',
  final_status             TEXT NOT NULL
                           CHECK (final_status IN (
                             'EXECUTED', 'PROVIDER_REJECTED', 'FAILED',
                             'UNKNOWN_REQUIRES_RECONCILIATION'
                           )),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_ticket  ON execution_results (execution_ticket_id);
CREATE INDEX IF NOT EXISTS idx_results_ledger  ON execution_results (ledger_id);
CREATE INDEX IF NOT EXISTS idx_results_status  ON execution_results (final_status);
CREATE INDEX IF NOT EXISTS idx_results_created ON execution_results (created_at DESC);

-- Make execution_results append-only (mirrors ledger immutability)
CREATE OR REPLACE FUNCTION block_execution_results_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'EXECUTIA: execution_results are immutable — UPDATE forbidden. Entry: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_execution_results
  BEFORE UPDATE ON execution_results
  FOR EACH ROW EXECUTE FUNCTION block_execution_results_update();

-- RLS
ALTER TABLE execution_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_results" ON execution_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── EXECUTION LEDGER ─────────────────────────────────────────────
-- Core truth record (if not already created)
CREATE TABLE IF NOT EXISTS execution_ledger (
  id               BIGSERIAL PRIMARY KEY,
  session_id       TEXT,
  event_type       TEXT NOT NULL,
  organization_id  TEXT,
  project_id       TEXT,
  decision         TEXT NOT NULL CHECK (decision IN ('APPROVE', 'ESCALATE', 'BLOCK')),
  reason_codes     TEXT[],
  truth_hash       TEXT NOT NULL UNIQUE,
  payload          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_org     ON execution_ledger (organization_id);
CREATE INDEX IF NOT EXISTS idx_ledger_session ON execution_ledger (session_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON execution_ledger (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_hash    ON execution_ledger (truth_hash);

-- Append-only ledger
CREATE OR REPLACE FUNCTION block_ledger_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'EXECUTIA: execution_ledger is immutable — UPDATE forbidden. Entry: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_ledger
  BEFORE UPDATE ON execution_ledger
  FOR EACH ROW EXECUTE FUNCTION block_ledger_update();

-- execution_rules: add effect and status columns if not present
ALTER TABLE execution_rules
  ADD COLUMN IF NOT EXISTS effect TEXT
    CHECK (effect IN ('ALLOW', 'ESCALATE', 'BLOCK')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'generated'
    CHECK (status IN (
      'generated', 'validated', 'invalid',
      'pending_review', 'approved', 'rejected', 'published'
    ));

-- RLS
ALTER TABLE execution_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_ledger" ON execution_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);
