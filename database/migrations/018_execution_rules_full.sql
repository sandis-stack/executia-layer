-- Upgrade execution_rules for full engine compatibility.
-- Adds condition_json (JSON condition tree), effect (ALLOW|ESCALATE|BLOCK),
-- status (published|draft|invalid), rule_key, event_type, organization_id, project_id.
-- Simple condition columns remain for backwards compatibility.

alter table execution_rules
  add column if not exists rule_key        text,
  add column if not exists effect          text not null default 'BLOCK',
  add column if not exists status          text not null default 'published',
  add column if not exists condition_json  jsonb,
  add column if not exists event_type      text default '*',
  add column if not exists organization_id text,
  add column if not exists project_id      text,
  add column if not exists approved_by     text,
  add column if not exists published_at    timestamptz;

alter table execution_rules
  add constraint if not exists chk_rule_effect
    check (effect in ('ALLOW', 'ESCALATE', 'BLOCK'));

alter table execution_rules
  add constraint if not exists chk_rule_status
    check (status in ('published', 'draft', 'invalid', 'pending_review', 'approved', 'rejected'));

create index if not exists idx_execution_rules_status_event
on execution_rules (status, event_type)
where status = 'published';

create index if not exists idx_execution_rules_org
on execution_rules (organization_id, status)
where status = 'published';

-- Update existing seed rules to use proper effect + condition_json
update execution_rules
set
  effect = 'BLOCK',
  status = 'published',
  event_type = '*',
  condition_json = '{"field": "required_validation", "op": "is_null"}'::jsonb
where name = 'BLOCK_MISSING_VALIDATION' and condition_json is null;

update execution_rules
set
  effect = 'ESCALATE',
  status = 'published',
  event_type = '*',
  condition_json = '{"field": "current_state", "op": "neq", "value": "CONFIRMED"}'::jsonb
where name = 'REVIEW_UNCONFIRMED_STATE' and condition_json is null;

update execution_rules
set
  effect = 'BLOCK',
  status = 'published',
  event_type = '*',
  condition_json = '{"field": "responsible_party", "op": "is_null"}'::jsonb
where name = 'BLOCK_MISSING_RESPONSIBLE' and condition_json is null;

update execution_rules
set
  effect = 'ALLOW',
  status = 'published',
  event_type = '*',
  condition_json = '{"field": "current_state", "op": "eq", "value": "CONFIRMED"}'::jsonb
where name = 'APPROVE_ALL_CONDITIONS_MET' and condition_json is null;

-- Add project validator rules
insert into execution_rules (name, rule_key, description, effect, status, event_type, priority,
  condition_json, condition_field, condition_operator, condition_value, active)
values
  (
    'BLOCK_LEGAL_HOLD',
    'project.block.legal',
    'Block any execution when a legal block is active.',
    'BLOCK', 'published', 'project.payment.release', 5,
    '{"field": "legalBlock", "op": "eq", "value": true}'::jsonb,
    'legal_block', 'equals', 'true', true
  ),
  (
    'BLOCK_SUPPLIER_UNVERIFIED',
    'project.block.supplier',
    'Block if supplier is not verified.',
    'BLOCK', 'published', 'project.payment.release', 10,
    '{"field": "supplierVerified", "op": "eq", "value": false}'::jsonb,
    'supplier_verified', 'equals', 'false', true
  ),
  (
    'BLOCK_CONTRACT_INVALID',
    'project.block.contract',
    'Block if contract is not valid.',
    'BLOCK', 'published', 'project.payment.release', 15,
    '{"field": "contractValid", "op": "eq", "value": false}'::jsonb,
    'contract_valid', 'equals', 'false', true
  ),
  (
    'ESCALATE_INVOICE_MISSING',
    'project.escalate.invoice',
    'Escalate for operator review if invoice is not attached.',
    'ESCALATE', 'published', 'project.payment.release', 20,
    '{"field": "invoice_attached", "op": "eq", "value": false}'::jsonb,
    'invoice_attached', 'equals', 'false', true
  ),
  (
    'ESCALATE_HIGH_VALUE',
    'project.escalate.highvalue',
    'Escalate payments above 10,000 EUR for operator review.',
    'ESCALATE', 'published', 'project.payment.release', 25,
    '{"field": "amount", "op": "gte", "value": 10000}'::jsonb,
    'amount', 'equals', '10000', true
  )
on conflict (name) do nothing;
