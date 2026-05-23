# EXECUTIA Phase 3B.1 — Implementation Plan

**Document class:** Implementation plan (execution authority unchanged)  
**Prerequisites:** Phase 3A complete · `LEDGER_ENTRIES_PRIMARY` · `executia/ledger/v1` frozen · `docs/PHASE_3B1_SUPPLEMENTAL_AUDIT_BOUNDARY.md` committed  
**Status:** Plan only — **no code, no SQL, no runtime changes in this document**  
**Implementation gate:** Separate approval required before any file edit or migration apply  

---

## 1. Implementation objective

Introduce a **global, append-only, hashed supplemental audit chain** on `audit_events` and retire shadow writers, **without** changing:

- Material ledger authority (`ledger_entries`, `executia/ledger/v1`)
- Operator RPC terminal semantics
- Execution status vocabulary
- Public proof registry / export schema
- `ledger-verify` primary authority contract

---

## 2. Exact files to modify

### 2.1 New files (create)

| File | Purpose |
|------|---------|
| `sql/012_supplemental_audit_authority.sql` | Schema columns (if missing), audit hash functions, `executia_append_global_audit_event`, RPC body patches for `commit_execution` / `commit_operator_decision` |
| `sql/rollback/012_phase3b1_rollback.sql` | Restore pre-3B.1 RPC audit inserts; drop 3B.1 audit functions; **do not** drop ledger 011 functions |
| `scripts/audit-hash-vectors.js` | Deterministic JS vectors for `buildAuditHash` / global predecessor |
| `docs/PHASE_3B1_CUTOVER_RUNBOOK.md` | Ops: `T_3B1_cutover`, flags, verify order (optional but recommended at implement time) |

### 2.2 SQL files to modify (RPC supplemental branch only)

| File | Change scope |
|------|----------------|
| `sql/009b_canonical_evaluation_bridge.sql` | Replace raw `INSERT INTO audit_events` with `executia_append_global_audit_event`; event type `EXECUTION_SUBMITTED`; payload `reference_only`, `ledger_head_hash`, `chain_era: 3B1` |
| `sql/010_atomic_operator_decision_rpc.sql` | Same pattern; event type `OPERATOR_DECISION_RECORDED` |

**Do not modify:** `sql/011_ledger_hash_authority.sql`, `sql/011_rule_catalog.sql`, `sql/001_schema.sql` (unless team chooses to sync frozen schema doc — prefer all DDL in `012` only).

### 2.3 Application files to modify

| File | Change scope |
|------|----------------|
| `services/audit.js` | `AUDIT_HASH_FORMULA_ID`; global `getLastAuditHash()`; `writeAuditEvent` global chain; `verifyAuditChain` LEGACY skip + strict mode; document `repairAuditChain` as break-glass only |
| `api/v1/audit/verify.js` | Response: `authority_mode: SUPPLEMENTAL_AUDIT_GLOBAL`, `legacy_audit_verified`, optional `chain_era` summary — **no** change to ledger routes |
| `services/policy-materialization.js` | Replace `.insert(events)` → loop `writeAuditEvent` |
| `services/governance-review-actions.js` | Replace raw insert → `writeAuditEvent` |
| `api/v1/reconciliation/verify.js` | Replace raw insert → `writeAuditEvent` (**audit path only**; keep existing `execution_results.update` block unchanged) |
| `api/v1/proof/execution.js` | Replace `EXECUTION_PROOF_GENERATED` raw insert → `writeAuditEvent` (not external ingest) |
| `services/operator.js` | Replace raw insert → `writeAuditEvent` (legacy operator table path only) |
| `api/v2/governance/autonomous/run.js` | Replace raw insert → `writeAuditEvent` (T2 retirement) |
| `scripts/test-runner.js` | Add audit vector + global verify unit cases (dry-run safe) |
| `package.json` | Add script `"test:audit-vectors": "node scripts/audit-hash-vectors.js"` |

### 2.4 Files to modify only if strictly necessary (no-op / contract)

| File | Condition |
|------|-----------|
| `services/execution.js` | **No change** if RPC owns T0 supplemental append; only add call if RPC cannot pass `ledger_head_hash` and app must mirror (avoid if SQL passes bind) |
| `.cursor/hooks/pre-commit-check.sh` | Optional: fail on `audit_events`).insert` in `api/` (exclude `services/audit.js`) |

### 2.5 Files explicitly not in implementation diff

Listed in §8 **Do not touch**.

---

## 3. Exact SQL migration name

| Artifact | Name |
|----------|------|
| **Forward migration** | `sql/012_supplemental_audit_authority.sql` |
| **Rollback** | `sql/rollback/012_phase3b1_rollback.sql` |

### 3.1 Deploy order (database)

```text
1. sql/011_ledger_hash_authority.sql     (must already be applied — frozen)
2. sql/012_supplemental_audit_authority.sql   (new)
3. Re-apply or deploy patched bodies:
   - sql/009b_canonical_evaluation_bridge.sql
   - sql/010_atomic_operator_decision_rpc.sql
```

`012` must be applied **before** relying on patched `009b`/`010` in production.

### 3.2 Planned contents of `012` (specification only — not written here)

| Object | Role |
|--------|------|
| `ALTER TABLE audit_events` | Add `hash`, `previous_hash`, `previous_event_hash` if not present; index on `(created_at DESC, id DESC)` for head |
| `executia_audit_event_hash(jsonb, text)` | SQL mirror of `buildAuditHash` inputs |
| `executia_get_last_audit_hash()` | Global head (no `execution_id` filter) |
| `executia_append_global_audit_event(...)` | Append-only insert; sets hash + predecessor; payload defaults `chain_era`, `reference_only` for RPC types |
| Grants | `service_role` execute only |

**Locking:** `executia_append_global_audit_event` runs inside existing RPC transactions that already hold `pg_advisory_xact_lock(hashtext('executia_ledger'))`; use same lock namespace or nested `executia_audit` lock documented in runbook to prevent deadlock.

---

## 4. Rollback SQL

| File | Behavior |
|------|----------|
| `sql/rollback/012_phase3b1_rollback.sql` | Restore `commit_execution` / `commit_operator_decision` audit inserts to pre-3B.1 (`EXECUTION_CREATED`, `OPERATOR_DECISION_COMMITTED`, no hash); `DROP FUNCTION` 3B.1 audit helpers; **retain** `011` ledger functions and column adds on `audit_events` (hashes nullable — LEGACY mode) |

**Rollback does not:** revert ledger authority, revert 3A.1 verify, delete audit rows, or mutate existing hashes.

**App rollback:** redeploy pre-3B.1 `services/audit.js` + set `EXECUTIA_STRICT_AUDIT_CHAIN=false`.

---

## 5. Acceptance criteria

| ID | Criterion | Evidence |
|----|-----------|----------|
| AC1 | Post-cutover supplemental rows form one **global** chain | `GET /api/v1/audit/verify` (no `execution_id`) → `verified: true` |
| AC2 | `executia/ledger/v1` parity unchanged | `npm run test:ledger-vectors` passes |
| AC3 | `ledger-verify` unchanged | `authority_mode: LEDGER_ENTRIES_PRIMARY`; top-level `verified` = ledger only |
| AC4 | Each `commit_execution` / `commit_operator_decision` emits **one** hashed supplemental event in RPC tx | Staging integration / SQL trace |
| AC5 | Zero `audit_events` direct `.insert` in `api/` and listed `services/` T2 files | Grep + optional pre-commit |
| AC6 | RPC supplemental types: `EXECUTION_SUBMITTED`, `OPERATOR_DECISION_RECORDED` with `reference_only: true` | Payload inspection |
| AC7 | `npm run test:audit-vectors` passes (JS; SQL parity spot-check in staging) | CI local |
| AC8 | `npm run verify` passes | `check` + `test` |
| AC9 | Operator smoke unchanged | `node scripts/smoke-live.js` (staging) |
| AC10 | Public proof export JSON shape unchanged | Snapshot / manual `proof/export` |
| AC11 | LEGACY rows (`hash IS NULL`) excluded from strict global verify or reported under `legacy_audit_verified` | Verify response contract |
| AC12 | `repairAuditChain` disabled or internal-only in production | Env `EXECUTIA_AUDIT_REPAIR_ALLOWED` not set in prod |

---

## 6. Test commands

| Step | Command | Expect |
|------|---------|--------|
| Syntax | `npm run check` | All `.js` parse |
| Governance hook | `bash .cursor/hooks/pre-commit-check.sh` | Pass |
| Core tests | `npm test` | `scripts/test-runner.js` pass |
| Ledger frozen | `npm run test:ledger-vectors` | Unchanged vectors |
| Audit new | `npm run test:audit-vectors` | Global predecessor + hash stability |
| Combined | `npm run verify` | check + test |
| Targeted | `node --check services/audit.js api/v1/audit/verify.js` | — |
| Staging API | `curl` `GET /api/v1/audit/verify` | `verified`, `authority_mode` |
| Staging API | `curl` `GET /api/v1/ledger-verify` | Same as pre-3B.1 |
| Live smoke (ops) | `npm run smoke` | Operator paths OK |

**Post-deploy SQL spot-check (staging):**

```text
SELECT hash, previous_hash, event_type, payload->>'chain_era'
FROM audit_events
ORDER BY created_at DESC
LIMIT 5;
```

---

## 7. Production cutover steps

| Step | Owner | Action |
|------|-------|--------|
| C0 | Ops + Arch | Record `T_3B1_cutover` (UTC timestamp) in runbook |
| C1 | Ops | Confirm `011` applied; `ledger-verify` ledger chain OK |
| C2 | Ops | Apply `sql/012_supplemental_audit_authority.sql` in Supabase SQL editor |
| C3 | Ops | Deploy patched `009b` + `010` function bodies (via `012` or separate apply) |
| C4 | Eng | Deploy application commit (audit.js + T2 migrations) |
| C5 | Eng | Set `EXECUTIA_STRICT_AUDIT_CHAIN=false` initially |
| C6 | Ops | Staging soak: submit + operator approve → one hashed audit per RPC |
| C7 | Ops | Enable `EXECUTIA_STRICT_AUDIT_CHAIN=true` after soak window |
| C8 | Audit | Run `audit/verify` global + sample `execution_id` timeline |
| C9 | Audit | Confirm `ledger-verify` primary `verified` unchanged |
| C10 | Ops | Monitor error rate on RPC latency (advisory lock contention) |

**Feature flags (application):**

| Flag | Cutover |
|------|---------|
| `EXECUTIA_STRICT_AUDIT_CHAIN` | `false` → soak → `true` |
| `EXECUTIA_AUDIT_REPAIR_ALLOWED` | unset / `false` in production |
| `T_3B1_cutover` | ISO timestamp; verify skips pre-cutover for strict mode |

**Rollback trigger:** global audit verify mass failure, RPC deadlock, or ledger verify regression → C4 revert + C2 rollback SQL + flags off.

---

## 8. Risk matrix

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| R1 | Operators confuse audit `verified` with ledger `verified` | M | H | `audit/verify` exposes `authority_mode: SUPPLEMENTAL_AUDIT_GLOBAL`; training |
| R2 | LEGACY null-hash rows break strict global verify | H | M | `chain_era` + pre-cutover exclusion; `legacy_audit_verified` |
| R3 | Per-execution `getLastAuditHash` left in code path | M | H | Code review + grep; single global query |
| R4 | RPC transaction deadlock (ledger + audit locks) | M | H | Same advisory namespace; short tx; staging load test |
| R5 | Dual audit on approve (RPC + route `writeAuditEvent`) | M | M | Caller matrix; dedupe or document two events |
| R6 | `repairAuditChain` UPDATE violates append-only story | L | H | Prod disable flag; repair not in 3B.1 AC |
| R7 | `writeAuditEvent` inserts columns missing in DB | H | H | `012` ALTER before app deploy |
| R8 | SQL/JS audit hash drift | M | H | `audit-hash-vectors.js` + staging spot-check |
| R9 | Reconciliation route behavior change | M | M | Change insert only; no logic change to projection update |
| R10 | Deploy order: app before `012` | H | H | Runbook enforces DB first |

---

## 9. Explicit “do not touch” list

| # | Path / surface | Reason |
|---|----------------|--------|
| D1 | `services/ledger.js` | `executia/ledger/v1` frozen |
| D2 | `sql/011_ledger_hash_authority.sql` | Material authority frozen |
| D3 | `executia_ledger_entry_hash` / `executia_ledger_append` | No formula or writer change |
| D4 | `api/v1/ledger-verify.js` | `LEDGER_ENTRIES_PRIMARY` contract |
| D5 | `services/public-proof-registry.js` | Public proof schema frozen |
| D6 | `api/v1/proof/export.js`, `package.js`, `summary.js` response shapes | Registry contract |
| D7 | `services/execution.js` operator RPC paths | Terminal semantics frozen |
| D8 | `sql/010` operator transition rules (status guards) | Only audit insert branch |
| D9 | `shared/statuses.js` | No new statuses |
| D10 | `api/v1/commit-execution.js` | COMMITTED shadow path; no 3B.1 work |
| D11 | Projection rebuild jobs / `execution_results` hash repair | 3B.5 / ops |
| D12 | `services/core-ledger.js`, core_ledger repair | 3C |
| D13 | All `public/**` UI | No UI |
| D14 | External proof ingest endpoints / `EXTERNAL_PROOF_ATTACHED` | Out of 3B.1 |
| D15 | COMMITTED RPC / `commit_approved_execution` | 3B.6+ |
| D16 | Phase 3B.2+ semantics (quorum, halt, AI expansion) | — |
| D17 | `sql/inspection/*` | Read-only |
| D18 | Homepage / entry funnel | Governance |

---

## 10. Implementation work packages (sequenced)

| WP | Deliverable | Touches |
|----|-------------|---------|
| WP1 | `012` migration + rollback file | SQL only |
| WP2 | Patch `009b` / `010` audit branch | SQL RPC |
| WP3 | `audit.js` global chain + formula ID + verify modes | Service |
| WP4 | T2 caller migration (6 files) | Services + API |
| WP5 | `audit/verify` response contract | API |
| WP6 | `audit-hash-vectors.js` + test-runner + package script | Tests |
| WP7 | Cutover runbook + flags | Docs / env |

**Out of WP scope:** ledger vectors change, UI, COMMITTED, external ingest, projection rebuild, `commit-execution`.

---

## 11. Environment variables (implementation)

| Variable | Default | Purpose |
|----------|---------|---------|
| `EXECUTIA_STRICT_AUDIT_CHAIN` | `false` | Strict global verify post-cutover |
| `EXECUTIA_AUDIT_REPAIR_ALLOWED` | `false` | Gate `repairAuditChain` / `audit/repair` |
| `T_3B1_CUTOVER_ISO` | unset | Exclude pre-cutover rows from strict verify |

**Must not add:** flags that alter ledger formula, operator RPC-only mode, or ledger verify authority.

---

## 12. Approval before implementation

| Gate | Status |
|------|--------|
| Phase 3B.1 boundary plan | Committed (`PHASE_3B1_SUPPLEMENTAL_AUDIT_BOUNDARY.md`) |
| This implementation plan | **Planning complete — awaiting implementation approval** |
| Code / SQL / deploy | **Not started** |

---

*End of Phase 3B.1 implementation plan.*
