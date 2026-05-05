-- Migration 004: EXECUTIA Core Ledger — transaction as truth
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS core_ledger (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id     uuid REFERENCES execution_results(execution_id),
  transaction_type text NOT NULL,
  actor            text NOT NULL,
  counterparty     text,
  subject          text,
  amount           numeric NOT NULL DEFAULT 0,
  currency         text NOT NULL DEFAULT 'EUR',
  debit_account    text,
  credit_account   text,
  tax_type         text,
  tax_rate         numeric DEFAULT 0,
  tax_amount       numeric DEFAULT 0,
  net_amount       numeric DEFAULT 0,
  gross_amount     numeric DEFAULT 0,
  status           text NOT NULL DEFAULT 'PENDING_REVIEW',
  decision         text,
  payload          jsonb DEFAULT '{}'::jsonb,
  hash             text,
  prev_hash        text,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_ledger_execution_id ON core_ledger(execution_id);
CREATE INDEX IF NOT EXISTS idx_core_ledger_created_at   ON core_ledger(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_core_ledger_actor        ON core_ledger(actor);
CREATE INDEX IF NOT EXISTS idx_core_ledger_status       ON core_ledger(status);
