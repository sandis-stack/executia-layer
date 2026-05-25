# EXECUTIA Governance Modes (Phase 5D)

Spec: `docs/governance/governance-modes.md`.

- JS: `public/components/executia-governance-modes.js` → `EXECUTIA_GOVERNANCE_MODES`
- CSS: `public/components/executia-governance-modes.css`
- Body: `ex-gov-modes-enabled` + `data-op-page` for default mode
- Modes: `executive`, `operational`, `engineering`, `audit`, `public-verify`
- Panels: `data-mode-panel` + `engineering-governance-surfaces.js` (Phase 5E real render)
- Switch: perspective rail, `applyMode()`, event `executia:governance-mode-change`

Density: executive (lowest) → engineering (highest) → public-verify (minimal proof).

No runtime/API/SQL changes.
