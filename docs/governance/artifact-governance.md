# EXECUTIA Artifact Governance Policy (Phase 5C)

EXECUTIA preserves **signal**, not repository noise. Governed tooling must not weaken operational calm, institutional quality, or governance clarity through artifact explosion.

## Operational retention hierarchy

| Tier | Role | Examples |
|------|------|----------|
| **Primary** | Canonical state | `latest.json`, `report.md`, `last-stable.json` |
| **Secondary** | Stable historical state | Newest N stamped snapshots after governance-significant transitions |
| **Tertiary** | Temporary diagnostics | Rotated out; not committed when gitignored |

## Canonical artifact roots

| Directory | Producer | Canonical files |
|-----------|----------|-----------------|
| `architecture-graph/` | `phase-3b8-architecture-graph.js` | `latest.json`, `report.md`, `last-stable.json` |
| `execution-intelligence/` | `phase-3b9-execution-intelligence.js` | `latest.json`, `report.md`, `last-stable.json` |
| `engineering-ledger/` | `phase-3b6-engineering-ledger.js` | `latest.json`, `report.md`, `last-stable.json` |

## Snapshot policy

### Always KEEP (rewrite each run)

- **latest.json** — current governed view for loaders and consoles
- **report.md** — human-readable institutional summary

### KEEP on significant transition

- **Stamped snapshots** (`{ISO-normalized}.json`) — only when governance state meaningfully changes
- **last-stable.json** — updated when stability/risk/readiness indicates governed stable posture

### ARCHIVE / ROTATE

- Retain **newest 8** stamped snapshots per directory at artifact root (`RETENTION.maxStampedSnapshots`)
- Older stamped files are **moved** to `<artifactDir>/archive/` on each write — never deleted

### REMOVE / IGNORE

- Duplicate runs (same branch, commit, and governance fingerprint as `latest.json`)
- Transient stamped files beyond retention cap
- Repeated graph/intelligence generations with no material delta

Stamped timestamp files may be **gitignored**; canonical trio remains tracked for deterministic traceability.

## Governance-significant changes

### Architecture graph

- Branch or commit change
- Orphan or shadow-flow count change
- Node/edge totals change
- Unknown endpoint count change
- Engineering console detection change

### Execution intelligence

- Deploy readiness or risk posture change
- Stability score change
- Findings set change
- Engineering console status change

### Engineering ledger

- Risk level or classification change
- Protected-file touch set change
- Files-changed count change
- Branch or commit change

## Implementation

Central module: `services/artifact-governance.js`

- `writeGovernedArtifacts()` — canonical write + conditional stamp + rotation
- `isSignificantGraphChange()`, `isSignificantIntelligenceChange()`, `isSignificantLedgerChange()`
- `rotateStampedSnapshots()` — moves excess stamped files to `<artifactDir>/archive/` (never deletes)

Retention policy: `docs/governance/artifact-retention.md` · Cursor: `.cursor/context/artifact-retention.md`

No runtime API, SQL, or execution-path changes — **governance storage architecture only**.

## Engineering auditability

- `latest.json` remains the single source for intelligence aggregation
- `last-stable.json` captures last governance-significant stable posture
- Stamped history provides bounded replay for delta analysis (3B9 architecture delta)
- Reports stay current without requiring one JSON file per pre-deploy hook invocation
