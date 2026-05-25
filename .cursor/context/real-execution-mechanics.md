# Phase 6B — Real execution mechanics

- **Transitions**: `services/execution-state-transition.js` — PENDING_REVIEW · APPROVED · BLOCKED · COMMITTED · VERIFIED phase.
- **Commit flow**: `services/execution-commit-flow.js` — REQUEST → VALIDATION → GOVERNANCE REVIEW → EXECUTION COMMIT → CANONICAL RECORD → REPLAY SAFE.
- **Replay service**: `services/execution-replay.js` (API re-exports).
- **APIs**: `POST /api/v1/operator/action`, `POST /api/v1/execution/transition`.
- **Surfaces**: `executia-execution-surfaces.js` + `.css` on operator console.
- **Semantics**: EXECUTION COMMITTED · GOVERNANCE VERIFIED · CANONICAL TRANSITION · REPLAY SAFE.
- **No** duplicate execution engine; uses `commitOperatorTerminalDecision` + audit + replay read-only.
