CREATE TABLE IF NOT EXISTS operators (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','operator','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  operator_id TEXT REFERENCES operators(id),
  label TEXT,
  plan TEXT,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  key_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
