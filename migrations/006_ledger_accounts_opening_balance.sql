-- Migration 006: Add opening_balance to ledger_accounts
-- Run in Supabase SQL Editor BEFORE deploy.

ALTER TABLE ledger_accounts
  ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

-- Seed existing accounts: opening_balance = current balance (pre-movement snapshot)
UPDATE ledger_accounts
SET opening_balance = balance
WHERE opening_balance = 0;
