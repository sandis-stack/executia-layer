-- Execution rules layer
-- Each rule defines a condition and the decision it produces.
-- Rules are evaluated in priority order (lower = higher priority).
-- First matching rule wins.

create table if not exists execution_rules (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  condition_field    text not null,   -- field to check: validation, state, responsible
  condition_operator text not null,   -- missing | equals | not_equals
  condition_value    text,            -- expected value (null = any/none)
  decision    text not null,          -- BLOCKED | REVIEW | APPROVED
  priority    integer not null default 100,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_execution_rules_priority
on execution_rules (priority asc)
where active = true;

-- Seed rules (idempotent via ON CONFLICT DO NOTHING using name as unique)
alter table execution_rules
add constraint if not exists uq_execution_rules_name unique (name);

insert into execution_rules (name, description, condition_field, condition_operator, condition_value, decision, priority)
values
  (
    'BLOCK_MISSING_VALIDATION',
    'Execution is blocked when required validation is missing or empty.',
    'required_validation', 'missing', null,
    'BLOCKED', 10
  ),
  (
    'REVIEW_UNCONFIRMED_STATE',
    'Execution is held for review when current state is not CONFIRMED.',
    'current_state', 'not_equals', 'CONFIRMED',
    'REVIEW', 20
  ),
  (
    'BLOCK_MISSING_RESPONSIBLE',
    'Execution is blocked when no responsible party is identified.',
    'responsible_party', 'missing', null,
    'BLOCKED', 15
  ),
  (
    'APPROVE_ALL_CONDITIONS_MET',
    'Execution is approved when all required conditions are satisfied.',
    'current_state', 'equals', 'CONFIRMED',
    'APPROVED', 100
  )
on conflict (name) do nothing;
