-- Idempotency for execution_results.
-- Prevents duplicate provider callbacks for the same transaction.
-- Natural idempotency key: hash of (execution_id + provider + provider_tx_id).
-- If provider_tx_id is null, falls back to (execution_id + provider + provider_status + amount).

alter table execution_results
add column if not exists idempotency_key text;

create unique index if not exists idx_execution_results_idempotency
on execution_results (idempotency_key)
where idempotency_key is not null;
