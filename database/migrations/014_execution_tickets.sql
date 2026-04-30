-- Execution tickets: single-use authorization tokens issued after APPROVED decision.
-- A real-world action (payment, contract, etc.) may only proceed if a valid ticket exists.
-- Tickets are time-limited and single-use — consumption is atomic.
--
-- ticket_id (text): human-readable unique ID in format xt_<hex32>
-- Used by external systems (bank APIs, ERP) to reference the ticket.

create table if not exists execution_tickets (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       text unique not null,         -- xt_<hex32> — external reference
  execution_id    uuid not null references executions(id),
  allowed_action  text not null,
  amount          numeric,
  currency        text not null default 'EUR',
  valid_until     timestamptz not null,
  status          text not null default 'NOT_USED',
    -- NOT_USED | USED | EXPIRED | CANCELLED
  used_at         timestamptz,                  -- when ticket was consumed
  consumed_by     text,                         -- actor who consumed it
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),

  constraint chk_ticket_status check (
    status in ('NOT_USED', 'USED', 'EXPIRED', 'CANCELLED')
  )
);

create index if not exists idx_execution_tickets_ticket_id
on execution_tickets (ticket_id);

create index if not exists idx_execution_tickets_execution_id
on execution_tickets (execution_id);

create index if not exists idx_execution_tickets_status
on execution_tickets (status);

create index if not exists idx_execution_tickets_status_valid
on execution_tickets (status, valid_until)
where status = 'NOT_USED';
