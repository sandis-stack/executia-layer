-- EXECUTIA V4 migration 001
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_rules (
  id BIGSERIAL PRIMARY KEY,
  organization_id TEXT,
  project_id TEXT,
  rule_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  name TEXT NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('ALLOW','ESCALATE','BLOCK')),
  condition_json JSONB,
  priority INT NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','validated','invalid','pending_review','approved','rejected','published')),
  created_by TEXT NOT NULL DEFAULT 'system',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
