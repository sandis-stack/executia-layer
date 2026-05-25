# EXECUTIA Execution Intelligence Report

Phase 3B9 — governed deploy intelligence (local tooling only).

**Generated:** 2026-05-25T11:14:10.077Z
**Branch:** phase-3b3-ledger-polish
**Commit:** 4247c9344fa9b0ded4a6d66c6593433d40fcbb02

## Stability score

| Metric | Score |
|--------|------:|
| Overall | 92 |
| Architecture | 94 |
| Governance | 60 |
| Replay | 75 |
| Verification | 100 |
| Endpoint consistency | 99 |

Deductions from 100 (overall):
- Orphans: −1
- Shadow flows: −1
- Protected file touches: −2
- Governance warnings: −4
- Missing canonical edges: −0

## Risk summary

| Dimension | Level |
|-----------|-------|
| Overall | **CANONICAL** |
| Canonical | CANONICAL |
| Replay | HIGH |
| Public verify | undefined |
| Governance | HIGH |
| Architecture | MEDIUM |
| Orphan | LOW |
| Mutation | LOW |

## Architecture delta

Baseline: `2026-05-25T11:14:08.986Z`

- New nodes: 0
- Removed nodes: 0
- New edges: 0
- Removed edges: 0
- New orphans: 0
- Removed orphans: 0
- New shadow flows: 0
- Removed shadow flows: 0

## Canonical authority impact

_No canonical authority files in current git diff._

## Replay impact

- `api/v1/execution/replay.js`

## Governance impact

Governance tooling / rules:
- `scripts/phase-3b7-architecture-drift.js`
- `.cursor/rules/ai-operator-governance.mdc`
- `.cursor/rules/vendor-safety.mdc`

Protected files:
- `api/v1/execution/replay.js` (api/v1/execution/replay.js)
- `scripts/test-runner.js` (scripts/test-runner.js)

## Recommendations

- Run full institutional verification: npm test, ledger/audit vector tests, production audit/verify curl.
- Replay layer touched — verify GET /api/v1/execution/replay and console REPLAY VERIFY before deploy.
- Obtain explicit approval for protected file modifications before deploy.

## Engineering Console Status

- DETECTED: true
- GOVERNED: true
- READ_ONLY: true
- LIVE_REFRESH_ENABLED: true

## Engineering Console Authority

- ACTIVE: true
- GOVERNED: true
- DETECTED: true

## Deploy readiness

**Status:** REVIEW_REQUIRED

### Findings
- [MEDIUM] ORPHAN_ENDPOINTS: 1 unclassified API endpoint(s) disconnected from canonical anchors
- [MEDIUM] SHADOW_FLOWS: 1 shadow flow reference(s) in codebase
- [CANONICAL] PROTECTED_TOUCH: 2 protected file(s) modified in working tree

