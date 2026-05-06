# EXECUTIA Final Merge Decision

Base: executia-production.zip

Imported / preserved from V8:
- api/v1/live-state.js
- robust api/v1/proxy.js with dynamic request host resolution
- routes: /live, /proof, /ledger, /audit-ledger

Preserved from production:
- session.js with real session token issuing
- services/auth.js with API key + session token validation
- components/enterprise.js using x-session-token, not browser x-api-key
- atomic execution RPC flow

Rejected from V8:
- placeholder session.js
- old x-api-key sessionStorage frontend model
- strategy-only markdown noise

Critical fixes included:
1. SQL/JS ledger hash formula aligned.
2. Operator UI works with real UUIDs from operator queue.
3. Live smoke test covers: execute -> queue -> approve -> ledger-verify.
