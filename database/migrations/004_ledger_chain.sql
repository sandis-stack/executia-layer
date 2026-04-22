CREATE TABLE IF NOT EXISTS execution_ledger (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  project_id TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVE','ESCALATE','BLOCK')),
  reason_codes TEXT[] NOT NULL DEFAULT '{}',
  truth_hash TEXT NOT NULL UNIQUE,
  prev_hash TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  execution_guarantee TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (execution_guarantee IN ('GUARANTEED','CONDITIONAL','UNVERIFIED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_tickets (
  id TEXT PRIMARY KEY,
  ledger_id BIGINT NOT NULL REFERENCES execution_ledger(id),
  truth_hash TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  provider_name TEXT,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_results (
  id TEXT PRIMARY KEY,
  execution_ticket_id TEXT NOT NULL REFERENCES execution_tickets(id),
  ledger_id BIGINT NOT NULL REFERENCES execution_ledger(id),
  organization_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_transaction_id TEXT,
  provider_status TEXT,
  response_payload JSONB NOT NULL DEFAULT '{}',
  final_status TEXT NOT NULL,
  is_reconciliation_event BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_by TEXT,
  reconciled_at TIMESTAMPTZ,
  reconciliation_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
