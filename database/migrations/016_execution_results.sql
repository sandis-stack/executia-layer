-- Execution results: provider callback records.
-- Stores what actually happened in the real world after EXECUTIA authorized it.
-- Reconciliation compares this against the engine decision.
--
-- provider_status: what the external system (bank, ERP) reported
-- verified:        true if provider_status matches engine decision
-- discrepancy:     true if amounts or outcomes don't match

create table if not exists execution_results (
  id                uuid primary key default gen_random_uuid(),
  execution_id      uuid not null references executions(id),
  ticket_id         text,               -- xt_... reference (text, not uuid)
  provider          text not null,      -- BANK | ERP | MOCK | WEBHOOK
  provider_tx_id    text,               -- external transaction ID
  provider_status   text not null,      -- COMPLETED | FAILED | PARTIAL | PENDING | TIMEOUT
  amount            numeric,
  currency          text,
  verified          boolean not null default false,
  verification_note text,
  discrepancy       boolean not null default false,
  discrepancy_note  text,
  payload           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),

  constraint chk_provider_status check (
    provider_status in ('COMPLETED','FAILED','PARTIAL','PENDING','TIMEOUT')
  )
);

create index if not exists idx_execution_results_execution_id
on execution_results (execution_id);

create index if not exists idx_execution_results_provider_tx_id
on execution_results (provider_tx_id);

create index if not exists idx_execution_results_verified
on execution_results (verified, created_at desc)
where verified = false;
