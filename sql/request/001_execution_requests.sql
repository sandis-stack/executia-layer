create extension if not exists pgcrypto;

create table if not exists execution_requests (
  id uuid primary key default gen_random_uuid(),

  created_at timestamptz not null default now(),

  organization_name text,
  email text,
  execution_domain text,

  current_problem text,
  desired_outcome text,
  current_stack text,

  request_state text not null default 'REQUEST_RECEIVED',
  next_state text not null default 'EXECUTION_ANALYSIS_PENDING',

  governance_status text not null default 'PENDING',
  analysis_status text not null default 'QUEUED'
);

create index if not exists idx_execution_requests_created_at
on execution_requests(created_at desc);

create index if not exists idx_execution_requests_state
on execution_requests(request_state);
