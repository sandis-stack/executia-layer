# EXECUTIA Stabilization Report

**Date:** 2026-05-20  
**Phase:** Stabilization (no feature expansion)  
**Authority:** Institutional continuity + governed artifact retention

---

## Executive summary

Governed snapshot rotation was **destructive** (`unlinkSync`). It is now **non-destructive** (move to `archive/governed-artifacts/`). Thirty git-tracked stamped snapshots removed from active paths were **recovered from HEAD** into the archive. Canonical trio (`latest.json`, `report.md`, `last-stable.json`) is present in all three artifact directories.

| Gate | Status |
|------|--------|
| `npm test` | **PASS** |
| `.cursor/hooks/pre-deploy-check.sh` | **PASS** |
| Replay continuity (deterministic replay + dry audit) | **PASS** (test-runner) |
| Proof / public verify | **PASS** (test-runner static + endpoint guards) |
| Operator transitions | **PASS** (`assertExecutionTransition`, canonical payloads) |
| Public demo / institutional pages | **PASS** (mount + flow assertions) |
| Deployment readiness | **READY** pending intentional git commit of stabilization + WIP tree |

---

## 1. Deleted files audit

### Root cause

`services/artifact-governance.js` → `rotateStampedSnapshots()` previously deleted excess stamped `202*.json` files. Phase scripts (3B6, 3B8, 3B9) call `writeGovernedArtifacts()` which invoked rotation.

### Git `D` entries (30 governed snapshots + 1 temp)

| Category | Count | Action taken |
|----------|-------|----------------|
| `architecture-graph/202*.json` | 9 | Restored to `archive/governed-artifacts/architecture-graph/` |
| `engineering-ledger/202*.json` | 17 | Restored to `archive/governed-artifacts/engineering-ledger/` |
| `execution-intelligence/202*.json` | 4 | Restored to `archive/governed-artifacts/execution-intelligence/` |
| `public/console/operator.html.tmp` | 1 | **Safe deletion** (empty scratch file) |

### Operator backups (not deleted)

| File | Status |
|------|--------|
| `public/console/operator.backup.final.html` | Modified (preserved) |
| `public/console/operator.minimal.backup.html` | Modified (preserved) |
| `public/console/operator.html` | Modified (canonical console) |

No operator backup files were removed from git history.

---

## 2. Preserved canonical artifacts

| Directory | `latest.json` | `report.md` | `last-stable.json` |
|-----------|---------------|-------------|-------------------|
| `architecture-graph/` | ✓ | ✓ | ✓ (on disk; track in git if not yet) |
| `engineering-ledger/` | ✓ | ✓ | ✓ |
| `execution-intelligence/` | ✓ | ✓ | ✓ |

Active stamped snapshots at artifact roots remain gitignored per `.gitignore` (`202*.json`). Newest **8** per directory retained on disk by policy.

---

## 3. Safe deletions

| Item | Rationale |
|------|-----------|
| `operator.html.tmp` | Zero-byte temp; not governance history |
| Active-path stamped JSON (git `D`) | Superseded by newer stamps + **content preserved in archive** |

**Not safe to delete without review:** `archive/governed-artifacts/**`, canonical trio, governance docs/context, execution services (`execution-replay.js`, `execution-state-transition.js`, `artifact-governance.js`).

---

## 4. Artifact retention strategy (implemented)

| Tier | Location | Policy |
|------|----------|--------|
| 1 Canonical | `*/latest.json`, `report.md`, `last-stable.json` | Never rotate |
| 2 Active stamped | `*/202*.json` (max 8) | Gitignored at root |
| 3 Archive | `archive/governed-artifacts/<dir>/` | Move on rotation, never unlink |

**Docs:** `docs/governance/artifact-retention.md`  
**Module:** `services/artifact-governance.js` (`RETENTION.archiveRoot`, `renameSync` archive)  
**Tests:** Stabilization block in `scripts/test-runner.js` (archive rotation temp dir, no `unlinkSync`)

---

## 5. Replay continuity

| Check | Result |
|-------|--------|
| `buildDeterministicReplay` safe / missing paths | PASS |
| Dry audit chain verify | PASS |
| `api/v1/execution/replay.js` wired in tests | PASS |
| Canonical `REPLAY` / `REPLAY_SAFE` semantics | PASS |

---

## 6. Proof verification

| Check | Result |
|-------|--------|
| Public verify endpoint — no internal key / no mutations | PASS |
| Architecture graph includes `endpoint:verify/execution_id` | PASS |
| Public proof / proof-explorer institutional mounts | PASS |
| Phase 3B7 drift on verify samples | PASS |

---

## 7. Operator execution transitions

| Check | Result |
|-------|--------|
| `assertExecutionTransition` APPROVE / REJECT | PASS |
| Canonical transition meta + `buildTransitionPayload` | PASS |
| `api/v1/operator/action.js` in changed set (review before prod deploy) | Manual smoke recommended |

---

## 8. Public demo & execution flow

| Surface | Result |
|---------|--------|
| Homepage institutional shell | PASS |
| `execution-demo.html` pilot scenarios | PASS |
| `execution-test`, `request-pilot`, `public-proof` | PASS |
| Canonical flow states | `REQUESTED → VALIDATED → PENDING_REVIEW → COMMITTED → REPLAY_SAFE` |
| Canonical actions | `VALIDATE`, `COMMIT`, `VERIFY`, `REPLAY` |

Maps to institutional chain: **REQUEST → VALIDATION → REVIEW → COMMIT → VERIFY → REPLAY SAFE**.

---

## 9. Duplicate artifacts

| Pattern | Recommendation |
|---------|----------------|
| Stamped JSON at root + archive | **Intentional** — active cap 8, history in archive |
| `services/canonical-execution-semantics.js` re-export | Keep single source `shared/` |
| Console HTML under `console/` vs `public/console/` | Review separately; do not delete without diff |
| `index.backup.final.html` (if present) | Archive or gitignore; not canonical governance |

---

## 10. Git status — intentional cleanup (not performed automatically)

Working tree is **large WIP + stabilization**. Recommended commit grouping (when you approve commit):

1. **Stabilization core:** `services/artifact-governance.js`, `docs/governance/artifact-retention.md`, `docs/governance/STABILIZATION-REPORT.md`, `archive/governed-artifacts/`, artifact-governance doc updates, `scripts/test-runner.js` stabilization block
2. **Confirm deletions:** staged removal of 30 stamped paths from active dirs (content lives in archive)
3. **Execution / institutional WIP:** separate commits by concern (semantics, UI, operator API) — avoid blind mass-delete of `??` files

Do **not** run `git clean -fdx` on governance or archive paths.

---

## 11. Deployment readiness

| Requirement | Status |
|-------------|--------|
| Syntax (`node --check` on touched modules) | PASS |
| `npm test` | PASS |
| Pre-deploy hook (test + 3B5 + 3B7 + AI operator check) | PASS |
| No secrets introduced in stabilization diff | PASS (operator check) |
| Governance history continuity | **RESTORED** via archive |

**Verdict:** Codebase is **deploy-ready from a verification standpoint** once the working tree is committed intentionally. Production smoke: operator approve/reject, replay endpoint, public verify URL.

---

## 12. Changes made in this stabilization pass

- `rotateStampedSnapshots()` archives instead of deletes
- 30 recovered snapshots under `archive/governed-artifacts/`
- `docs/governance/artifact-retention.md` + archive README
- Test coverage for archive rotation and canonical file presence
- This report

---

*Generated during EXECUTIA stabilization phase. No feature expansion.*
