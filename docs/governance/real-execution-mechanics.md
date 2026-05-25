# Real Execution Mechanics (Phase 6B)

Governed execution behavior across operator, replay, and proof paths — mechanics and semantics, not presentation-only layers.

## Objective

EXECUTIA operates as:

- real execution authority
- governed execution infrastructure
- deterministic execution control

## Execution state transition system

| Status | Role |
|--------|------|
| PENDING_REVIEW | Awaiting governance review |
| APPROVED | Authority confirmed |
| BLOCKED | Governed block |
| COMMITTED | Canonical record committed |
| VERIFIED | Reconciliation / proof verification phase |

Service: `services/execution-state-transition.js`

Semantics: EXECUTION COMMITTED · GOVERNANCE VERIFIED · CANONICAL TRANSITION · EXECUTION AUTHORITY CONFIRMED · REPLAY SAFE · EXECUTION CONTINUITY MAINTAINED

## Execution commit flow

```
REQUEST → VALIDATION → GOVERNANCE REVIEW → EXECUTION COMMIT → CANONICAL RECORD → REPLAY SAFE
```

Service: `services/execution-commit-flow.js`  
Orchestrates `commitOperatorTerminalDecision`, proof governance audit, and read-only replay assessment.

## APIs

| Endpoint | Role |
|----------|------|
| `POST /api/v1/operator/action` | Operator transitions (delegates to commit flow) |
| `POST /api/v1/execution/transition` | Canonical transition API |
| `GET /api/v1/execution/replay` | Replay governance (service-backed) |

## Canonical execution surfaces

| Surface | Role |
|---------|------|
| Execution Approval Surface | APPROVE / REJECT |
| Governance Transition Surface | ESCALATE / FREEZE |
| Canonical Commit Surface | COMMIT from APPROVED |
| Replay Verification Surface | VERIFY_REPLAY |
| Proof Authority Surface | VERIFY_PROOF |

Module: `public/components/executia-execution-surfaces.js`

## Preserved

Presentation layers (6A compression, 5L sovereignty, 5K intent, etc.) remain; operator mechanics now materialize state through governed services.
