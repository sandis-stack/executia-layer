# EXECUTIA Institutional Multi-Surface Architecture

EXECUTIA is **unified execution governance infrastructure** with **multiple institutional operational surfaces** — not a single app, SaaS product, or documentation portal.

## Canonical surfaces (eight)

| Surface | Route | Domain |
|---------|-------|--------|
| Execution | `/execution-test/` | Institutional — **engine home** |
| Governance | `/execution-demo.html` | Institutional |
| Proof | `/public-proof/` | Institutional |
| Replay | `/proof-explorer/` | Institutional |
| Health | `/health/` | Operational |
| Operations | `/console/operations.html` | Operational |
| Engineering | `/console/engineering.html` | Operational |
| Request | `/request-pilot/` | Institutional |

## Unified infrastructure (one)

| Layer | Module |
|-------|--------|
| Design system | `executia-design-system.css` |
| Surface registry | `executia-institutional-surfaces.js` |
| Public shell | `executia-institutional-environment.js` |
| Console shell | `engine-shell.js` + `executia-governance-core.js` |
| Language | `LANGUAGE` in surfaces registry |
| Navigation | Shared 8-surface primary nav; context links secondary |

## Separation preserved

- Each surface keeps its own page and institutional role.
- Execution remains **central execution identity** (brand links to engine home) — not the only route.
- Operational surfaces (Health, Operations, Engineering) are visually grouped, not merged into one ENGINE dashboard.

## Context navigation (subordinate)

Governance console, ledger history, audit verify, audit chain, operator authority — deep tools under the surface hierarchy, not competing products.

## Non-goals

- Collapsing all UX into `/dashboard` or a single ENGINE page
- Product-style tab apps with disconnected styling
- Runtime or API behavior changes from presentation unification
