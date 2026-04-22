CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  provider_name TEXT,
  signature TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engine_rate_limits (
  bucket TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);
