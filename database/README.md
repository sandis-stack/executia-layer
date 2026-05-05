# Database deploy path

Canonical DB deploy files are in `/sql`.

Run in order:

1. `sql/001_schema.sql`
2. `sql/009_atomic_execution_rpc.sql`
3. `sql/010_atomic_operator_decision_rpc.sql`

Deprecated/conflicting historical schemas were moved to `/archive/deprecated-db-schemas` and must not be used for production deploy.
