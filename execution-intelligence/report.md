# EXECUTIA Execution Intelligence Report

Phase 3B9 — governed deploy intelligence (local tooling only).

**Generated:** 2026-05-25T13:12:40.676Z
**Branch:** phase-3b3-ledger-polish
**Commit:** e537acda05bae923508e60fa99196e3870f34f43

## Stability score

| Metric | Score |
|--------|------:|
| Overall | 95 |
| Architecture | 95 |
| Governance | 74 |
| Replay | 100 |
| Verification | 100 |
| Endpoint consistency | 100 |

Deductions from 100 (overall):
- Orphans: −0
- Shadow flows: −1
- Protected file touches: −1
- Governance warnings: −3
- Missing canonical edges: −0

## Risk summary

| Dimension | Level |
|-----------|-------|
| Overall | **HIGH** |
| Canonical | LOW |
| Replay | LOW |
| Public verify | undefined |
| Governance | HIGH |
| Architecture | MEDIUM |
| Orphan | LOW |
| Mutation | LOW |

## Architecture delta

Baseline: `2026-05-25T12:32:34.408Z`

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

Governance tooling / rules:
- `.cursor/rules/change-governance.mdc`
- `scripts/phase-3b8-architecture-graph.js`
- `.cursor/rules/executia-hard-governance.mdc`

Protected files:
- `scripts/test-runner.js` (scripts/test-runner.js)

## Recommendations

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
- [HIGH] PROTECTED_TOUCH: 1 protected file(s) modified in working tree

