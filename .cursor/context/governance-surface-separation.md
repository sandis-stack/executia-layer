# Phase 5E — Governance surface separation

- **Scope**: Presentation only. Engineering console + shared components.
- **Entry**: `console/engineering.html` with `ex-gov-modes-enabled`.
- **Render**: `engineering-governance-surfaces.js` → five panels `data-mode-panel`.
- **Switch**: `executia-governance-modes.js` perspective rail → `executia:governance-mode-change`.
- **Surfaces**: `ex-op-surface--{governance|authority|intelligence|replay|deploy|findings|audit|retention|public-verify}`.
- **Density**: CSS max-width per `body.ex-gov-mode-*`.
- **Docs**: `docs/governance/governance-surface-separation.md`.
- **Do not**: Change API handlers, SQL, DB writes, or execution state machine.
