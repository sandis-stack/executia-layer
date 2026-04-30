-- 1. Cryptographic ticket signature
--    Signed at issuance, verified at gateway consumption.
--    sign(execution_id + allowed_action + amount + currency + valid_until, TICKET_SIGNING_SECRET)
alter table execution_tickets
add column if not exists ticket_signature text;

-- 2. Execution approvals — multi-actor control
--    Each approval is a traceable, actor-identified sign-off.
--    Execution can require N approvals before a ticket is issued.

create table if not exists execution_approvals (
  id            uuid primary key default gen_random_uuid(),
  execution_id  uuid not null references executions(id),
  actor_id      text not null,
  actor_role    text not null default 'approver',
  decision      text not null,          -- APPROVED | REJECTED | ABSTAIN
  reason        text,
  signature     text,                   -- HMAC of (execution_id + actor_id + decision + timestamp)
  created_at    timestamptz not null default now(),

  constraint chk_approval_decision check (
    decision in ('APPROVED', 'REJECTED', 'ABSTAIN')
  )
);

create index if not exists idx_execution_approvals_execution_id
on execution_approvals (execution_id);

create index if not exists idx_execution_approvals_actor
on execution_approvals (actor_id, decision);

-- 3. Approval requirements on execution_rules
--    Rules can now specify min_approvals required before ticket issuance.
alter table execution_rules
add column if not exists min_approvals integer not null default 1;

comment on column execution_rules.min_approvals is
  'Minimum number of APPROVED decisions required in execution_approvals before ticket can be issued.';
