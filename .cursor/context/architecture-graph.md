# EXECUTIA Architecture Graph Context (Phase 3B8)

## Purpose

The architecture graph is a **local, read-only map** of EXECUTIA endpoints, canonical authority paths, replay dependencies, governance tooling, and drift signals. It does not change runtime behavior.

Generate:

```bash
node scripts/phase-3b8-architecture-graph.js
```

Outputs:

- `architecture-graph/latest.json`
- `architecture-graph/<timestamp>.json`

## What the graph contains

| Section | Meaning |
|---------|---------|
| `nodes` | Endpoints, services, SQL authority files, governance scripts, Cursor context |
| `edges` | Declared relationships (`uses`, `reads`, `defers_to`, `protects`, …) |
| `findings` | Institutional summary for review |

## Canonical authority mapping

| Anchor | Node |
|--------|------|
| Verification authority | `GET /api/v1/audit/verify` |
| Replay layer | `GET /api/v1/execution/replay` |
| Public verification | `GET /api/v1/verify/:execution_id` |

Material truth remains `ledger_entries` + supplemental audit chain (not redefined by the graph).

## Shadow flow detection

`findings.shadow_flow_candidates` lists files referencing:

- `/api/v1/ledger-verify`
- `/api/v1/core-ledger-verify`
- Legacy event names `EXECUTION_CREATED`, `OPERATOR_DECISION_COMMITTED`

Exemptions: rollback SQL, docs, governance scripts, compat wrapper files.

## Orphan endpoint detection

`findings.orphan_candidates` lists API handlers **not connected** (via graph edges) to:

- Canonical audit verify
- Execution replay
- Public verify
- Governance layer (3B5–3B8)

Orphans are not automatically wrong — they may be operator, pilot, or entry routes — but they require conscious classification.

## Architecture intelligence

Use the graph to:

1. Review deploy scope before production
2. Compare `latest.json` across commits (drift in orphans/shadows)
3. Onboard engineers without reading every route file
4. Feed Cursor context for bounded refactors

## Pre-deploy chain

```text
npm test → 3B5 governance → 3B7 drift → 3B8 graph → 3B6 engineering ledger
```

## Rules

- Graph is append-only by timestamp; do not edit historical JSON
- No secrets in graph output
- Local tooling only — not a public API
