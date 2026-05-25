# EXECUTIA Artifact Governance (Phase 5C)

Full policy: `docs/governance/artifact-governance.md`.

Module: `services/artifact-governance.js`

## Canonical files (always)

`latest.json` · `report.md` · `last-stable.json`

## Stamped snapshots

- Write only on **governance-significant** change (not every hook run)
- Keep newest **8** per directory at root; **archive** older to `<dir>/archive/` (never delete)
- Gitignore pattern: `architecture-graph/202*.json`, `execution-intelligence/202*.json`, `engineering-ledger/202*.json`

## Retention hierarchy

1. **Primary** — canonical state (`latest`, `report`, `last-stable`)
2. **Secondary** — bounded stamped history
3. **Tertiary** — historical stamped JSON under `<dir>/archive/`

Retention layer: `docs/governance/artifact-retention.md` · `.cursor/context/artifact-retention.md`

## Scripts using governance writes

- `scripts/phase-3b8-architecture-graph.js` → `writeGraphOutputs`
- `scripts/phase-3b9-execution-intelligence.js` → `writeIntelligenceOutputs`
- `scripts/phase-3b6-engineering-ledger.js` → `writeLedgerOutputs`

No runtime execution logic changes.
