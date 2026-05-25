# EXECUTIA Execution Intelligence Report

Phase 3B9 — governed deploy intelligence (local tooling only).

**Generated:** 2026-05-25T06:28:49.387Z
**Branch:** phase-3b3-ledger-polish
**Commit:** e58b8be02586a7b3ef9aaa2494b77efc94195945

## Stability score

| Metric | Score |
|--------|------:|
| Overall | 38 |
| Architecture | 40 |
| Governance | 60 |
| Replay | 100 |
| Verification | 100 |
| Endpoint consistency | 23 |

Deductions from 100 (overall):
- Orphans: −55
- Shadow flows: −1
- Protected file touches: −2
- Governance warnings: −4
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
| Orphan | HIGH |
| Mutation | LOW |

## Architecture delta

Baseline: `2026-05-25T06:28:48.862Z`

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
- `scripts/phase-3b8-architecture-graph.js`

Protected files:
- `scripts/test-runner.js` (scripts/test-runner.js)
- `vercel.json` (vercel.json)

## Recommendations

- Classify orphan API endpoints in architecture graph before large refactors or route removal.
- Obtain explicit approval for protected file modifications before deploy.
- Defer deploy until stability improves (reduce orphans, shadows, or protected touches).

## Deploy readiness

**Status:** REVIEW_REQUIRED

### Findings
- [MEDIUM] ORPHAN_ENDPOINTS: 55 unclassified API endpoint(s) disconnected from canonical anchors
- [MEDIUM] SHADOW_FLOWS: 1 shadow flow reference(s) in codebase
- [HIGH] PROTECTED_TOUCH: 2 protected file(s) modified in working tree

