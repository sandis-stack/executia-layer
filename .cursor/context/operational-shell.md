# EXECUTIA Operational Shell (Phase 5B)

Full spec: `docs/governance/operational-shell.md`.

## Shell stack

1. `engine-shell.css` + `engine-shell.js` — EXECUTIA™, Execution Governance System, nav
2. `executia-design-system.css` — typography, spacing (8–64px), tiers
3. `executia-governance-shell.css` — primary/secondary nav layout
4. `executia-operational-shell.css` + `.js` — authority band, surfaces, rhythm

Body: `ex-engine-shell ex-ds-governance-shell ex-op-shell ex-operational-surface ex-ds-surface`

## Primary navigation

CONTROL · GOVERNANCE · ENGINEERING (`EXECUTIA_GOVERNANCE_LANGUAGE.NAV.PRIMARY`)

Secondary contextual: Ledger, Audit, Operations, Proofs, Health.

## Authority band

`#exOpGovState` (governance state) · `#exOpCanonState` (canonical state)

`EXECUTIA_OPERATIONAL_SHELL.setAuthorityState(govLine, canonLine)`

## Section hierarchy (surfaces)

| Tier | Surfaces |
|------|----------|
| Primary | `--governance`, `--authority` |
| Secondary | `--intelligence`, `--replay`, `--deploy` |
| Tertiary | `--findings` + `--diagnostics` (classes on lines) |

## Interaction rhythm

Opacity 0.2s only; no jitter/animations; `prefers-reduced-motion` respected.

## Reference

`console/engineering.html`, `public/console/engineering.html`

No API/SQL/runtime changes — shell architecture only.
