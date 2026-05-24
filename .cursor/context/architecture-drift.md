# EXECUTIA Architecture Drift Context (Phase 3B7)

## Purpose

Detect **reintroduction of shadow logic**, **duplicate truth layers**, **legacy resurrection**, and **unsafe public surfaces** before deploy — locally, read-only, no runtime changes.

Run:

```bash
node scripts/phase-3b7-architecture-drift.js
```

Included in `.cursor/hooks/pre-deploy-check.sh` after Phase 3B5 governance check.

## Drift categories

### Shadow logic

Parallel validation or status writers that bypass:

- `commit_execution` / `commit_operator_decision` RPC
- `executia/ledger/v1` material append
- Global supplemental audit append

**Signals:** raw `audit_events.insert` in routes, duplicate verify implementations.

### Duplicate truth layers

More than one “primary” verification authority.

**Canonical:** `/api/v1/audit/verify`  
**Compatibility only:** `/api/v1/ledger-verify`, `/api/v1/core-ledger-verify` (wrappers)

**Drift:** frontend or new APIs treating ledger-verify as canonical.

### Legacy resurrection

Pre-3B1 event names or unhashed RPC audit inserts outside rollback:

- `EXECUTION_CREATED` → use `EXECUTION_SUBMITTED`
- `OPERATOR_DECISION_COMMITTED` → use `OPERATOR_DECISION_RECORDED`

Allowed in `sql/rollback/**`, institutional docs, test legacy fixtures.

### Unsafe public verification

`/api/v1/verify/*` must remain:

- GET read-only
- No `requireInternalKey`
- No actor email / sensitive payload exposure

### UI principle drift

Institutional light UI only — no black backgrounds (`#000`, `black`).

### Canonical authority drift

`LEDGER_VERIFY_AUTHORITY_MODE` / `resolveLedgerVerifyAuthority` must not spread beyond compatibility modules.

## Exit behavior

| Result | Exit |
|--------|------|
| Warnings only | `0` |
| Hard violations (audit SQL mutations, public verify auth, `.env` commit) | `1` |

## Cursor rules

- Fix warnings before merging canonical-risk work
- Do not silence the scanner without documenting why
- Rollback SQL is exempt from legacy event and mutation scans
