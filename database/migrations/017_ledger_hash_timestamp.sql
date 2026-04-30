-- Add hash_timestamp to execution_ledger.
-- This is the timestamp used when computing truth_hash — separate from created_at
-- which is set by the database and may differ by milliseconds.
-- ledger-verify uses hash_timestamp to recreate the exact same hash.

alter table execution_ledger
add column if not exists hash_timestamp timestamptz;

update execution_ledger
set hash_timestamp = created_at
where hash_timestamp is null;

alter table execution_ledger
alter column hash_timestamp set not null;
