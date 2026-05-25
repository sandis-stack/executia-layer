# EXECUTIA Governance Modes (Phase 5D)

Governed **operational perspectives** for different execution roles. The same underlying intelligence may load once; **presentation density** adapts by mode so each audience receives appropriate governance complexity.

Not a dashboard feature matrix — a **presentation architecture** only (no runtime API, SQL, or execution changes).

## Assets

| Asset | Path |
|-------|------|
| Mode definitions + switching | `public/components/executia-governance-modes.js` |
| Density + visibility CSS | `public/components/executia-governance-modes.css` |

Enable on a page:

```html
<body class="ex-gov-modes-enabled" data-op-page="engineering">
```

Load after operational shell scripts.

## Modes

| Mode | Density | Audience focus |
|------|---------|----------------|
| **EXECUTIVE** | Lowest | Governance status, canonical integrity, readiness, risk, findings |
| **OPERATIONAL** | Moderate | Replay, execution state, operational integrity, deploy state |
| **ENGINEERING** | Highest | Architecture, diagnostics, ledger traces, intelligence internals |
| **AUDIT** | Moderate | Verification, canonical truth, replay evidence, chain integrity |
| **PUBLIC VERIFY** | Minimal | Verified, hash, timestamp, canonical state, read-only proof |

## Mode switching

- `EXECUTIA_GOVERNANCE_MODES.applyMode(mode)`
- Persists to `localStorage` (`executia_governance_mode`)
- URL hash: `#mode=executive`
- Default per page: `data-op-page` → e.g. engineering → **Engineering** mode

Perspective bar inserted below the operational authority band.

## Real surface separation (Phase 5E)

Engineering console uses **dedicated mode panels** (`engineering-governance-surfaces.js`). Each perspective renders distinct HTML — not a single page with hidden sections.

| Mode | Renders |
|------|---------|
| **Executive** | Governance status, canonical/replay integrity, readiness, risk, executive findings only |
| **Operational** | Replay status, operational integrity, deploy state, execution state, governance findings |
| **Engineering** | Full hierarchy, taxonomy, diagnostics, ledger timeline, recommendations |
| **Audit** | Canonical verification, replay evidence, integrity index, audit-chain findings, proof state |
| **Public verify** | Verified, hash, timestamp, canonical state, read-only (minimal) |

Mode switch dispatches `executia:governance-mode-change`; surfaces re-render from cached intelligence payload (no extra API calls).

## UI density rules

- **Executive** — narrow column (560px), smaller integrity index, hides deep diagnostics
- **Operational** — replay and deploy emphasized
- **Engineering** — full width (720px), all surfaces
- **Audit** — canonical + replay evidence
- **Public verify** — minimal column (480px), proof-oriented copy only

## Preservation

- Institutional calm and governance hierarchy unchanged
- Deterministic identity and canonical language (Phase 5A)
- Operational shell and authority band (Phase 5B)
- No additional API calls per mode switch

Reference: `public/console/engineering.html`.
