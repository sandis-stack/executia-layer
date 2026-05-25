# Artifact Retention (Cursor context)

EXECUTIA Artifact Retention & Stability Layer — **archival only**, no destructive governance cleanup.

## Permanent (never archive)

At each artifact root (`architecture-graph`, `engineering-ledger`, `execution-intelligence`):

- `latest.json`
- `report.md`
- `last-stable.json`

## Active vs archive

| Tier | Location | Policy |
|------|----------|--------|
| Active stamped | `<dir>/202*.json` | Keep newest **8** |
| Historical | `<dir>/archive/` | Move excess stamped files here |

## When editing phase scripts

- **3B8** `writeGraphOutputs` — uses `writeGovernedArtifacts` + `isSignificantGraphChange`
- **3B6** `writeLedgerOutputs` — uses `writeGovernedArtifacts` + `isSignificantLedgerChange`
- **3B9** `writeIntelligenceOutputs` — uses `writeGovernedArtifacts` + `isSignificantIntelligenceChange`

Do not add `unlinkSync` rotation. Do not remove canonical files from git without explicit institutional approval.

## Legacy

`archive/governed-artifacts/` is deprecated; `migrateLegacyArchive()` moves into `<dir>/archive/` on write.

## Verification before deploy

- `npm test` (canonical trio, archive rotation, replay, proof guards)
- `.cursor/hooks/pre-deploy-check.sh`

Full policy: `docs/governance/artifact-retention.md`
