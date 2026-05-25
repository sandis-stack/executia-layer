# Phase 5F — Execution identity

- **Feel**: execution authority — NOT portal, analytics, dashboard, tooling, admin console.
- **Layer**: `executia-execution-identity.js` + `.css`; body `ex-ex-id-enabled`.
- **States**: EXECUTION VERIFIED, CANONICAL STATE ACTIVE, REPLAY SAFE, GOVERNANCE INTEGRITY VERIFIED, EXECUTION SURFACE GOVERNED, EXECUTION AUTHORITY ACTIVE, EXECUTION INTEGRITY MAINTAINED.
- **Tiers**: primary = execution authority, secondary = governance state, tertiary = diagnostics.
- **API**: `applyIdentity(ctx)` — presentation only; no runtime/SQL/API/DB changes.
- **Language**: `executia-governance-language.js` — Execution Authority brand, AUTHORITY nav.
- **Engineering**: `console/engineering.html`, `public/console/engineering.html`.
- **Docs**: `docs/governance/execution-identity.md`.
