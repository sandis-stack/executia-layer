# EXECUTIA Execution Intelligence Report

Phase 3B9 — governed deploy intelligence (local tooling only).

**Generated:** 2026-06-03T07:54:46.283Z
**Branch:** main
**Commit:** 7647a1a87eef0cc86edcae1c977f7019fa6cbe20

## Stability score

| Metric | Score |
|--------|------:|
| Overall | 98 |
| Architecture | 95 |
| Governance | 94 |
| Replay | 100 |
| Verification | 100 |
| Endpoint consistency | 100 |

Deductions from 100 (overall):
- Orphans: −0
- Shadow flows: −1
- Protected file touches: −0
- Governance warnings: −1
- Missing canonical edges: −0

## Risk summary

| Dimension | Level |
|-----------|-------|
| Overall | **MEDIUM** |
| Canonical | LOW |
| Replay | LOW |
| Public verify | undefined |
| Governance | LOW |
| Architecture | MEDIUM |
| Orphan | LOW |
| Mutation | LOW |

## Architecture delta

Baseline: `2026-06-03T07:38:02.496Z`

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
- [MEDIUM] SHADOW_FLOWS: 1 shadow flow reference(s) in codebase

