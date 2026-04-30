create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid,
  event_type text not null,
  actor text not null default 'EXECUTIA_ENGINE',
  message text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at
on audit_logs (created_at desc);

create index if not exists idx_audit_logs_execution_id
on audit_logs (execution_id);
