-- ============================================================
-- EXECUTIA™ FULL SCHEMA — SINGLE DEPLOY SCRIPT
-- Run this ONCE in Supabase SQL Editor on a fresh project.
-- Safe to re-run (all statements use IF NOT EXISTS / ON CONFLICT).
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLE: execution_results
-- ============================================================
CREATE TABLE IF NOT EXISTS execution_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  uuid UNIQUE NOT NULL,
  request_type  text NOT NULL,
  actor         text NOT NULL,
  subject       text NOT NULL,
  status        text NOT NULL CHECK (status IN ('APPROVED','BLOCKED','PENDING_REVIEW','COMMITTED','FAILED')),
  decision      text,
  reason        text,
  amount        numeric,
  rule_context  jsonb,
  proof         jsonb,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash          text,
  prev_hash     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Patch existing table (idempotent)
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS decision      text;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS actor         text;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS subject       text;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS amount        numeric;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS request_type  text;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS rule_context  jsonb;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS proof         jsonb;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS hash          text;
ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS prev_hash     text;

-- ============================================================
-- TABLE: ledger_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  uuid NOT NULL,
  status        text NOT NULL,
  previous_hash text NOT NULL,
  entry_hash    text UNIQUE NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: audit_events
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL,
  execution_id  uuid,
  actor         text NOT NULL DEFAULT 'system',
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: core_ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS core_ledger (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id       uuid,
  transaction_type   text NOT NULL,
  actor              text NOT NULL,
  counterparty       text,
  subject            text,
  amount             numeric NOT NULL DEFAULT 0,
  currency           text NOT NULL DEFAULT 'EUR',
  debit_account      text,
  credit_account     text,
  tax_type           text,
  tax_rate           numeric DEFAULT 0,
  tax_amount         numeric DEFAULT 0,
  net_amount         numeric DEFAULT 0,
  gross_amount       numeric DEFAULT 0,
  status             text NOT NULL DEFAULT 'COMMITTED',
  decision           text,
  payload            jsonb DEFAULT '{}'::jsonb,
  hash               text,
  prev_hash          text,
  settlement_status  text DEFAULT 'PENDING',
  settled_at         timestamptz,
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE core_ledger ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'PENDING';
ALTER TABLE core_ledger ADD COLUMN IF NOT EXISTS settled_at        timestamptz;

-- ============================================================
-- TABLE: ledger_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code    text UNIQUE NOT NULL,
  account_name    text NOT NULL,
  account_type    text NOT NULL CHECK (account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  currency        text NOT NULL DEFAULT 'EUR',
  opening_balance numeric NOT NULL DEFAULT 0,
  balance         numeric NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE ledger_accounts ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

-- ============================================================
-- TABLE: truth_anchors
-- ============================================================
CREATE TABLE IF NOT EXISTS truth_anchors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_type     text NOT NULL DEFAULT 'INTERNAL_TIMESTAMP',
  source_table    text NOT NULL,
  source_id       uuid NOT NULL,
  source_hash     text NOT NULL,
  anchor_payload  jsonb DEFAULT '{}'::jsonb,
  anchored_at     timestamptz DEFAULT now()
);


-- ============================================================
-- TABLE: organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'ENTERPRISE' CHECK (type IN ('ENTERPRISE','GOVERNMENT','BANK','REGULATOR')),
  status      text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: organization_users
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email            text NOT NULL,
  role             text NOT NULL CHECK (role IN ('ADMIN','OPERATOR','AUDITOR','REGULATOR','VIEWER')),
  status           text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (organization_id, email)
);

ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_execution_results_execution_id  ON execution_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_results_status        ON execution_results(status);
CREATE INDEX IF NOT EXISTS idx_execution_results_created_at    ON execution_results(created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_execution_id     ON ledger_entries(execution_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_execution_id       ON audit_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at         ON audit_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_core_ledger_execution_id        ON core_ledger(execution_id);
CREATE INDEX IF NOT EXISTS idx_core_ledger_created_at          ON core_ledger(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_core_ledger_actor               ON core_ledger(actor);
CREATE INDEX IF NOT EXISTS idx_core_ledger_settlement_status   ON core_ledger(settlement_status);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_code            ON ledger_accounts(account_code);

CREATE INDEX IF NOT EXISTS idx_truth_anchors_source_id         ON truth_anchors(source_id);
CREATE INDEX IF NOT EXISTS idx_truth_anchors_source_hash       ON truth_anchors(source_hash);
CREATE INDEX IF NOT EXISTS idx_truth_anchors_anchored_at       ON truth_anchors(anchored_at ASC);

-- ============================================================
-- TENANT ISOLATION COLUMNS
-- ============================================================
ALTER TABLE execution_results  ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE core_ledger        ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE ledger_accounts    ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE truth_anchors      ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE audit_events       ADD COLUMN IF NOT EXISTS organization_id uuid;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE execution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_ledger        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE truth_anchors      ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_organizations_type         ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_org_users_organization_id  ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_email            ON organization_users(email);
CREATE INDEX IF NOT EXISTS idx_execution_results_org_id   ON execution_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_core_ledger_org_id         ON core_ledger(organization_id);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO ledger_accounts (account_code, account_name, account_type, currency, opening_balance, balance)
VALUES
  ('Infrastructure Expense', 'Infrastructure Expense', 'EXPENSE', 'EUR', 0,      0),
  ('Bank',                   'Bank Account',           'ASSET',   'EUR', 100000, 100000)
ON CONFLICT (account_code) DO NOTHING;
