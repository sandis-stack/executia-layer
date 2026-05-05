-- Migration 005: Ledger accounts + settlement layer
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text UNIQUE NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  currency     text NOT NULL DEFAULT 'EUR',
  balance      numeric NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE core_ledger
  ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS settled_at        timestamptz;

CREATE INDEX IF NOT EXISTS idx_core_ledger_settlement_status ON core_ledger(settlement_status);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_code          ON ledger_accounts(account_code);

-- Seed test accounts (idempotent)
INSERT INTO ledger_accounts (account_code, account_name, account_type, currency, balance)
VALUES
  ('Infrastructure Expense', 'Infrastructure Expense', 'EXPENSE', 'EUR', 0),
  ('Bank',                   'Bank Account',           'ASSET',   'EUR', 100000)
ON CONFLICT (account_code) DO NOTHING;
