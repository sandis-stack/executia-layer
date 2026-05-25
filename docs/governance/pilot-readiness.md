# Institutional Pilot & Proof Readiness

Prepare EXECUTIA for institutional conversations, demos, and pilot onboarding — stability and clarity only, no new governance concepts.

## Proof Engine (`/execution-demo.html`)

Product proof surface:

- Institutional example selector (four canonical pilots)
- Flow: REQUEST → VALIDATION → GOVERNANCE REVIEW → EXECUTION COMMIT → REPLAY SAFE → PROOF VERIFIED
- Posture panel: execution state + Integrity / Replay / Truth lines
- No debug traces or dashboard chrome

## Institutional pilot surface (`/request-pilot/`)

Fields:

- Organization
- Execution-critical process
- Governance risk
- Deterministic execution objective
- Replay requirement
- Proof requirement
- Contact / Email

Canonical example buttons pre-fill intake.

## Canonical pilot examples

| Example | Focus |
|---------|--------|
| Procurement Governance | Award and contract commitment |
| Payment Approval Governance | Settlement and dual approval |
| Compliance Execution Verification | Control execution before reporting |
| Infrastructure Execution Approval | Operational change approval |

## Replay-safe public proof examples

On `/public-proof/` — four cards showing:

Execution request → Governance validation → Approval or block → Execution commit → Replay-Safe Verification → Canonical proof continuity

## Global vocabulary (`AI_CLARITY`)

- Execution Governance Infrastructure
- Deterministic Execution
- Replay-Safe Verification
- Execution Integrity
- Execution-Time Truth
- Canonical Governance

## Modules

| File | Role |
|------|------|
| `executia-institutional-environment.js` | Shell, nav, demo flow, AI JSON-LD |
| `executia-pilot-readiness.js` | Pilot/proof examples, state labels, keyword meta |

## State semantics (public)

`STATE_LABELS` in pilot-readiness mirrors canonical states — deterministic interpretation, no duplicate authority wording.

## Verification

```bash
npm test
.cursor/hooks/pre-deploy-check.sh
```
