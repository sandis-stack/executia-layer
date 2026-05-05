# EXECUTIA Final Merge Decision

Base: executia-production.zip
Reason: preserves atomic execution RPC (`sql/009_atomic_execution_rpc.sql`) and `services/execution.js` using `db().rpc("commit_execution")`.

Imported from executia-layer-fixed (8).zip only when file did not already exist:
- Enterprise API modules: organizations, users, clients, projects, tasks, metrics, alerts, audit-export, project-audit, proof
- Database/migrations folder
- OpenAPI and deploy docs
- Config/gateway/middleware/test docs

Conflict rule:
- If path exists in production, production version wins.
- Do not overwrite `services/execution.js`, `api/v1/execute.js`, `api/v1/operator-*`, `api/v1/ledger-verify.js`, dashboard/console/demo files, or `vercel.json`.

Core protected files:
- services/execution.js
- api/v1/submit.js
- api/v1/execute.js
- api/v1/commit-execution.js
- sql/001_schema.sql
- sql/009_atomic_execution_rpc.sql
