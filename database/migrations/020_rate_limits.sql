-- Rate limiting buckets for critical execution endpoints.
-- Key: endpoint:ip_or_session:window_start
-- Supabase-backed — works across serverless instances.

create table if not exists engine_rate_limits (
  bucket_key    text primary key,
  endpoint      text not null,
  request_count integer not null default 1,
  window_start  timestamptz not null,
  updated_at    timestamptz not null default now()
);

create index if not exists idx_rate_limits_window
on engine_rate_limits (window_start);

-- Auto-cleanup: rows older than 2 hours are stale
-- Run periodically: DELETE FROM engine_rate_limits WHERE window_start < now() - interval '2 hours';
