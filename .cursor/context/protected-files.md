# EXECUTIA Protected Files (Phase 3B5)

These paths define **institutional truth** and **deploy safety**. They must not be modified without explicit approval.

## Protected patterns

| Pattern | Authority |
|---------|-----------|
| `sql/**` | Database materialization, RPC, audit/ledger append |
| `api/v1/audit/**` | Canonical Phase 3B2/3B3 verification (`/api/v1/audit/verify`) |
| `api/v1/execution/replay.js` | Read-only deterministic replay |
| `api/v1/verify*.js` | Public verification foundation |
| `services/audit.js` | Supplemental audit hash chain |
| `services/ledger.js` | `executia/ledger/v1` material hash |
| `services/core-ledger.js` | Legacy settlement projection |
| `services/db.js` | Supabase service role client |
| `services/auth.js` | Internal key and session gates |
| `services/jwt-auth.js` | Operator JWT permissions |
| `scripts/test-runner.js` | Institutional regression gate |
| `vercel.json` | Routing and deployment surface |
| `.env*` | Secrets and environment |

## Rules

1. **Explicit approval** — Protected files require stated intent, classification, and reviewer acknowledgment before edit.
2. **Canonical verification** — For canonical-tier files, run:
   - `node --check` on changed JS
   - `npm test`
   - `npm run test:ledger-vectors` / `test:audit-vectors` when hash-related
   - Production `curl` on `/api/v1/audit/verify` when verification behavior changes
3. **No silent edits** — Never modify protected files in drive-by refactors or “cleanup.”
4. **Read-only public verify** — Public verify must not add auth, secrets, or sensitive payload fields.
5. **Append-only audit** — No `UPDATE` / `DELETE` / `TRUNCATE` on `audit_events` in application or SQL (except documented break-glass with env flags).

## Non-protected (typical safe zones)

- `console/**`, `public/console/**` (UI only)
- `docs/**`, `.cursor/context/**` (governance docs)
- New read-only endpoints explicitly approved in phase plan
- `scripts/phase-3b5-governance-check.js` (governance tooling)

## When in doubt

Treat the path as **protected** and classify risk as **CANONICAL**.
