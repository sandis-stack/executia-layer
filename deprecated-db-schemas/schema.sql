-- EXECUTIA™ FINAL FULL LAYER DATABASE SCHEMA
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists execution_results (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid unique not null,
  request_type text not null,
  actor text not null,
  subject text not null,
  status text not null check (status in ('APPROVED','BLOCKED','PENDING_REVIEW','COMMITTED','FAILED')),
  decision text,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null,
  status text not null,
  previous_hash text not null,
  entry_hash text unique not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  execution_id uuid,
  actor text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_execution_results_execution_id on execution_results(execution_id);
create index if not exists idx_execution_results_status on execution_results(status);
create index if not exists idx_ledger_entries_execution_id on ledger_entries(execution_id);
create index if not exists idx_audit_events_execution_id on audit_events(execution_id);
create index if not exists idx_audit_events_created_at on audit_events(created_at desc);

alter table execution_results enable row level security;
alter table ledger_entries enable row level security;
alter table audit_events enable row level security;
