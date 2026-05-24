# EXECUTIA Engineering Ledger (Phase 3B6)

**Document class:** Governance / engineering history  
**Scope:** Replayable software evolution — commits and deploys as governed engineering events  
**Status:** Additive layer — no canonical runtime audit mutation  

---

## Purpose

The engineering ledger records **how EXECUTIA software evolves** under governance: each pre-deploy snapshot captures git state, protected-file touches, classification hints, and risk — forming a **canonical engineering history** that is separate from execution-time material truth (`ledger_entries`, supplemental audit chain).

Execution truth answers: *what happened to an execution?*  
Engineering truth answers: *what changed in the codebase before deploy, and under what risk class?*

---

## Engineering events

An **engineering event** is a point-in-time record produced by:

```bash
node scripts/phase-3b6-engineering-ledger.js
```

Typically invoked from `.cursor/hooks/pre-deploy-check.sh` before production deploy.

Each event includes:

| Field | Meaning |
|-------|---------|
| `generated_at` | ISO timestamp of snapshot |
| `branch` | Current git branch |
| `commit` | HEAD commit SHA |
| `files_changed` | Working-tree delta (staged, unstaged, untracked) |
| `protected_files_touched` | Institutional paths modified |
| `change_classification_hint` | Governed change class summary |
| `risk_level` | `LOW` \| `MEDIUM` \| `HIGH` \| `CANONICAL` |
| `governance` | Replay and verification requirements |

Snapshots are stored under:

```text
engineering-ledger/<timestamp>.json
```

---

## Replayable software evolution

Engineering history is **replayable** in the institutional sense:

1. Identify snapshot `engineering-ledger/<timestamp>.json`
2. Checkout `commit` from snapshot (or compare to current HEAD)
3. Re-run `npm test`, `phase-3b5-governance-check.js`, and hash vectors if risk is `CANONICAL`
4. Compare `files_changed` and `protected_files_touched` to intended scope

This does **not** replay execution state — it replays **engineering context** for audits and post-incident review.

---

## Governed commits

Commits that touch **protected files** (see `.cursor/context/protected-files.md`) are **governed transitions**:

- Require explicit classification before merge (Phase 3B5)
- Require `node --check` + `npm test` on changed JS
- Require production `curl` on `/api/v1/audit/verify` when verification semantics change
- SQL changes require human approval and `PHASE_3B5_ALLOW_SQL=1` for governance bypass

The engineering ledger does not block commits; it **records** intent and risk for later verification.

---

## Deterministic deploy verification

Before deploy, the institutional chain is:

```text
npm test
  → phase-3b5-governance-check.js (hard violations block)
  → phase-3b6-engineering-ledger.js (record snapshot)
  → git status / diff review
  → deploy (human gate)
```

When `governance.deterministic_checks_required` is `true`, deploy must not proceed without:

- Passing test runner
- Passing ledger/audit vectors if hash-related files changed
- Resolving governance check exit code 1

---

## Architecture drift detection

Drift is detected by **comparing engineering snapshots** over time:

| Signal | Interpretation |
|--------|----------------|
| Repeated `CANONICAL` risk on same protected paths | Unstable canonical surface |
| Protected files touched without matching classification | Process drift |
| `files_changed` scope grows between snapshots | Broad refactor risk |
| Branch/commit mismatch vs deploy tag | Deployed wrong artifact |

Operational review: diff two `engineering-ledger/*.json` files and align with `git log` for the same window.

---

## Protected file governance

Protected patterns align with Phase 3B5:

- `sql/**`, audit/ledger/replay/verify surfaces, auth, `test-runner.js`, `vercel.json`, `.env*`

When `governance.protected_files_present` is `true`, the snapshot flags that deploy carries **institutional surface risk**.

---

## Canonical engineering history

| Layer | Store | Authority |
|-------|-------|-----------|
| **Execution material** | `ledger_entries` | Phase 3A `executia/ledger/v1` |
| **Execution supplemental** | `audit_events` global chain | Phase 3B1+ |
| **Verification** | `/api/v1/audit/verify` | Phase 3B2/3B3 |
| **Engineering** | `engineering-ledger/*.json` | Phase 3B6 (this document) |

Engineering ledger entries are **append-only by convention** (new timestamp files). Do not edit historical snapshots; append a new snapshot after corrective work.

---

## Non-goals

- No database writes
- No mutation of runtime audit/ledger logic
- No replacement for `audit/verify` or execution replay APIs
- No secret or env value capture in snapshots

---

*Phase 3B6 — engineering ledger is read-only institutional memory for governed software evolution.*
