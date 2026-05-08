# EXECUTIA Core Engine V1 — Frozen Baseline

## Status
EXECUTIA Core Engine V1 is frozen as a stable execution truth baseline.

Tag:
`EXECUTIA_CORE_V1`

Schema snapshot:
`sql/frozen/EXECUTIA_CORE_V1.sql`

## Core Flow

REQUEST
→ VALIDATION
→ DECISION
→ CORE LEDGER
→ SETTLEMENT
→ RECONCILIATION
→ AUDIT CHAIN
→ PROOF

## Verified Core Capabilities

- Execution commit
- Unified execution proof object
- Core ledger entry
- Hash-chain verification
- JWT identity layer
- Operator decision materialization
- Ledger settlement
- Reconciliation verification
- Immutable audit chain
- Proof summary endpoint
- Operator Console proof summary integration

## Frozen Core Endpoints

- `/api/v1/health`
- `/api/v1/proof/commit`
- `/api/v1/proof/execution`
- `/api/v1/proof/summary`
- `/api/v1/operator/action`
- `/api/v1/settle-ledger`
- `/api/v1/audit/verify`
- `/api/v1/audit/repair`
- `/api/v1/core-ledger-verify`

## Frozen Core Tables

- `execution_results`
- `ledger_entries`
- `core_ledger`
- `audit_events`
- `truth_anchors`
- `ledger_accounts`

## Change Policy

Allowed:
- bug fixes
- security hardening
- performance improvements
- additive endpoints
- institutional integrations
- external reconciliation adapters

Not allowed without new version:
- status model changes
- proof object breaking changes
- ledger hash formula changes
- audit hash formula changes
- duplicate execution logic
- Operator Console redesign

## Strategic Meaning

EXECUTIA Core Engine V1 proves that execution can be committed, governed, settled, reconciled, audited, and verified as one materialized truth chain.
