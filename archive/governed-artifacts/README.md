# Legacy governed artifact archive (deprecated)

Stabilization used this path temporarily. Snapshots are migrated into per-directory archives:

- `architecture-graph/archive/`
- `engineering-ledger/archive/`
- `execution-intelligence/archive/`

`migrateLegacyArchive()` in `services/artifact-governance.js` moves remaining files on the next governed write.

Do not add new files here.
