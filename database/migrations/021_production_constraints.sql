-- Production-grade constraints.
-- DB-level enforcement — cannot be bypassed by application layer.

-- 1. execution_results: provider_tx_id uniqueness per provider
--    Prevents duplicate provider callbacks for the same transaction.
create unique index if not exists idx_execution_results_provider_tx_unique
on execution_results (provider, provider_tx_id)
where provider_tx_id is not null;

-- 2. execution_tickets: expected_payload_hash
--    Stored at ticket issuance, verified at gateway consumption.
--    hash(sorted JSON of authorized payload) — tamper detection.
alter table execution_tickets
add column if not exists expected_payload_hash text;

-- 3. execution_results: receiver + partial execution fields
alter table execution_results
add column if not exists receiver         text,
add column if not exists partial_execution boolean not null default false,
add column if not exists partial_note     text;

-- 4. execution_results: add provider_tx_id uniqueness (idempotency)
--    Already have idempotency_key unique — this adds natural key protection.
comment on column execution_results.provider_tx_id is
  'External transaction ID. Unique per provider when set (enforced by idx_execution_results_provider_tx_unique).';
