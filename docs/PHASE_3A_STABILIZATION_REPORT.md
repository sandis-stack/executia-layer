# EXECUTIA Phase 3A Stabilization Report

**Document class:** Architecture / audit record  
**Scope:** Phase 3A material ledger authority, Phase 3A.1 verify alignment, legacy drift analysis (read-only)  
**Status:** Stabilization complete in repository; database migration and legacy row repair are operational follow-ups  
**Phase 3B:** Not started — forbidden per this report  

---

## 1. Executive summary

EXECUTIA has completed a controlled transition of **materialized execution truth** to the global `ledger_entries` hash chain, with `execution_results` treated as a **projection** of the latest ledger head. Phase 3A centralizes the hash formula in `services/ledger.js` and Supabase functions (`executia_ledger_entry_hash`, `executia_ledger_append`). Phase 3A.1 aligns the public verify surface so that **`GET /api/v1/ledger-verify` does not fail overall** when legacy projection or settlement chains drift, while still exposing tampered identifiers and legacy component results.

Live observation prior to 3A.1: **ledger chain verified; execution projection and core ledger chains reported drift** on known legacy rows. This is consistent with architectural intent after Phase 3A — not a failure of material ledger authority.

---

## 2. Commit references

| Commit | Summary | Role in stabilization |
|--------|---------|---------------------|
| **`b420562`** | Add Phase 3A ledger hash authority with SQL parity | Canonical hash functions; RPC refactor (`009b`, `010`); `ledger.js` authority; parity vectors; rollback SQL |
| **`3e894e9`** | Align ledger verify with Phase 3A authority | `ledger-verify` primary authority mode; legacy warnings; inspection SQL (read-only) |
| **`baabf13`** | Remove local legacy drift inspection output | Repository hygiene; no runtime impact |

**Lineage (recent):** `11e5916` Phase 1 canonical evaluator → `2c2c6e7` Phase 2 operator RPC convergence → `0ba6af1` operator decision normalization → **`b420562`** Phase 3A → **`3e894e9`** Phase 3A.1 → **`baabf13`**.

---

## 3. Completed work

### 3.1 Phase 1 — Canonical evaluation bridge (prerequisite)

- Live submit path uses `evaluateRules` once; `commit_execution` accepts `canonical_evaluation` v1 with SQL safety asserts (`sql/009b_canonical_evaluation_bridge.sql`).
- Rollback flag: `EXECUTIA_CANONICAL_DECISION=false`.

### 3.2 Phase 2 — Operator RPC-only terminal transitions (prerequisite)

- `commit_operator_decision` RPC is the sole writer of `PENDING_REVIEW` → `APPROVED` / `BLOCKED` when `EXECUTIA_RPC_ONLY_OPERATOR` is enabled (default on).
- Legacy routes (`operator-approve`, `operator-block`, `operator/action` terminal paths) shim through `applyOperatorDecision` / `commitOperatorTerminalDecision`.
- Operator auth and response shapes preserved.

### 3.3 Phase 3A — Ledger hash authority

**Application (repository):**

- `sql/011_ledger_hash_authority.sql` — `executia_ledger_entry_hash`, `executia_get_last_ledger_hash`, `executia_ledger_append`.
- `sql/009b_canonical_evaluation_bridge.sql` — `commit_execution` uses `executia_ledger_append`.
- `sql/010_atomic_operator_decision_rpc.sql` — `commit_operator_decision` uses `executia_ledger_append`.
- `services/ledger.js` — documented canonical authority (`LEDGER_HASH_FORMULA_ID`: `executia/ledger/v1`).
- `services/audit.js` — `buildExecutionHash` delegates to `buildLedgerHash` (projection parity with ledger formula inputs).
- `scripts/ledger-hash-vectors.js` — deterministic JS/SQL parity vectors.
- `sql/rollback/011_phase3a_rollback.sql` — rollback path for RPC bodies and function drop.

**Explicitly not changed in Phase 3A:** audit global chain, `execution.js` orchestration strip, `commit-execution` shadow path, public proof registry schema, UI.

### 3.4 Phase 3A.1 — Ledger-verify alignment

- `GET /api/v1/ledger-verify` sets top-level `verified` from **`ledger_chain` only**.
- `authority_mode`: `LEDGER_ENTRIES_PRIMARY`.
- `legacy_verified` exposes per-component and composite (pre-3A.1) results.
- `legacy_projection_warning` / `legacy_core_ledger_warning` when ledger verifies but legacy chains do not; **tampered IDs retained**.

### 3.5 Legacy drift analysis (read-only)

- `sql/inspection/legacy_drift_two_ids_readonly.sql` — inspection-only SELECT for:
  - `93d10bcc-518b-4353-8e0b-852e04d34aa4` (execution projection)
  - `ed9f4e9c-2c9b-4eb1-a117-391bb135e718` (core ledger)
- No repair SQL executed under this stabilization tranche.

---

## 4. Migrations applied

### 4.1 Repository artifacts (committed)

| Order | Artifact | Purpose |
|-------|----------|---------|
| 1 | `sql/011_ledger_hash_authority.sql` | Shared hash and append functions |
| 2 | `sql/009b_canonical_evaluation_bridge.sql` | `commit_execution` → ledger authority |
| 3 | `sql/010_atomic_operator_decision_rpc.sql` | `commit_operator_decision` → ledger authority |
| — | `sql/rollback/011_phase3a_rollback.sql` | Controlled revert |

### 4.2 Database deployment procedure (operator)

Deploy **only** in this order on the target Supabase project:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/011_ledger_hash_authority.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/009b_canonical_evaluation_bridge.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/010_atomic_operator_decision_rpc.sql
```

**Parity spot-check after deploy:**

```sql
SELECT executia_ledger_entry_hash(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'APPROVED', 'APPROVE', 'GENESIS'
);
-- Expected: 0693b41131bba5eaf2521eeb0973e6306b8d3fc5b444e31cad49889cbac3c02e
```

**Record:** Stabilization report assumes migrations are applied per runbook before production relies on RPC append functions. If `executia_ledger_entry_hash` is missing, RPCs fall back to prior inline hash behavior until SQL is applied.

### 4.3 Application deployment

- Git `main` includes `b420562`, `3e894e9`, `baabf13` (pushed to `origin/main` during stabilization window).
- Vercel (or equivalent) deploys application code independently of Supabase SQL.

---

## 5. Authority transition

### 5.1 Before Phase 3A

| Store | Role | Risk |
|-------|------|------|
| `ledger_entries` | Append-only log | Inline SQL hash duplicated in 009/010 |
| `execution_results` | Often treated as co-equal “truth” | Projection drift under verify |
| `core_ledger` | Settlement chain | `commit-execution` used wrong hash formula vs verifier |
| `audit_events` | Mixed material + narrative | Not in scope for 3A |

### 5.2 After Phase 3A (material truth)

```text
REQUEST → VALIDATION → DECISION → REGISTRY (RPC) → ledger_entries (GLOBAL CHAIN)
                                              ↘ execution_results (PROJECTION)
```

**Canonical execution hash (material):**

```text
entry_hash = sha256(execution_id || status || decision || previous_hash)
```

**Authority:** `services/ledger.js` + `executia_ledger_entry_hash` (must match).

### 5.3 After Phase 3A.1 (verify surface)

| Signal | Authority |
|--------|-----------|
| `verified` (top-level) | `ledger_chain.verified` |
| `execution_chain` | Legacy projection check |
| `core_ledger_chain` | Legacy settlement check |
| `legacy_*_warning` | Informational; does not override material truth |

---

## 6. Verification outputs

### 6.1 Local / CI (repository)

| Check | Result |
|-------|--------|
| `npm test` / `node scripts/test-runner.js` | Pass — rules, canonical evaluation, operator normalization, ledger vectors, 3A.1 verify authority |
| `npm run test:ledger-vectors` | Pass — deterministic hashes |
| `node --check` (governance hook) | Pass |
| `.cursor/hooks/pre-commit-check.sh` | Pass |

### 6.2 Production verify — pre-3A.1 composite behavior (historical excerpt)

When top-level `verified` required **all** chains, live production reported:

```json
{
  "ok": true,
  "verified": false,
  "ledger_chain": {
    "verified": true,
    "entries": 0
  },
  "execution_chain": {
    "verified": false,
    "entries": 0,
    "tampered_execution_id": "93d10bcc-518b-4353-8e0b-852e04d34aa4"
  },
  "core_ledger_chain": {
    "verified": false,
    "entries": 0,
    "tampered_id": "ed9f4e9c-2c9b-4eb1-a117-391bb135e718"
  },
  "account_audit": {
    "verified": true,
    "accounts_checked": 0,
    "mismatches": []
  },
  "truth_anchors": {
    "verified": true,
    "anchors": 0
  }
}
```

*Note: `entries` counts reflect environment at query time; tampered IDs are the authoritative diagnostic fields.*

### 6.3 Production verify — post-3A.1 authority alignment (expected excerpt)

After deploy of commit **`3e894e9`**, same underlying drift may persist, but **material authority must read as verified**:

```json
{
  "ok": true,
  "verified": true,
  "authority_mode": "LEDGER_ENTRIES_PRIMARY",
  "legacy_verified": {
    "execution_projection": false,
    "core_ledger": false,
    "account_audit": true,
    "composite_all_chains": false
  },
  "legacy_projection_warning": {
    "code": "LEGACY_PROJECTION_DRIFT",
    "message": "execution_results projection does not match the canonical hash check; ledger_entries material chain is verified.",
    "tampered_execution_id": "93d10bcc-518b-4353-8e0b-852e04d34aa4",
    "entries": null
  },
  "legacy_core_ledger_warning": {
    "code": "LEGACY_CORE_LEDGER_DRIFT",
    "message": "core_ledger hash chain does not match its verifier; execution material truth authority is ledger_entries.",
    "tampered_id": "ed9f4e9c-2c9b-4eb1-a117-391bb135e718",
    "entries": null
  },
  "ledger_chain": {
    "verified": true
  },
  "execution_chain": {
    "verified": false,
    "tampered_execution_id": "93d10bcc-518b-4353-8e0b-852e04d34aa4"
  },
  "core_ledger_chain": {
    "verified": false,
    "tampered_id": "ed9f4e9c-2c9b-4eb1-a117-391bb135e718"
  },
  "account_audit": {
    "verified": true
  },
  "truth_anchors": {
    "verified": true
  }
}
```

**Interpretation:** `verified: true` reflects Phase 3A material chain integrity. `composite_all_chains: false` preserves the former strict AND semantics for auditors comparing epochs.

---

## 7. Legacy drift explanation

### 7.1 Execution ID `93d10bcc-518b-4353-8e0b-852e04d34aa4` — projection drift

| Check | Mechanism | Typical outcome |
|-------|-----------|-----------------|
| `ledger_chain` | `verifyLedgerChain` on `ledger_entries`; `decisionFromStatus(status, payload)` | **Pass** |
| `execution_chain` | `buildExecutionHash` uses `execution_results.decision` (default `REVIEW`) | **Fail** when projection ≠ ledger head |

**Classification:** `PROJECTION_HASH_DRIFT` and/or `PROJECTION_PREV_HASH_DRIFT` — not material ledger corruption.

**Repair (deferred):** Sync `execution_results.hash`, `prev_hash`, and `decision` from latest `ledger_entries` head per `sql/inspection/legacy_drift_two_ids_readonly.sql` runbook. **Do not** rewrite `ledger_entries` to match projection.

### 7.2 Core ledger `ed9f4e9c-2c9b-4eb1-a117-391bb135e718` — wrong historical formula

| Writer era | Hash function |
|------------|----------------|
| `commit-execution.js` (legacy) | `ledger.js` concat formula |
| `verifyCoreLedgerChain` | `core-ledger.js` stableStringify formula |

**Classification:** `WRONG_HISTORICAL_FORMULA_MATCH` — settlement chain drift, independent of Phase 3A execution authority.

**Repair (deferred):** `POST /api/v1/core-ledger-repair` or equivalent batch re-hash with core-ledger formula; backup prior `hash` / `prev_hash` in `payload`.

### 7.3 Inspection tooling

- **File:** `sql/inspection/legacy_drift_two_ids_readonly.sql`
- **Rules:** SELECT only; no UPDATE/DELETE/DDL
- **Operator procedure:** Documented in stabilization conversation; output archived as `legacy-drift-inspection.txt` (removed from repo in `baabf13` to avoid committing environment output)

---

## 8. Governance guarantees

The following remain **in force** after Phase 3A stabilization:

| Guarantee | Enforcement |
|-----------|-------------|
| Approved execution statuses only | `COMMITTED`, `BLOCKED`, `PENDING_REVIEW`, `FAILED`, `APPROVED` — no new statuses introduced |
| Atomic execution boundary | `commit_execution` / `commit_operator_decision` remain single-transaction RPCs with advisory lock |
| Operator terminal transitions | Phase 2 RPC-only path preserved; semantics unchanged |
| No duplicate material truth writers (new writes) | RPC → `executia_ledger_append`; no new inline ledger hash in routes |
| Public proof compatibility | Registry and proof APIs unchanged; proof reads projection + audit, not verify composite |
| No UI changes | Console and entry surfaces unchanged in this tranche |
| Institutional verify honesty | Legacy chains and tampered IDs remain visible; warnings explicit |
| Rollback | `sql/rollback/011_phase3a_rollback.sql` for RPC/function revert |

---

## 9. Risks remaining

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | SQL 011/009b/010 not applied on an environment | High | Deploy checklist + `executia_ledger_entry_hash` spot-check |
| R2 | Legacy projection rows fail `execution_chain` | Medium | Inspection + deferred projection repair; 3A.1 avoids false global fail |
| R3 | Legacy `core_ledger` rows fail settlement verify | Medium | Deferred core-ledger repair; separate from execution truth |
| R4 | Operators interpret `verified: true` as “all chains clean” | Medium | Train on `authority_mode` + `legacy_*_warning` |
| R5 | `verifyExecutionChain` scan order — first bad row by `created_at` | Low | Use inspection A10; repair earliest drift |
| R6 | `commit-execution` still shadow-writes core ledger | Medium | Phase 3C scope; not 3B |
| R7 | Audit chain still non-global / RPC-unhashed | Medium | Phase 3B only (forbidden until approved) |

---

## 10. Forbidden changes before Phase 3B

Do **not** proceed with the following until Phase 3B is explicitly approved and scoped:

| Forbidden | Reason |
|-----------|--------|
| Global immutable `audit_events` hash chain in RPC | Phase 3B architecture |
| `getLastAuditHash(execution_id)` per-execution chains | Violates global audit decision |
| Retire RPC supplemental audit without replacement | Breaks atomic narrative |
| Rewrite `ledger_entries` to match bad projections | Destroys material truth |
| Change public proof registry schema or event taxonomy | Compatibility contract |
| Change operator RPC transition rules or statuses | Phase 2 lock |
| Hide `tampered_execution_id` / `tampered_id` from verify response | Audit honesty |
| Merge core ledger hash into ledger formula | Separate domains |

**Allowed before 3B:** Legacy projection repair (SQL UPDATE runbook), core-ledger repair, read-only inspection, monitoring on `legacy_*_warning` rates.

---

## 11. Recommended next phase boundary

### Phase 3A.2 (operations — optional, not 3B)

- Execute read-only inspection (`legacy_drift_two_ids_readonly.sql`).
- Apply approved projection repair from ledger heads.
- Run `core-ledger-repair` for legacy settlement rows.
- Re-run `GET /api/v1/ledger-verify` and archive JSON.

### Phase 3B (next architectural tranche)

**Entry criteria:**

- Phase 3A SQL applied on all execution environments.
- Material `ledger_chain.verified` stable.
- Stakeholders accept `LEDGER_ENTRIES_PRIMARY` verify semantics.

**Scope (approved architecture, not implemented):**

- Global supplemental `audit_events` hash chain **in-RPC**.
- Remove material duplicate audit from RPC where supplemental only.
- `audit.js` global `getLastAuditHash()`; no per-execution chain heads.

**Explicitly out of 3B entry:** `execution.js` full orchestration strip, `commit-execution` RPC convergence, UI rebuild.

---

## 12. Sign-off checklist

| Item | Owner | Status |
|------|-------|--------|
| `b420562` merged / deployed | Engineering | Repository complete |
| Supabase 011 → 009b → 010 | Operations | Per environment |
| `3e894e9` deployed | Engineering | Repository complete |
| Parity vectors pass locally | CI | Pass |
| Legacy inspection run | Operations | Procedure ready |
| Legacy row repair | Operations | Deferred |
| Phase 3B kickoff | Architecture | **Not approved** |

---

## 13. Document control

| Field | Value |
|-------|-------|
| Title | Phase 3A Stabilization Report |
| Version | 1.0 |
| Classification | Internal — architecture / audit |
| Runtime impact | None (report only) |
| Related commits | `b420562`, `3e894e9`, `baabf13` |

---

*This document does not modify runtime logic, SQL, or database state.*
