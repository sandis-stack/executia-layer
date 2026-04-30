create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  result text not null,
  validation text not null,
  status text not null,
  truth_hash text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_executions_created_at
on executions (created_at desc);
