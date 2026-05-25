# EXECUTIA Architecture Graph Report

Phase 3B8-A — human-readable reduction (local tooling only).

## Generated at

- **Timestamp:** 2026-05-25T07:05:11.377Z
- **Branch:** phase-3b3-ledger-polish
- **Commit:** 7ff3556be9e4150322a6dc3eb087a1b898684b75

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

## Governance layer

- `scripts/phase-3b5-governance-check.js` — Phase 3B5 governance check (`governance:phase-3b5`)
- `scripts/phase-3b6-engineering-ledger.js` — Phase 3B6 engineering ledger (`governance:phase-3b6`)
- `scripts/phase-3b7-architecture-drift.js` — Phase 3B7 architecture drift (`governance:phase-3b7`)
- `git` — Git working tree (`store:git_state`)
- `engineering-ledger` — Engineering ledger snapshots (`store:engineering_ledger`)
- `scripts/phase-3b9-execution-intelligence.js` — Phase 3B9 execution intelligence (`governance:phase-3b9`)
- `.cursor/rules/change-governance.mdc` — .cursor/rules/change-governance.mdc (`cursor:.cursor/rules/change-governance.mdc`)
- `.cursor/rules/deployment-rules.mdc` — .cursor/rules/deployment-rules.mdc (`cursor:.cursor/rules/deployment-rules.mdc`)
- `.cursor/rules/executia-governance.mdc` — .cursor/rules/executia-governance.mdc (`cursor:.cursor/rules/executia-governance.mdc`)
- `.cursor/rules/security-rules.mdc` — .cursor/rules/security-rules.mdc (`cursor:.cursor/rules/security-rules.mdc`)
- `.cursor/rules/supabase-rules.mdc` — .cursor/rules/supabase-rules.mdc (`cursor:.cursor/rules/supabase-rules.mdc`)
- `.cursor/rules/vercel-rules.mdc` — .cursor/rules/vercel-rules.mdc (`cursor:.cursor/rules/vercel-rules.mdc`)

## Legacy projection layer

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

## UI console

_None mapped._

## Architecture memory

- `.cursor/context/architecture-graph.md` — Architecture graph context (`context:architecture-graph`)
- `architecture-graph/latest.json` — Architecture graph artifact (`store:architecture_graph`)
- `execution-intelligence/latest.json` — Execution intelligence artifact (`store:execution_intelligence`)
- `.cursor/context/architecture-drift.md` — .cursor/context/architecture-drift.md (`cursor:.cursor/context/architecture-drift.md`)
- `.cursor/context/architecture-graph.md` — .cursor/context/architecture-graph.md (`cursor:.cursor/context/architecture-graph.md`)
- `.cursor/context/architecture.md` — .cursor/context/architecture.md (`cursor:.cursor/context/architecture.md`)
- `.cursor/context/change-classification.md` — .cursor/context/change-classification.md (`cursor:.cursor/context/change-classification.md`)
- `.cursor/context/engineering-ledger.md` — .cursor/context/engineering-ledger.md (`cursor:.cursor/context/engineering-ledger.md`)
- `.cursor/context/execution-intelligence.md` — .cursor/context/execution-intelligence.md (`cursor:.cursor/context/execution-intelligence.md`)
- `.cursor/context/production.md` — .cursor/context/production.md (`cursor:.cursor/context/production.md`)
- `.cursor/context/protected-files.md` — .cursor/context/protected-files.md (`cursor:.cursor/context/protected-files.md`)
- `.cursor/context/security.md` — .cursor/context/security.md (`cursor:.cursor/context/security.md`)
- `.cursor/context/ui-rules.md` — .cursor/context/ui-rules.md (`cursor:.cursor/context/ui-rules.md`)

## Local tooling

- `scripts/phase-3b8-architecture-graph.js` — Phase 3B8 architecture graph (`governance:phase-3b8`)

## Orphan candidates

Unclassified API endpoints not connected to canonical/governance anchors (excludes proof, UI, docs, tooling paths).

- `api/v1/alerts.js` — /api/v1/alerts
- `api/v1/audit/repair.js` — /api/v1/audit/repair
- `api/v1/audit/timeline.js` — /api/v1/audit/timeline
- `api/v1/audit-export.js` — /api/v1/audit-export
- `api/v1/audit-ledger.js` — /api/v1/audit-ledger
- `api/v1/auth/login.js` — /api/v1/auth/login
- `api/v1/auth/operator-token.js` — /api/v1/auth/operator-token
- `api/v1/auth/set-operator-password.js` — /api/v1/auth/set-operator-password
- `api/v1/clients.js` — /api/v1/clients
- `api/v1/commit-execution.js` — /api/v1/commit-execution
- `api/v1/config/public.js` — /api/v1/config/public
- `api/v1/core-ledger-commit.js` — /api/v1/core-ledger-commit
- `api/v1/core-ledger-repair.js` — /api/v1/core-ledger-repair
- `api/v1/evolution/analyze.js` — /api/v1/evolution/analyze
- `api/v1/execute.js` — /api/v1/execute
- `api/v1/execution/analyze.js` — /api/v1/execution/analyze
- `api/v1/execution/registry.js` — /api/v1/execution/registry
- `api/v1/execution/submit.js` — /api/v1/execution/submit
- `api/v1/health.js` — /api/v1/health
- `api/v1/history.js` — /api/v1/history
- `api/v1/lead.js` — /api/v1/lead
- `api/v1/live-state.js` — /api/v1/live-state
- `api/v1/login.js` — /api/v1/login
- `api/v1/metrics.js` — /api/v1/metrics
- `api/v1/operator/action.js` — /api/v1/operator/action
- `api/v1/operator/executions.js` — /api/v1/operator/executions
- `api/v1/operator/lock.js` — /api/v1/operator/lock
- `api/v1/operator/me.js` — /api/v1/operator/me
- `api/v1/operator/review.js` — /api/v1/operator/review
- `api/v1/operator-approve.js` — /api/v1/operator-approve
- `api/v1/operator-block.js` — /api/v1/operator-block
- `api/v1/operator-decision.js` — /api/v1/operator-decision
- `api/v1/operator-queue.js` — /api/v1/operator-queue
- `api/v1/organizations.js` — /api/v1/organizations
- `api/v1/pilot/list.js` — /api/v1/pilot/list
- `api/v1/pilot/request.js` — /api/v1/pilot/request
- `api/v1/pilot/update.js` — /api/v1/pilot/update
- `api/v1/project-audit.js` — /api/v1/project-audit
- `api/v1/projects.js` — /api/v1/projects
- `api/v1/proof.js` — /api/v1/proof
- `api/v1/proxy.js` — /api/v1/proxy
- `api/v1/real-time-audit.js` — /api/v1/real-time-audit
- `api/v1/reconciliation/verify.js` — /api/v1/reconciliation/verify
- `api/v1/rules/evaluate.js` — /api/v1/rules/evaluate
- `api/v1/session.js` — /api/v1/session
- `api/v1/settle-ledger.js` — /api/v1/settle-ledger
- `api/v1/submit.js` — /api/v1/submit
- `api/v1/tasks.js` — /api/v1/tasks
- `api/v1/timeline.js` — /api/v1/timeline
- `api/v1/trace/execution.js` — /api/v1/trace/execution
- `api/v1/truth-anchor-verify.js` — /api/v1/truth-anchor-verify
- `api/v1/truth-anchor.js` — /api/v1/truth-anchor
- `api/v1/users.js` — /api/v1/users
- `api/v1/verify.js` — /api/v1/verify

## Shadow flow candidates

- `scripts/smoke-live.js:101` — pattern `ledger-verify-url`

## Summary counts

| Metric | Count |
|--------|------:|
| Total nodes | 106 |
| Total edges | 45 |
| API endpoints | 71 |
| Orphan candidates (reduced) | 54 |
| Shadow flow candidates (reduced) | 1 |
| Layer: canonical_authority | 7 |
| Layer: public_verification | 1 |
| Layer: replay_layer | 1 |
| Layer: governance_layer | 12 |
| Layer: architecture_memory | 13 |
| Layer: ui_console | 0 |
| Layer: proof_projection | 11 |
| Layer: legacy_projection | 2 |
| Layer: local_tooling | 1 |
| Layer: engineering_console | 4 |
| Layer: unknown | 54 |

## Next recommended cleanup

- Classify 54 orphan API endpoint(s) before any removal.
- Migrate remaining shadow flow references (ledger-verify URLs or legacy event names).

## Engineering Console Layer

- `api/v1/engineering/intelligence.js` — GET /api/v1/engineering/intelligence (`endpoint:engineering/intelligence`)
- `console/engineering.html` — EXECUTIA Engineering Console (`ui:engineering-console`)
- `public/console/engineering.html` — EXECUTIA Engineering Console (public) (`ui:engineering-console-public`)
- `services/engineering-intelligence-loader.js` — Engineering intelligence loader (`service:engineering-intelligence-loader`)

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

