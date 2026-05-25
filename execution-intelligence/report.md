# EXECUTIA Execution Intelligence Report

Phase 3B9 — governed deploy intelligence (local tooling only).

**Generated:** 2026-05-25T06:45:30.613Z
**Branch:** phase-3b3-ledger-polish
**Commit:** c092ce43b5184056ee61591fa4e3986300b829d5

## Stability score

| Metric | Score |
|--------|------:|
| Overall | 40 |
| Architecture | 41 |
| Governance | 68 |
| Replay | 100 |
| Verification | 100 |
| Endpoint consistency | 24 |

Deductions from 100 (overall):
- Orphans: −54
- Shadow flows: −1
- Protected file touches: −1
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

Baseline: `2026-05-25T06:45:29.999Z`

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
- `scripts/phase-3b9-execution-intelligence.js`

Protected files:
- `scripts/test-runner.js` (scripts/test-runner.js)

## Recommendations

- Classify orphan API endpoints in architecture graph before large refactors or route removal.
- Obtain explicit approval for protected file modifications before deploy.
- Defer deploy until stability improves (reduce orphans, shadows, or protected touches).

## Engineering Console Status

- DETECTED: true
- GOVERNED: true
- READ_ONLY: true
- LIVE_REFRESH_ENABLED: true

## Deploy readiness

**Status:** REVIEW_REQUIRED

### Findings
- [MEDIUM] ORPHAN_ENDPOINTS: 54 unclassified API endpoint(s) disconnected from canonical anchors
- [MEDIUM] SHADOW_FLOWS: 1 shadow flow reference(s) in codebase
- [HIGH] PROTECTED_TOUCH: 1 protected file(s) modified in working tree

