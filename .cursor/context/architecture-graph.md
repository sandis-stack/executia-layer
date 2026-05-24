# EXECUTIA Architecture Graph Context (Phase 3B8 / 3B8-A)

## Purpose

The architecture graph is a **local, read-only map** of EXECUTIA endpoints, canonical authority paths, replay dependencies, governance tooling, and drift signals. It does not change runtime behavior.

Generate:

```bash
node scripts/phase-3b8-architecture-graph.js
```

Outputs:

- `architecture-graph/latest.json`
- `architecture-graph/report.md` — **read this before large refactors**
- `architecture-graph/<timestamp>.json`

## Cursor rules (3B8-A)

1. **Use the graph report before large refactors** — open `architecture-graph/report.md` for layer counts, orphans, and shadow flows.
2. **Do not treat unknown endpoints as canonical** — only `canonical_authority` nodes (audit verify, ledger/audit services, authority SQL) define verification truth.
3. **Orphans require classification before deletion** — `findings.orphan_candidates` lists unclassified APIs only; classify or document before removing routes.

## What the graph contains

| Section | Meaning |
|---------|---------|
| `nodes` | Endpoints, services, SQL, governance — each with `classification` |
| `edges` | Declared relationships (`uses`, `reads`, `defers_to`, `protects`, …) |
| `findings` | Institutional summary + `summary_counts` + cleanup hints |

## Node classifications

| Label | Use |
|-------|-----|
| `canonical_authority` | Material verification truth |
| `replay_layer` | Execution replay |
| `public_verification` | Public verify |
| `governance_layer` | 3B5–3B7, Cursor rules |
| `architecture_memory` | Docs, context |
| `proof_projection` | Proof APIs (legacy-aware) |
| `legacy_projection` | Compat wrappers, rollback SQL |
| `ui_console` | Console / dashboard UI |
| `local_tooling` | Graph generator |
| `unknown` | Needs human classification |

## Canonical authority mapping

| Anchor | Node |
|--------|------|
| Verification authority | `GET /api/v1/audit/verify` |
| Replay layer | `GET /api/v1/execution/replay` |
| Public verification | `GET /api/v1/verify/:execution_id` |

Material truth remains `ledger_entries` + supplemental audit chain (not redefined by the graph).

## Shadow flow detection (reduced)

`findings.shadow_flow_candidates` — line-level, with suppression for scanner files, governance docs, rollback SQL, and LEGACY comments.

## Orphan detection (reduced)

Only `unknown` API endpoints disconnected from anchors. Proof, UI, docs, and tooling paths are excluded.

## Pre-deploy chain

```text
npm test → 3B5 governance → 3B7 drift → 3B8 graph → 3B6 engineering ledger
```

## Rules

- Graph is append-only by timestamp; do not edit historical JSON
- `report.md` is regenerated each run — safe to commit for review
- No secrets in graph output
- Local tooling only — not a public API
