# EXECUTIA Execution Intelligence Report

Phase 3B9 — governed deploy intelligence (local tooling only).

**Generated:** 2026-05-25T11:17:18.958Z
**Branch:** phase-3b3-ledger-polish
**Commit:** 7cb44bfe66d5834d5742d5e047e210d323693430

## Stability score

| Metric | Score |
|--------|------:|
| Overall | 95 |
| Architecture | 94 |
| Governance | 82 |
| Replay | 100 |
| Verification | 100 |
| Endpoint consistency | 99 |

Deductions from 100 (overall):
- Orphans: −1
- Shadow flows: −1
- Protected file touches: −0
- Governance warnings: −3
- Missing canonical edges: −0

## Risk summary

| Dimension | Level |
|-----------|-------|
| Overall | **MEDIUM** |
| Canonical | LOW |
| Replay | LOW |
| Public verify | undefined |
| Governance | MEDIUM |
| Architecture | MEDIUM |
| Orphan | LOW |
| Mutation | LOW |

## Architecture delta

Baseline: `2026-05-25T11:17:17.898Z`

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
- `scripts/phase-3b7-architecture-drift.js`

## Recommendations

- Maintain engineering ledger and architecture graph snapshots each pre-deploy run.

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

**Status:** CAUTION

### Findings
- [MEDIUM] ORPHAN_ENDPOINTS: 1 unclassified API endpoint(s) disconnected from canonical anchors
- [MEDIUM] SHADOW_FLOWS: 1 shadow flow reference(s) in codebase

