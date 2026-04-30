-- Idempotency: prevents duplicate execution inserts for the same payload
alter table executions
add column if not exists idempotency_key text;

create unique index if not exists idx_executions_idempotency_key
on executions (idempotency_key)
where idempotency_key is not null;
