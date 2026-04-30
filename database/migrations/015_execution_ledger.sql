-- Execution ledger: append-only chain of execution events.
-- Each entry links to the previous via prev_hash — blockchain-like integrity.
-- Tampering with any entry breaks the chain and is detectable.
--
-- ENFORCEMENT (two layers):
-- 1. Trigger: prevents UPDATE and DELETE at database level
-- 2. RLS: service role INSERT only — no application-layer UPDATE/DELETE policies
--
-- Global chain: prev_hash references the last entry across ALL executions,
-- not per-execution. This means tampering anywhere breaks the entire chain.

create table if not exists execution_ledger (
  id            uuid primary key default gen_random_uuid(),
  execution_id  uuid,
  event_type    text not null,
  actor         text not null default 'EXECUTIA_ENGINE',
  payload       jsonb not null default '{}'::jsonb,
  prev_hash     text,
  truth_hash    text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_execution_ledger_execution_id
on execution_ledger (execution_id);

create index if not exists idx_execution_ledger_created_at
on execution_ledger (created_at desc);

-- Trigger: hard database-level append-only enforcement
create or replace function prevent_ledger_update()
returns trigger as $$
begin
  raise exception 'execution_ledger is append-only. UPDATE and DELETE are not permitted.';
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_ledger_update on execution_ledger;
create trigger trg_prevent_ledger_update
before update or delete on execution_ledger
for each row execute function prevent_ledger_update();

-- RLS: second enforcement layer
alter table execution_ledger enable row level security;
-- Service role bypasses RLS automatically.
-- No UPDATE or DELETE policies are defined — only INSERT via service role.
