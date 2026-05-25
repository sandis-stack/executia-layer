# EXECUTIA Architecture Graph Report

Phase 3B8-A — human-readable reduction (local tooling only).

## Generated at

- **Timestamp:** 2026-05-25T11:14:09.941Z
- **Branch:** phase-3b3-ledger-polish
- **Commit:** 4247c9344fa9b0ded4a6d66c6593433d40fcbb02

## Canonical authority

- `api/v1/audit/verify.js` — /api/v1/audit/verify (`endpoint:audit/verify`)
- `services/audit.js` — Supplemental audit service (`service:audit`)
- `services/ledger.js` — Ledger material authority (`service:ledger`)
- `sql/012_supplemental_audit_chain.sql` — Supplemental audit chain (`sql:supplemental_audit`)
- `sql/011_ledger_hash_authority.sql` — Ledger hash authority (`sql:ledger_authority`)
- `audit_events` — audit_events table (`store:audit_events`)
- `ledger_entries` — ledger_entries table (`store:ledger_entries`)

## Replay layer

- `api/v1/execution/replay.js` — /api/v1/execution/replay (`endpoint:execution/replay`)

## Public verification

- `api/v1/verify/[execution_id].js` — /api/v1/verify/execution_id (`endpoint:verify/execution_id`)
- `api/v1/verify.js` — /api/v1/verify (`endpoint:verify`)

## Governance layer

- `scripts/phase-3b5-governance-check.js` — Phase 3B5 governance check (`governance:phase-3b5`)
- `scripts/phase-3b6-engineering-ledger.js` — Phase 3B6 engineering ledger (`governance:phase-3b6`)
- `scripts/phase-3b7-architecture-drift.js` — Phase 3B7 architecture drift (`governance:phase-3b7`)
- `git` — Git working tree (`store:git_state`)
- `engineering-ledger` — Engineering ledger snapshots (`store:engineering_ledger`)
- `scripts/phase-3b9-execution-intelligence.js` — Phase 3B9 execution intelligence (`governance:phase-3b9`)
- `.cursor/rules/ai-operator-governance.mdc` — .cursor/rules/ai-operator-governance.mdc (`cursor:.cursor/rules/ai-operator-governance.mdc`)
- `.cursor/rules/change-governance.mdc` — .cursor/rules/change-governance.mdc (`cursor:.cursor/rules/change-governance.mdc`)
- `.cursor/rules/deployment-rules.mdc` — .cursor/rules/deployment-rules.mdc (`cursor:.cursor/rules/deployment-rules.mdc`)
- `.cursor/rules/executia-governance.mdc` — .cursor/rules/executia-governance.mdc (`cursor:.cursor/rules/executia-governance.mdc`)
- `.cursor/rules/security-rules.mdc` — .cursor/rules/security-rules.mdc (`cursor:.cursor/rules/security-rules.mdc`)
- `.cursor/rules/supabase-rules.mdc` — .cursor/rules/supabase-rules.mdc (`cursor:.cursor/rules/supabase-rules.mdc`)
- `.cursor/rules/vendor-safety.mdc` — .cursor/rules/vendor-safety.mdc (`cursor:.cursor/rules/vendor-safety.mdc`)
- `.cursor/rules/vercel-rules.mdc` — .cursor/rules/vercel-rules.mdc (`cursor:.cursor/rules/vercel-rules.mdc`)

## Legacy projection layer

- `api/v1/core-ledger-commit.js` — /api/v1/core-ledger-commit (`endpoint:core-ledger-commit`)
- `api/v1/core-ledger-repair.js` — /api/v1/core-ledger-repair (`endpoint:core-ledger-repair`)
- `api/v1/core-ledger-verify.js` — /api/v1/core-ledger-verify (legacy compat) (`endpoint:core-ledger-verify`)
- `api/v1/ledger-verify.js` — /api/v1/ledger-verify (legacy compat) (`endpoint:ledger-verify`)

## Proof projection (legacy-aware)

- `api/v1/proof/certificate-pdf.js` — /api/v1/proof/certificate-pdf (`endpoint:proof/certificate-pdf`)
- `api/v1/proof/certificate.js` — /api/v1/proof/certificate (`endpoint:proof/certificate`)
- `api/v1/proof/commit.js` — /api/v1/proof/commit (`endpoint:proof/commit`)
- `api/v1/proof/execution.js` — /api/v1/proof/execution (`endpoint:proof/execution`)
- `api/v1/proof/export.js` — /api/v1/proof/export (`endpoint:proof/export`)
- `api/v1/proof/merkle-root.js` — /api/v1/proof/merkle-root (`endpoint:proof/merkle-root`)
- `api/v1/proof/package.js` — /api/v1/proof/package (`endpoint:proof/package`)
- `api/v1/proof/pdf.js` — /api/v1/proof/pdf (`endpoint:proof/pdf`)
- `api/v1/proof/summary.js` — /api/v1/proof/summary (`endpoint:proof/summary`)
- `api/v1/proof/timestamp-anchor.js` — /api/v1/proof/timestamp-anchor (`endpoint:proof/timestamp-anchor`)
- `api/v1/proof/verify.js` — /api/v1/proof/verify (`endpoint:proof/verify`)
- `api/v1/proof.js` — /api/v1/proof (`endpoint:proof`)

## UI console

_None mapped._

## Architecture memory

- `.cursor/context/architecture-graph.md` — Architecture graph context (`context:architecture-graph`)
- `architecture-graph/latest.json` — Architecture graph artifact (`store:architecture_graph`)
- `execution-intelligence/latest.json` — Execution intelligence artifact (`store:execution_intelligence`)
- `.cursor/context/ai-operator-governance.md` — .cursor/context/ai-operator-governance.md (`cursor:.cursor/context/ai-operator-governance.md`)
- `.cursor/context/architecture-drift.md` — .cursor/context/architecture-drift.md (`cursor:.cursor/context/architecture-drift.md`)
- `.cursor/context/architecture-graph.md` — .cursor/context/architecture-graph.md (`cursor:.cursor/context/architecture-graph.md`)
- `.cursor/context/architecture.md` — .cursor/context/architecture.md (`cursor:.cursor/context/architecture.md`)
- `.cursor/context/artifact-governance.md` — .cursor/context/artifact-governance.md (`cursor:.cursor/context/artifact-governance.md`)
- `.cursor/context/artifact-retention.md` — .cursor/context/artifact-retention.md (`cursor:.cursor/context/artifact-retention.md`)
- `.cursor/context/canonical-compression.md` — .cursor/context/canonical-compression.md (`cursor:.cursor/context/canonical-compression.md`)
- `.cursor/context/change-classification.md` — .cursor/context/change-classification.md (`cursor:.cursor/context/change-classification.md`)
- `.cursor/context/design-system.md` — .cursor/context/design-system.md (`cursor:.cursor/context/design-system.md`)
- `.cursor/context/endpoint-taxonomy.md` — .cursor/context/endpoint-taxonomy.md (`cursor:.cursor/context/endpoint-taxonomy.md`)
- `.cursor/context/engineering-ledger.md` — .cursor/context/engineering-ledger.md (`cursor:.cursor/context/engineering-ledger.md`)
- `.cursor/context/execution-consequence.md` — .cursor/context/execution-consequence.md (`cursor:.cursor/context/execution-consequence.md`)
- `.cursor/context/execution-identity.md` — .cursor/context/execution-identity.md (`cursor:.cursor/context/execution-identity.md`)
- `.cursor/context/execution-intelligence.md` — .cursor/context/execution-intelligence.md (`cursor:.cursor/context/execution-intelligence.md`)
- `.cursor/context/execution-intent.md` — .cursor/context/execution-intent.md (`cursor:.cursor/context/execution-intent.md`)
- `.cursor/context/execution-memory.md` — .cursor/context/execution-memory.md (`cursor:.cursor/context/execution-memory.md`)
- `.cursor/context/execution-rhythm.md` — .cursor/context/execution-rhythm.md (`cursor:.cursor/context/execution-rhythm.md`)
- `.cursor/context/execution-semantics.md` — .cursor/context/execution-semantics.md (`cursor:.cursor/context/execution-semantics.md`)
- `.cursor/context/execution-sovereignty.md` — .cursor/context/execution-sovereignty.md (`cursor:.cursor/context/execution-sovereignty.md`)
- `.cursor/context/execution-trust.md` — .cursor/context/execution-trust.md (`cursor:.cursor/context/execution-trust.md`)
- `.cursor/context/final-institutional-refinement.md` — .cursor/context/final-institutional-refinement.md (`cursor:.cursor/context/final-institutional-refinement.md`)
- `.cursor/context/governance-consolidation.md` — .cursor/context/governance-consolidation.md (`cursor:.cursor/context/governance-consolidation.md`)
- `.cursor/context/governance-modes.md` — .cursor/context/governance-modes.md (`cursor:.cursor/context/governance-modes.md`)
- `.cursor/context/governance-surface-separation.md` — .cursor/context/governance-surface-separation.md (`cursor:.cursor/context/governance-surface-separation.md`)
- `.cursor/context/institutional-completion.md` — .cursor/context/institutional-completion.md (`cursor:.cursor/context/institutional-completion.md`)
- `.cursor/context/institutional-product-completion.md` — .cursor/context/institutional-product-completion.md (`cursor:.cursor/context/institutional-product-completion.md`)
- `.cursor/context/institutional-ui.md` — .cursor/context/institutional-ui.md (`cursor:.cursor/context/institutional-ui.md`)
- `.cursor/context/operational-shell.md` — .cursor/context/operational-shell.md (`cursor:.cursor/context/operational-shell.md`)
- `.cursor/context/pilot-readiness.md` — .cursor/context/pilot-readiness.md (`cursor:.cursor/context/pilot-readiness.md`)
- `.cursor/context/production.md` — .cursor/context/production.md (`cursor:.cursor/context/production.md`)
- `.cursor/context/protected-files.md` — .cursor/context/protected-files.md (`cursor:.cursor/context/protected-files.md`)
- `.cursor/context/real-execution-mechanics.md` — .cursor/context/real-execution-mechanics.md (`cursor:.cursor/context/real-execution-mechanics.md`)
- `.cursor/context/security.md` — .cursor/context/security.md (`cursor:.cursor/context/security.md`)
- `.cursor/context/ui-rules.md` — .cursor/context/ui-rules.md (`cursor:.cursor/context/ui-rules.md`)
- `.cursor/context/vendor-operations.md` — .cursor/context/vendor-operations.md (`cursor:.cursor/context/vendor-operations.md`)

## Local tooling

- `scripts/phase-3b8-architecture-graph.js` — Phase 3B8 architecture graph (`governance:phase-3b8`)

## Endpoint taxonomy summary

- **Total API endpoints:** 72
- **Classified:** 71
- **Unknown:** 1

| Endpoint class | Count |
|----------------|------:|
| canonical_authority | 1 |
| replay_layer | 1 |
| public_verification | 2 |
| governance_execution | 3 |
| governance_projection | 10 |
| proof_projection | 12 |
| ledger_projection | 5 |
| audit_projection | 6 |
| operator_control | 14 |
| health_monitoring | 4 |
| demo_surface | 1 |
| request_intake | 4 |
| history_projection | 3 |
| engineering_intelligence | 1 |
| legacy_projection | 4 |
| unknown | 1 |

## Remaining orphan endpoints

Only `unknown` taxonomy class (Phase 4B). Governed classes are not orphans.

- `api/v1/execution/transition.js` — /api/v1/execution/transition

## Next classification targets

- `api/v1/execution/transition.js` — assign taxonomy before refactor

## Shadow flow candidates

- `scripts/smoke-live.js:101` — pattern `ledger-verify-url`

## Summary counts

| Metric | Count |
|--------|------:|
| Total nodes | 134 |
| Total edges | 72 |
| API endpoints | 72 |
| Orphan candidates (reduced) | 1 |
| Shadow flow candidates (reduced) | 1 |
| Layer: canonical_authority | 7 |
| Layer: replay_layer | 1 |
| Layer: public_verification | 2 |
| Layer: governance_execution | 3 |
| Layer: governance_projection | 10 |
| Layer: proof_projection | 12 |
| Layer: ledger_projection | 5 |
| Layer: audit_projection | 6 |
| Layer: operator_control | 14 |
| Layer: health_monitoring | 4 |
| Layer: demo_surface | 1 |
| Layer: request_intake | 4 |
| Layer: history_projection | 3 |
| Layer: engineering_intelligence | 2 |
| Layer: legacy_projection | 4 |
| Layer: local_tooling | 1 |
| Layer: unknown | 1 |
| Layer: governance_layer | 14 |
| Layer: architecture_memory | 38 |
| Layer: ui_console | 0 |
| Layer: engineering_console | 2 |

## Next recommended cleanup

- Assign taxonomy to 1 unknown endpoint(s) (see endpoint-taxonomy.md).
- Migrate remaining shadow flow references (ledger-verify URLs or legacy event names).

## Engineering Console Layer

- `console/engineering.html` — EXECUTIA Engineering Console (`ui:engineering-console`)
- `public/console/engineering.html` — EXECUTIA Engineering Console (public) (`ui:engineering-console-public`)

engineering_console_detected = true

## Governance Visualization Layer

The engineering console is classified as **governance visualization** infrastructure:

- `governance_visualization` — read-only institutional map of graph, intelligence, ledger
- `institutional_console` — system interface, not marketing or operator mutation surface

- Role: `governance_visualization`
- Role: `institutional_console`

## Institutional Console Status

| Trait | Status |
|-------|--------|
| Read-only | true |
| Governed | true |
| Deterministic | true |
| Visibility layer | institutional_governance |

