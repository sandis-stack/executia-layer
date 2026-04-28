-- ============================================================
-- EXECUTIA™ — COMPLETE DATABASE SCHEMA v1.1
-- PostgreSQL / Supabase
-- Idempotent where practical; safe for clean installs.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── 0. USERS ─────────────────────────────────────────────────
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  organization_id text not null,
  email           text unique not null,
  role            text not null default 'member'
                  check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_users_org on users (organization_id);

alter table users enable row level security;

drop policy if exists "users_read_own" on users;
create policy "users_read_own" on users
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "service_manage_users" on users;
create policy "service_manage_users" on users
  for all to service_role
  using (true)
  with check (true);


-- ── 0.5 PROJECTS ─────────────────────────────────────────────
create table if not exists projects (
  id                text primary key,
  organization_id   text not null,
  name              text not null,
  budget_total      numeric not null default 0,
  budget_remaining  numeric not null default 0,
  status            text not null default 'active'
                    check (status in ('active', 'paused', 'archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_projects_org on projects (organization_id);
create index if not exists idx_projects_status on projects (organization_id, status);

create or replace function set_projects_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
before update on projects
for each row execute function set_projects_updated_at();

alter table projects enable row level security;

drop policy if exists "service_manage_projects" on projects;
create policy "service_manage_projects" on projects
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "auth_read_own_projects" on projects;
create policy "auth_read_own_projects" on projects
  for select to authenticated
  using (
    organization_id in (
      select organization_id from users where id = auth.uid()
    )
  );


-- ── 1. EXECUTION_RULES ───────────────────────────────────────
create table if not exists execution_rules (
  id               bigserial primary key,
  organization_id  text,
  project_id       text,
  rule_key         text not null,
  event_type       text not null,
  name             text not null,
  effect           text not null
                   check (effect in ('ALLOW', 'ESCALATE', 'BLOCK')),
  condition_json   jsonb,
  priority         int not null default 100,
  status           text not null default 'generated'
                   check (status in (
                     'generated',
                     'validated',
                     'invalid',
                     'pending_review',
                     'approved',
                     'rejected',
                     'published'
                   )),
  created_by       text not null default 'system',
  approved_by      text,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists idx_rules_key on execution_rules (rule_key);
create index if not exists idx_rules_org on execution_rules (organization_id);
create index if not exists idx_rules_project on execution_rules (project_id);
create index if not exists idx_rules_event on execution_rules (event_type);
create index if not exists idx_rules_status on execution_rules (status);
create index if not exists idx_rules_published on execution_rules (status, event_type)
  where status = 'published';

create or replace function set_rules_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rules_updated_at on execution_rules;
create trigger rules_updated_at
before update on execution_rules
for each row execute function set_rules_updated_at();

create or replace function set_rules_approved_at()
returns trigger as $$
begin
  if new.status = 'published' and old.status <> 'published' then
    new.approved_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists rules_approved_at on execution_rules;
create trigger rules_approved_at
before update on execution_rules
for each row execute function set_rules_approved_at();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'execution_rules'
      and column_name = 'active'
  ) then
    update execution_rules
      set status = 'published'
    where active = true and status = 'generated';

    update execution_rules
      set status = 'rejected'
    where active = false and status = 'generated';
  end if;
end $$;

alter table execution_rules enable row level security;

drop policy if exists "service_manage_rules" on execution_rules;
create policy "service_manage_rules" on execution_rules
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "auth_read_published_rules" on execution_rules;
create policy "auth_read_published_rules" on execution_rules
  for select to authenticated
  using (
    status = 'published'
    and (
      organization_id is null
      or organization_id in (
        select organization_id from users where id = auth.uid()
      )
    )
  );


-- ── 2. EXECUTION_LEDGER ──────────────────────────────────────
create table if not exists execution_ledger (
  id               bigserial primary key,
  session_id       text not null,
  event_type       text not null,
  organization_id  text not null,
  project_id       text,
  decision         text not null
                   check (decision in ('APPROVE', 'ESCALATE', 'BLOCK')),
  reason_codes     text[] not null default '{}',
  truth_hash       text not null unique,
  prev_hash        text,
  payload          jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists idx_ledger_org on execution_ledger (organization_id, created_at desc);
create index if not exists idx_ledger_session on execution_ledger (session_id);
create index if not exists idx_ledger_decision on execution_ledger (decision, created_at desc);
create index if not exists idx_ledger_hash on execution_ledger (truth_hash);
create index if not exists idx_ledger_prev_hash on execution_ledger (prev_hash);
create index if not exists idx_ledger_created on execution_ledger (created_at desc);

create or replace function block_ledger_mutation()
returns trigger as $$
begin
  raise exception 'EXECUTIA: execution_ledger is immutable. Entry %: cannot be updated or deleted.', old.id;
end;
$$ language plpgsql;

drop trigger if exists no_update_ledger on execution_ledger;
drop trigger if exists no_delete_ledger on execution_ledger;

create trigger no_update_ledger
before update on execution_ledger
for each row execute function block_ledger_mutation();

create trigger no_delete_ledger
before delete on execution_ledger
for each row execute function block_ledger_mutation();

alter table execution_ledger enable row level security;

drop policy if exists "service_write_ledger" on execution_ledger;
create policy "service_write_ledger" on execution_ledger
  for insert to service_role
  with check (true);

drop policy if exists "service_read_ledger" on execution_ledger;
create policy "service_read_ledger" on execution_ledger
  for select to service_role
  using (true);

drop policy if exists "auth_read_own_ledger" on execution_ledger;
create policy "auth_read_own_ledger" on execution_ledger
  for select to authenticated
  using (
    organization_id in (
      select organization_id from users where id = auth.uid()
    )
  );


-- ── 3. EXECUTION_TICKETS ─────────────────────────────────────
create table if not exists execution_tickets (
  id               text primary key,
  ledger_id        bigint not null references execution_ledger(id),
  truth_hash       text not null,
  organization_id  text not null,
  project_id       text,
  session_id       text not null,
  allowed_action   text not null,
  payload          jsonb not null default '{}',
  idempotency_key  text not null unique,
  status           text not null default 'NOT_STARTED'
                   check (status in (
                     'NOT_STARTED',
                     'DISPATCHED',
                     'EXECUTED',
                     'PROVIDER_REJECTED',
                     'FAILED',
                     'UNKNOWN_REQUIRES_RECONCILIATION'
                   )),
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_tickets_ledger on execution_tickets (ledger_id);
create index if not exists idx_tickets_org on execution_tickets (organization_id);
create index if not exists idx_tickets_status on execution_tickets (status);
create index if not exists idx_tickets_idem on execution_tickets (idempotency_key);
create index if not exists idx_tickets_expires on execution_tickets (expires_at)
  where status = 'NOT_STARTED';

alter table execution_tickets enable row level security;

drop policy if exists "service_manage_tickets" on execution_tickets;
create policy "service_manage_tickets" on execution_tickets
  for all to service_role
  using (true)
  with check (true);


-- ── 4. EXECUTION_RESULTS ─────────────────────────────────────
create table if not exists execution_results (
  id                       text primary key,
  execution_ticket_id      text not null references execution_tickets(id),
  ledger_id                bigint not null,
  organization_id          text not null,
  provider_name            text not null,
  provider_transaction_id  text,
  provider_status          text not null,
  response_payload         jsonb not null default '{}',
  final_status             text not null
                           check (final_status in (
                             'EXECUTED',
                             'PROVIDER_REJECTED',
                             'FAILED',
                             'UNKNOWN_REQUIRES_RECONCILIATION'
                           )),
  is_reconciliation_event  boolean not null default false,
  reconciliation_of_id     text references execution_results(id),
  reconciled_by            text,
  reconciled_at            timestamptz,
  reconciliation_note      text,
  created_at               timestamptz not null default now()
);

create index if not exists idx_results_ticket on execution_results (execution_ticket_id);
create index if not exists idx_results_ledger on execution_results (ledger_id);
create index if not exists idx_results_org on execution_results (organization_id, created_at desc);
create index if not exists idx_results_status on execution_results (final_status);
create index if not exists idx_results_recon on execution_results (is_reconciliation_event)
  where is_reconciliation_event = true;
create index if not exists idx_results_created on execution_results (created_at desc);

create or replace function block_results_mutation()
returns trigger as $$
begin
  raise exception 'EXECUTIA: execution_results is immutable. Entry %: cannot be updated or deleted.', old.id;
end;
$$ language plpgsql;

drop trigger if exists no_update_results on execution_results;
drop trigger if exists no_delete_results on execution_results;

create trigger no_update_results
before update on execution_results
for each row execute function block_results_mutation();

create trigger no_delete_results
before delete on execution_results
for each row execute function block_results_mutation();

alter table execution_results enable row level security;

drop policy if exists "service_manage_results" on execution_results;
create policy "service_manage_results" on execution_results
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "auth_read_own_results" on execution_results;
create policy "auth_read_own_results" on execution_results
  for select to authenticated
  using (
    organization_id in (
      select organization_id from users where id = auth.uid()
    )
  );


-- ── 4.5 ENGINE RATE LIMITS ───────────────────────────────────
create table if not exists engine_rate_limits (
  bucket_key     text primary key,
  request_count  int not null default 0,
  window_start   timestamptz not null,
  updated_at     timestamptz not null default now()
);

create index if not exists idx_engine_rate_limits_updated on engine_rate_limits (updated_at);

alter table engine_rate_limits enable row level security;

drop policy if exists "service_manage_rate_limits" on engine_rate_limits;
create policy "service_manage_rate_limits" on engine_rate_limits
  for all to service_role
  using (true)
  with check (true);


-- ── 4.6 API KEYS / OPERATORS / AUDIT LOGS ────────────────────
create table if not exists operators (
  id               text primary key,
  organization_id  text not null,
  email            text not null,
  role             text not null default 'viewer'
                   check (role in ('viewer','operator','admin')),
  status           text not null default 'active'
                   check (status in ('active','disabled')),
  created_at       timestamptz not null default now()
);

create index if not exists idx_operators_org on operators (organization_id, role);

alter table operators enable row level security;

drop policy if exists "service_manage_operators" on operators;
create policy "service_manage_operators" on operators
  for all to service_role
  using (true)
  with check (true);

create table if not exists api_keys (
  id               text primary key,
  organization_id  text not null,
  operator_id      text references operators(id),
  label            text,
  key_hash         text not null unique,
  scopes           text[] not null default array['read','execute'],
  plan             text,
  status           text not null default 'active'
                   check (status in ('active','revoked')),
  last_used_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_api_keys_org on api_keys (organization_id, status);

alter table api_keys enable row level security;

drop policy if exists "service_manage_api_keys" on api_keys;
create policy "service_manage_api_keys" on api_keys
  for all to service_role
  using (true)
  with check (true);

create table if not exists audit_logs (
  id               text primary key,
  organization_id  text,
  actor_type       text not null default 'system',
  actor_id         text,
  actor_label      text,
  action           text not null,
  entity           text not null,
  entity_id        text,
  status           text not null default 'ok'
                   check (status in ('ok','review','error')),
  request_id       text,
  payload          jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists idx_audit_org_created on audit_logs (organization_id, created_at desc);

alter table audit_logs enable row level security;

drop policy if exists "service_manage_audit_logs" on audit_logs;
create policy "service_manage_audit_logs" on audit_logs
  for all to service_role
  using (true)
  with check (true);

create table if not exists operator_sessions (
  id               text primary key,
  operator_id      text not null references operators(id),
  organization_id  text not null,
  token_hash       text not null unique,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  last_used_at     timestamptz
);

create table if not exists webhook_events (
  id               text primary key,
  organization_id  text,
  provider_name    text,
  signature        text not null,
  received_at      timestamptz not null default now()
);


-- ── 5. RULE VIEW + RPC ────────────────────────────────────────
drop view if exists scoped_published_rules cascade;

create view scoped_published_rules as
select
  r.*,
  case
    when r.organization_id is not null and r.project_id is not null and r.event_type <> '*' then 'PROJECT_EVENT'
    when r.organization_id is not null and r.project_id is not null                         then 'PROJECT_WILDCARD'
    when r.organization_id is not null and r.project_id is null and r.event_type <> '*'    then 'ORG_EVENT'
    when r.organization_id is not null and r.project_id is null                            then 'ORG_WILDCARD'
    when r.organization_id is null and r.project_id is null and r.event_type <> '*'        then 'GLOBAL_EVENT'
    else 'GLOBAL_WILDCARD'
  end as scope_level,
  case
    when r.organization_id is not null and r.project_id is not null then 6
    when r.organization_id is not null and r.event_type <> '*'      then 5
    when r.organization_id is not null                              then 4
    when r.project_id is not null and r.event_type <> '*'           then 3
    when r.event_type <> '*'                                        then 2
    else 1
  end as specificity_score
from execution_rules r
where r.status = 'published';

drop function if exists get_scoped_rules(text, text, text) cascade;

create function get_scoped_rules(
  p_event_type text,
  p_organization_id text default null,
  p_project_id text default null
)
returns setof scoped_published_rules
language sql
stable
as $$
  select *
  from scoped_published_rules r
  where
    (r.event_type = p_event_type or r.event_type = '*')
    and (r.organization_id = p_organization_id or r.organization_id is null)
    and (
      r.project_id is null
      or (
        r.project_id = p_project_id
        and (r.organization_id = p_organization_id or r.organization_id is null)
      )
    )
  order by r.specificity_score desc, r.priority asc, r.id asc
$$;


-- ── 6. AUDIT / STATUS VIEWS ──────────────────────────────────
drop view if exists execution_status_view cascade;
create view execution_status_view as
select
  t.id                   as ticket_id,
  t.ledger_id,
  t.organization_id,
  t.allowed_action,
  t.idempotency_key,
  t.status               as ticket_status_cache,
  l.decision             as ledger_decision,
  l.truth_hash,
  r.final_status         as authoritative_status,
  r.provider_name,
  r.provider_transaction_id,
  r.provider_status,
  r.is_reconciliation_event,
  t.expires_at,
  t.created_at           as ticket_created_at,
  r.created_at           as result_recorded_at
from execution_tickets t
join execution_ledger l on l.id = t.ledger_id
left join lateral (
  select *
  from execution_results er
  where er.execution_ticket_id = t.id
  order by er.created_at desc
  limit 1
) r on true;

drop view if exists ledger_execution_summary cascade;
create view ledger_execution_summary as
select
  l.id                   as ledger_id,
  l.session_id,
  l.event_type,
  l.organization_id,
  l.project_id,
  l.decision,
  l.reason_codes,
  l.truth_hash,
  l.created_at           as decided_at,
  t.id                   as ticket_id,
  t.allowed_action,
  t.status               as ticket_status,
  r.final_status         as execution_status,
  r.provider_name,
  r.provider_transaction_id,
  r.created_at           as executed_at
from execution_ledger l
left join execution_tickets t on t.ledger_id = l.id
left join lateral (
  select *
  from execution_results er
  where er.execution_ticket_id = t.id
  order by er.created_at desc
  limit 1
) r on true
order by l.created_at desc;

drop view if exists pending_reconciliation cascade;
create view pending_reconciliation as
select
  t.id                                   as ticket_id,
  t.organization_id,
  l.event_type,
  l.decision,
  coalesce(r.final_status, t.status)     as execution_status,
  t.allowed_action,
  t.idempotency_key                      as idempotency_key,
  t.created_at,
  t.expires_at,
  r.provider_name,
  r.provider_transaction_id,
  r.response_payload
from execution_tickets t
join execution_ledger l on l.id = t.ledger_id
join execution_results r on r.execution_ticket_id = t.id
where t.status = 'UNKNOWN_REQUIRES_RECONCILIATION'
  and r.is_reconciliation_event = false
order by t.created_at asc;


-- ── 7. SEED RULES ─────────────────────────────────────────────
insert into execution_rules (
  rule_key, event_type, name, effect, condition_json, priority, status, created_by
) values (
  'payment_block_zero_budget',
  'payment',
  'Block payment when budget is zero',
  'BLOCK',
  '{"field": "budgetRemaining", "op": "lte", "value": 0}'::jsonb,
  10,
  'published',
  'system_seed'
)
on conflict (rule_key) do nothing;

insert into execution_rules (
  rule_key, event_type, name, effect, condition_json, priority, status, created_by
) values (
  'payment_allow_verified_supplier',
  'payment',
  'Allow payment when supplier verified and budget available',
  'ALLOW',
  '{"and": [
    {"field": "supplierVerified", "op": "eq", "value": true},
    {"field": "contractValid",    "op": "eq", "value": true},
    {"field": "budgetRemaining",  "op": "gt", "value": 0}
  ]}'::jsonb,
  100,
  'published',
  'system_seed'
)
on conflict (rule_key) do nothing;

insert into execution_rules (
  rule_key, event_type, name, effect, condition_json, priority, status, created_by
) values (
  'payment_escalate_high_amount',
  'payment',
  'Escalate payment when amount exceeds manual review threshold',
  'ESCALATE',
  '{"field": "amount", "op": "gt", "value": 10000}'::jsonb,
  50,
  'published',
  'system_seed'
)
on conflict (rule_key) do nothing;

insert into execution_rules (
  rule_key, event_type, name, effect, condition_json, priority, status, created_by
) values (
  'worker_unavailable_escalate',
  'worker_unavailable',
  'Escalate when no workers available for assignment',
  'ESCALATE',
  '{"field": "workersAvailable", "op": "eq", "value": 0}'::jsonb,
  100,
  'published',
  'system_seed'
)
on conflict (rule_key) do nothing;

insert into execution_rules (
  rule_key, event_type, name, effect, condition_json, priority, status, created_by
) values (
  'task_completed_allow',
  'task_completed',
  'Allow task completion events by default',
  'ALLOW',
  null,
  100,
  'published',
  'system_seed'
)
on conflict (rule_key) do nothing;
