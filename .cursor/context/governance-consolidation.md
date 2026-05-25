# Phase 5G — Governance consolidation

- **One JS canonical module**: `executia-governance-core.js` (language, identity, `opSurface`, `measureBlock`, `applyPresentation`).
- **One CSS entry**: `executia-governed-presentation.css` (imports design system, nav, core, operational, modes).
- **Deprecated**: separate posture band; `executia-execution-identity.css` imports core only.
- **Shell**: `executia-operational-shell.js` mounts via core; `engine-shell.js` reads `LANGUAGE.NAV` from core.
- **Surfaces**: `engineering-governance-surfaces.js` delegates render helpers to core — no duplicate esc/tier/opSurface.
- **States**: max 5 priority frames in authority band.
- **HTML**: `console/engineering.html` + `public/console/engineering.html` use governed-presentation + governance-core only.
- **No** runtime/SQL/API/DB changes.
