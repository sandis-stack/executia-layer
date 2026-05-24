# EXECUTIA Architecture Drift Detection (Phase 3B7)

**Document class:** Governance / engineering safety  
**Scope:** Local read-only scanner — no SQL, no runtime API changes, no database writes  
**Status:** Additive institutional control  

---

## 1. Purpose

Phase 3B7 prevents EXECUTIA from **drifting back** into pre-convergence architecture:

- Shadow writers and duplicate verification
- Legacy audit event names in live SQL/RPC paths
- Public verify surfaces that require internal keys
- Append-only audit violations in application/SQL
- UI regressions (black backgrounds)
- Accidental `.env` commits

The scanner complements:

| Phase | Role |
|-------|------|
| 3B5 | Protected-file governance on git delta |
| 3B6 | Engineering ledger snapshots |
| **3B7** | Full-tree architecture drift patterns |

---

## 2. Scanner

```bash
node scripts/phase-3b7-architecture-drift.js
```

**Output:**

```text
EXECUTIA Phase 3B7 architecture drift check
```

- Lists **warnings** (informational, exit `0`)
- Lists **hard violations** (exit `1`)

Integrated in pre-deploy after 3B5 and before 3B6 engineering ledger.

---

## 3. Detection rules

### 3.1 Legacy event names (warning)

| Pattern | Allowed locations |
|---------|-------------------|
| `EXECUTION_CREATED` | `sql/rollback/**`, `docs/**`, `.cursor/**`, legacy tests |
| `OPERATOR_DECISION_COMMITTED` | Same |

Live RPC must use `EXECUTION_SUBMITTED` / `OPERATOR_DECISION_RECORDED`.

### 3.2 Verification authority (warning)

| Drift | Canonical |
|-------|-----------|
| Frontend calls `/api/v1/ledger-verify` | Prefer `/api/v1/audit/verify` |
| Frontend calls `/api/v1/core-ledger-verify` | Use audit verify only |
| `LEDGER_VERIFY_AUTHORITY_MODE` outside audit + compat wrappers | Single authority export surface |
| Chain verify logic in arbitrary `api/v1/*` routes | Delegate to audit verify |

### 3.3 Audit append-only (hard violation)

Forbidden outside `sql/rollback/**` and governance docs:

- `UPDATE audit_events`
- `DELETE FROM audit_events`
- `TRUNCATE audit_events`

### 3.4 Public verify (hard violation)

Files under `api/v1/verify/**` must not contain `requireInternalKey`.

### 3.5 Environment (hard violation)

Any `.env*` file in current git diff (staged or unstaged) fails the check.

### 3.6 UI (warning)

Black background patterns in HTML/CSS under console/public/dashboard:

- `background:#000`, `background-color:#000`, `background:black`, etc.

---

## 4. Exemptions

| Path | Reason |
|------|--------|
| `sql/rollback/**` | Intentional rollback bodies retain legacy names |
| `docs/**`, `.cursor/**` | Institutional documentation |
| `scripts/phase-3b7-architecture-drift.js` | Pattern definitions |
| `scripts/test-runner.js` | Legacy audit row fixtures |

**Not exempt:** `sql/009_atomic_execution_rpc.sql` and other non-rollback SQL still in repo — warnings encourage migration or rollback-only retention.

---

## 5. Operational response

| Finding | Action |
|---------|--------|
| Warning on `operations.html` → ledger-verify | Migrate UI to `audit/verify` |
| Warning on `sql/009_*` legacy events | Plan SQL migration or document as frozen legacy |
| Hard violation on public verify | Remove auth requirement immediately |
| Hard violation on audit SQL mutation | Revert; use append-only supplemental events |

---

## 6. Non-goals

- Not a substitute for `npm test` or hash vectors
- Not execution-time replay or audit verify
- No external CVE/API dependency scanning
- No auto-fix or codemods

---

*Phase 3B7 — architecture drift detection is read-only institutional guardrails for governed software evolution.*
