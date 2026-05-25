# Phase 5I — Execution consequence

- **Module**: `executia-execution-consequence.js` + `.css` (in governed-presentation bundle).
- **Enable**: `ex-consequence-enabled`; script after governance-core + rhythm.
- **Frames**: EXECUTION COMMITTED · GOVERNANCE TRANSITION VERIFIED · CANONICAL STATE UPDATED · EXECUTION CONSEQUENCE APPLIED · AUTHORITY CONFIRMED.
- **API**: `applyConsequence(ctx)` · `frameOperatorAction(action)` · `bindGovernedActs(root)`.
- **Hierarchy**: primary consequence · secondary transition · tertiary metadata.
- **Acts**: `data-ex-consequence-act` + `.ex-consequence-act` — not dashboard buttons.
- **Engineering**: consequence band under rhythm; derived from intelligence readiness/risk.
- **No** runtime/SQL/API/DB changes.
