# EXECUTIA Execution Intelligence (Phase 3B9)

## Purpose

Execution intelligence is a **local, read-only layer** that predicts engineering risk, compares architecture evolution, scores stability, and produces governed deploy guidance. It does not change runtime APIs, SQL, or databases.

Generate:

```bash
node scripts/phase-3b9-execution-intelligence.js
```

Outputs:

- `execution-intelligence/latest.json`
- `execution-intelligence/report.md`
- `execution-intelligence/<timestamp>.json`

## What it combines

| Input | Role |
|-------|------|
| `architecture-graph/latest.json` | Nodes, edges, orphans, shadows |
| `architecture-graph/report.md` | Human graph summary |
| `engineering-ledger/` latest snapshot | Prior risk / protected touches |
| Git working tree | Current deploy scope |
| `.cursor/context/protected-files.md` | Institutional protected patterns |

## Cursor rules

1. **Read `execution-intelligence/report.md` before deploy** — stability, risk, and deploy readiness.
2. **Do not treat LOW stability as safe for canonical changes** — check `canonical_risk` and `deploy_intelligence` separately.
3. **Architecture delta** — review new orphans/shadows vs previous graph snapshot before large refactors.
4. **Replayable engineering state** — intelligence is deterministic from local inputs only; re-run after graph/ledger updates.

## Stability scoring

Starts at **100**, subtracts (clamped 0–100):

- Orphan count
- Shadow flow count
- Protected file modifications (git)
- Governance warning signals
- Missing required canonical graph edges

Sub-scores: architecture, governance, replay, verification, endpoint consistency.

## Risk levels

`LOW` | `MEDIUM` | `HIGH` | `CANONICAL`

- Protected canonical surfaces → `HIGH` / `CANONICAL`
- Replay or public verify touched → `HIGH`
- Docs-only diff → `LOW`

## Pre-deploy chain

```text
npm test → 3B5 → 3B7 → 3B8 graph → 3B9 intelligence → 3B6 engineering ledger
```

## Predictive governance

Use intelligence to:

- Anticipate deploy review scope
- Track architecture evolution (delta)
- Align engineering ledger risk with graph findings
- Block casual deploy when readiness is `REVIEW_REQUIRED` or `BLOCKED`
