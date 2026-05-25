# Execution Memory (Phase 5J)

Institutional execution history across EXECUTIA surfaces — presentation only. No API, SQL, or execution logic changes.

## Objective

History must feel:

- historically continuous
- structurally remembering
- replay-capable
- institutionally persistent
- consequence-aware

Not like logs, snapshots, archives, dumps, or disposable artifacts.

## Memory layer

| Asset | Role |
|-------|------|
| `executia-execution-memory.js` | Memory framing, continuity records, `applyMemory` |
| `executia-execution-memory.css` | Institutional band + continuity record timeline |

Imported via `executia-governed-presentation.css`. Enable with `ex-memory-enabled`.

## Canonical language

| Frame | Use |
|-------|-----|
| EXECUTION MEMORY | Primary institutional memory posture |
| CANONICAL MEMORY | Canonical layer remembered |
| GOVERNANCE HISTORY | Secondary transition memory |
| REPLAYABLE CONSEQUENCE | Deterministic replay continuity |
| EXECUTION CONTINUITY RECORD | Single governed history row |

Avoid: logs, snapshots, archives, dumps, artifact storage, monitoring archives.

## Memory hierarchy

| Tier | Role | Class |
|------|------|-------|
| Primary | Execution continuity memory | `.ex-memory-primary` |
| Secondary | Governance transitions | `.ex-memory-secondary` |
| Tertiary | Diagnostic retention | `.ex-memory-tertiary` |

## Engineering console

Memory band mounts below consequence (or rhythm); state derived from intelligence payload and engineering ledger continuity records.

```javascript
MEMORY().applyMemory(ctx);
```

Surfaces delegate timeline and retention presentation:

```javascript
MEMORY().continuityRecordHtml(ledger, formatTs, limit);
MEMORY().retentionPresentation(ctx);
```

## Descriptors

- Institutional memory retains governed consequence across time — not disposable records.
- Replayable consequence follows canonical order; history remains deterministic and read-only.
- Execution continuity is structurally remembered — each record advances institutional state.
- Memory persists under governance authority; transitions remain traceable at verify.

## Preserved

Execution consequence (5I), rhythm (5H), governance core (5G), modes, institutional calm, deterministic atmosphere.
