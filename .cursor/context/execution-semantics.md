# Phase 6C — Canonical Execution Semantics

- **Shared**: `shared/canonical-execution-semantics.js` — states, actions, authority, consequence, replay, proof, jurisdiction.
- **Server**: `services/canonical-execution-semantics.js` re-exports; wired into `execution-state-transition.js` and `execution-commit-flow.js`.
- **Browser**: `executia-canonical-semantics.js` before `executia-execution-surfaces.js` on operator console.
- **No runtime logic changes** — semantic normalization and payload `canonical` meta only; API action names unchanged (`REJECT`, `VERIFY_REPLAY`, etc.).
- **Canonical states**: REQUESTED → VALIDATED → PENDING_REVIEW → APPROVED | BLOCKED → COMMITTED → VERIFIED → REPLAY_SAFE.
- **Tests**: Phase 6C block in `scripts/test-runner.js`; docs: `docs/governance/execution-semantics.md`.
