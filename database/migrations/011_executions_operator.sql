alter table executions
add column if not exists operator_override text,
add column if not exists operator_reason text,
add column if not exists operator_at timestamptz,
add column if not exists operator_actor text;
