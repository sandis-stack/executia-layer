# EXECUTIA Artifact Retention & Stability Layer

Prevent destructive governance cleanup while preserving institutional continuity. EXECUTIA compresses noise safely, retains stable historical references, and never destroys canonical replay or proof continuity.

## Tier 1 — Canonical (permanent, artifact root)

Never archived, never deleted, always rewritten or updated in place:

| File | Role |
|------|------|
| `latest.json` | Current governed snapshot (loaders, consoles, intelligence aggregation) |
| `report.md` | Human-readable institutional summary |
| `last-stable.json` | Last governance-significant stable posture |

Applies to:

- `architecture-graph/`
- `engineering-ledger/`
- `execution-intelligence/`

## Tier 2 — Active stamped snapshots (artifact root)

- Pattern: `202*.json` at directory root (not under `archive/`)
- **Keep newest 8** per directory (`RETENTION.maxStampedSnapshots`)
- Written only on governance-significant change (`writeGovernedArtifacts`)
- Gitignored at root (`.gitignore`) — canonical trio remains tracked

## Tier 3 — Historical archive (non-destructive)

When active stamped files exceed the cap, `rotateStampedSnapshots()` **moves** (never `unlink`) to:

```
architecture-graph/archive/
engineering-ledger/archive/
execution-intelligence/archive/
```

Legacy path `archive/governed-artifacts/<dir>/` is migrated automatically into per-directory `archive/` on the next governed write.

## Producers

| Directory | Script | Retention entry |
|-----------|--------|-----------------|
| `architecture-graph/` | `scripts/phase-3b8-architecture-graph.js` | `writeGraphOutputs` → `writeGovernedArtifacts` |
| `engineering-ledger/` | `scripts/phase-3b6-engineering-ledger.js` | `writeLedgerOutputs` → `writeGovernedArtifacts` |
| `execution-intelligence/` | `scripts/phase-3b9-execution-intelligence.js` | `writeIntelligenceOutputs` → `writeGovernedArtifacts` |

## Rules (institutional)

1. **No destructive cleanup** — archival only for rotated stamped snapshots.
2. Never remove or rotate `latest.json`, `report.md`, `last-stable.json`.
3. Never blind-delete git-tracked governance history; move to `archive/` first.
4. Preserve replay continuity — `latest.json` + stamped/active history remain valid inputs for delta and dry replay tests.
5. Preserve proof verification continuity — public verify and architecture graph taxonomy unchanged by retention layer.

## Module

`services/artifact-governance.js`

- `CANONICAL_ARTIFACT_FILES`, `RETENTION`, `archiveDirFor()`
- `rotateStampedSnapshots()`, `migrateLegacyArchive()`, `writeGovernedArtifacts()`
- `isSignificantGraphChange()`, `isSignificantIntelligenceChange()`, `isSignificantLedgerChange()`

## Context

Operator guidance: `.cursor/context/artifact-retention.md`
