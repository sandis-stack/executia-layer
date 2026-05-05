-- Migration 008: Enterprise Control Layer
-- organizations, users, roles, tenant isolation
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS organizations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL DEFAULT 'ENTERPRISE' CHECK (type IN ('ENTERPRISE','GOVERNMENT','BANK','REGULATOR')),
  status       text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email            text NOT NULL,
  role             text NOT NULL CHECK (role IN ('ADMIN','OPERATOR','AUDITOR','REGULATOR','VIEWER')),
  status           text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (organization_id, email)
);

-- Tenant isolation columns
ALTER TABLE execution_results  ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE core_ledger        ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE ledger_accounts    ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE truth_anchors      ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE audit_events       ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_type             ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_org_users_organization_id      ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_email                ON organization_users(email);
CREATE INDEX IF NOT EXISTS idx_execution_results_org_id       ON execution_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_core_ledger_org_id             ON core_ledger(organization_id);

-- RLS
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users  ENABLE ROW LEVEL SECURITY;
