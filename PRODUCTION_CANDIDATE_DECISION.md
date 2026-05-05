# EXECUTIA Production Candidate Decision

This package is a cleaned production candidate, not a finished bank-certified system.

## What changed from `executia-final-merged.zip`

1. Canonical DB deploy path moved to `/sql` only.
2. Deprecated/conflicting historical DB schemas moved to `/archive/deprecated-db-schemas`.
3. `ledger_entries.execution_id` and `audit_events.execution_id` are now `uuid`, aligned with `execution_results.execution_id`.
4. `commit_execution(payload jsonb)` now writes UUID execution IDs consistently.
5. Added `commit_operator_decision(...)` RPC so operator approval/block is also atomic.
6. `services/execution.js` now calls RPC for both initial execution and operator decisions.

## Canonical deploy order

1. `sql/001_schema.sql`
2. `sql/009_atomic_execution_rpc.sql`
3. `sql/010_atomic_operator_decision_rpc.sql`

## Still not “ideal” until live validation

- Supabase fresh-project deploy must be tested.
- Vercel env variables must be configured.
- Browser/demo pages still need a final enterprise auth UX review.
- A live smoke test must be run against `execution.executia.io`.
