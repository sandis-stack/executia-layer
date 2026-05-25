# EXECUTIA Endpoint Taxonomy (Phase 4B)

## Purpose

Classify every `api/v1/**` route into a **governed architecture layer** so the architecture graph can distinguish canonical authority from projections, operator surfaces, and true unknowns.

Classification is **local tooling only** — it does not change runtime API behavior.

## Endpoint classes

| Class | Meaning |
|-------|---------|
| `canonical_authority` | Material verification truth (`audit/verify`, ledger/audit services) |
| `replay_layer` | Read-only deterministic execution replay |
| `public_verification` | Public verify routes (no privileged payload) |
| `governance_execution` | Execution submit / commit paths; `POST execution/transition` (canonical semantics via commit flow) |
| `governance_projection` | Registry, rules, evolution, org/project surfaces |
| `proof_projection` | Proof package/export (legacy-aware projection) |
| `ledger_projection` | Ledger settlement, audit-ledger, truth-anchor |
| `audit_projection` | Audit timeline, repair, export, real-time audit |
| `operator_control` | Operator queue, decisions, auth, session |
| `health_monitoring` | Health, metrics, live-state, alerts |
| `demo_surface` | Demo/config public entry |
| `request_intake` | Pilot and lead intake |
| `history_projection` | History, timeline, trace |
| `engineering_intelligence` | Engineering intelligence aggregate API |
| `legacy_projection` | Compat ledger-verify / core-ledger-* wrappers |
| `local_tooling` | Reserved for non-API tooling nodes |
| `unknown` | Unclassified — **only class that counts as graph orphan** |

## Orphan rule

An API endpoint is an **orphan candidate** only when `classification === unknown`.

All other classes are **governed and non-orphan** for architecture intelligence purposes.

## Cursor rules

1. Do not delete endpoints solely because they appear in taxonomy — classify first.
2. Do not treat `proof_projection` or `legacy_projection` as canonical authority.
3. New routes must be assigned a taxonomy class in `phase-3b8-architecture-graph.js` before deploy.
4. Prefer extending taxonomy over leaving routes in `unknown`.

## Canonical vs projection

- **Canonical authority** defines verification and material hash truth.
- **Projection** endpoints read or present truth without redefining it.
- **Operator control** mutates governance state under institutional rules — not canonical verification.
