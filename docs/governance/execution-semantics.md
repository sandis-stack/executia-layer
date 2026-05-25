# Canonical Execution Semantics (Phase 6C)

Mathematically consistent execution vocabulary across EXECUTIA — semantic normalization only. No RPC, SQL, or status enum changes.

## Objective

Execution actions, transitions, and authority states must have:

- deterministic meaning
- canonical interpretation
- semantic consistency
- governance-grade precision

Not UI labels, workflow wording, app semantics, or admin terminology.

## Source of truth

| Layer | Path |
|-------|------|
| Shared semantics | `shared/canonical-execution-semantics.js` |
| Server re-export | `services/canonical-execution-semantics.js` |
| Browser mirror | `public/components/executia-canonical-semantics.js` |

Mechanics (6B) import semantics; they do not redefine them:

- `services/execution-state-transition.js` — transition specs, payloads, traces
- `services/execution-commit-flow.js` — commit flow stages and stage records

## Canonical states

| State | Deterministic meaning | Authority |
|-------|----------------------|-----------|
| REQUESTED | Execution request under jurisdiction | EXECUTION AUTHORITY |
| VALIDATED | Engine validation binding | GOVERNANCE AUTHORITY |
| PENDING_REVIEW | Held for operator governance | GOVERNANCE AUTHORITY |
| APPROVED | Terminal approval | EXECUTION AUTHORITY |
| BLOCKED | Terminal governance block | GOVERNANCE AUTHORITY |
| COMMITTED | Canonical record and ledger | CANONICAL AUTHORITY |
| VERIFIED | Proof and reconciliation truth | PROOF AUTHORITY |
| REPLAY_SAFE | Deterministic replay revalidation | REPLAY AUTHORITY |

Runtime statuses (`PENDING_REVIEW`, `APPROVED`, etc.) map 1:1 via `STATUS_TO_CANONICAL` where defined.

## Canonical actions

| Action | Meaning | Alias (API) |
|--------|---------|-------------|
| VALIDATE | Engine validation | — |
| APPROVE | Governance approval | APPROVE |
| BLOCK | Governance denial | REJECT |
| COMMIT | Canonical record commit | COMMIT |
| VERIFY | Proof verification | VERIFY_PROOF |
| REPLAY | Read-only replay revalidation | VERIFY_REPLAY |
| ESCALATE | Extended review | FREEZE, ESCALATE |

## Authority semantics

| Domain | Role |
|--------|------|
| EXECUTION AUTHORITY | Commitment and approval class |
| GOVERNANCE AUTHORITY | Review, block, escalate |
| CANONICAL AUTHORITY | Record and transition truth |
| REPLAY AUTHORITY | Deterministic continuity check |
| PROOF AUTHORITY | Material truth verification |

## Consequence, replay, proof

- **Consequence** (`CONSEQUENCE_SEMANTICS`): irreversible binding, accountability, trace, continuity.
- **Replay** (`REPLAY_SEMANTICS`): read-only revalidation, canonical continuity, `REPLAY_SAFE` result.
- **Proof** (`PROOF_SEMANTICS`): execution truth at verify, replay-safe continuity when chain complete.

## Operator jurisdiction

`OPERATOR_JURISDICTION`: scope within execution authority, governance supremacy, material accountability, read-only replay/proof verify.

## Preserved presentation layers

Phases 5H–5M and 6A (rhythm, consequence, memory, intent, trust, sovereignty, compression) remain unchanged in behavior; 6C deduplicates vocabulary used by transition payloads and operator surfaces.

## Verification

```bash
npm test
.cursor/hooks/pre-deploy-check.sh
```
