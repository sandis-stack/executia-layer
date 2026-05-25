# EXECUTIA Execution Intelligence Report

Phase 3B9 — governed deploy intelligence (local tooling only).

**Generated:** 2026-05-25T07:05:11.523Z
**Branch:** phase-3b3-ledger-polish
**Commit:** 7ff3556be9e4150322a6dc3eb087a1b898684b75

## Stability score

| Metric | Score |
|--------|------:|
| Overall | 42 |
| Architecture | 41 |
| Governance | 82 |
| Replay | 100 |
| Verification | 100 |
| Endpoint consistency | 24 |

Deductions from 100 (overall):
- Orphans: −54
- Shadow flows: −1
- Protected file touches: −0
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
| Orphan | HIGH |
| Mutation | LOW |

## Architecture delta

Baseline: `2026-05-25T07:05:10.506Z`

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

_No governance or protected paths in current git diff._

## Recommendations

- Classify orphan API endpoints in architecture graph before large refactors or route removal.
- Defer deploy until stability improves (reduce orphans, shadows, or protected touches).

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
- [MEDIUM] ORPHAN_ENDPOINTS: 54 unclassified API endpoint(s) disconnected from canonical anchors
- [MEDIUM] SHADOW_FLOWS: 1 shadow flow reference(s) in codebase

