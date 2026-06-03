# EXECUTIA Execution Intelligence Report

Phase 3B9 — governed deploy intelligence (local tooling only).

**Generated:** 2026-06-02T17:14:04.741Z
**Branch:** main
**Commit:** 6d1ac37b60943e5dc5935415a3d9137767b0e0b8

## Stability score

| Metric | Score |
|--------|------:|
| Overall | 94 |
| Architecture | 95 |
| Governance | 66 |
| Replay | 100 |
| Verification | 100 |
| Endpoint consistency | 100 |

Deductions from 100 (overall):
- Orphans: −0
- Shadow flows: −1
- Protected file touches: −2
- Governance warnings: −3
- Missing canonical edges: −0

## Risk summary

| Dimension | Level |
|-----------|-------|
| Overall | **CANONICAL** |
| Canonical | CANONICAL |
| Replay | LOW |
| Public verify | undefined |
| Governance | HIGH |
| Architecture | MEDIUM |
| Orphan | LOW |
| Mutation | LOW |

## Architecture delta

Baseline: `2026-05-31T16:55:26.642Z`

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

_No replay layer files in current git diff._

## Governance impact


Protected files:
- `scripts/test-runner.js` (scripts/test-runner.js)
- `vercel.json` (vercel.json)

## Recommendations

- Run full institutional verification: npm test, ledger/audit vector tests, production audit/verify curl.
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
- [MEDIUM] SHADOW_FLOWS: 1 shadow flow reference(s) in codebase
- [CANONICAL] PROTECTED_TOUCH: 2 protected file(s) modified in working tree

