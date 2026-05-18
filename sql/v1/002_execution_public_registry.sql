create table if not exists public.execution_public_registry (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique,
  submission_id uuid not null,
  status text not null,
  execution_domain text,
  governance_decision text,
  execution_score integer,
  risk_level text,
  pilot_readiness text,
  head_hash text,
  input jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  proof_preview jsonb not null default '{}'::jsonb,
  proof_chain jsonb not null default '[]'::jsonb,
  receipt jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists execution_public_registry_review_id_idx
on public.execution_public_registry (review_id);

create index if not exists execution_public_registry_head_hash_idx
on public.execution_public_registry (head_hash);

alter table public.execution_public_registry enable row level security;
