# Governance Surface Separation (Phase 5E)

Presentation-only separation of engineering console perspectives. No API, SQL, or execution logic changes.

## Principle

Each governance mode renders **distinct HTML** into dedicated mode panels. Modes do not share one DOM tree with CSS hiding — they use separate renderers and operational surface components.

## Modes and density

| Mode | Cognitive density | Max width (atmosphere) |
|------|-------------------|------------------------|
| Executive | Lowest | 520px |
| Public verify | Minimal | 440px |
| Operational | Moderate | 600px |
| Audit | Moderate | 580px |
| Engineering | Highest | 720px |

## Mode content

### Executive

Surfaces: **Governance**, **Findings** (executive-filtered).

Shows: governance status, canonical integrity, replay integrity, deployment readiness, system risk, executive findings.

Hides: architecture diagnostics, taxonomy, engineering traces, replay internals, raw ledger, retention.

### Operational

Surfaces: **Replay**, **Deploy**, **Governance** (execution state), **Findings**.

Shows: replay status, operational integrity, deployment state, execution state, governance findings.

Hides: deep engineering diagnostics, taxonomy, retention.

### Engineering

Surfaces: **Governance** (with internals), **Authority**, **Intelligence**, **Replay**, **Retention**, **Findings**.

Shows: architecture hierarchy, endpoint taxonomy, replay internals, diagnostics, ledger timeline, retention state, engineering findings, recommendations, governance internals.

### Audit

Surfaces: **Authority**, **Replay**, **Intelligence**, **Audit**, **Governance** (proof), replay safety.

Shows: canonical verification, replay evidence, execution integrity, audit chain integrity, proof state, deterministic replay safety.

### Public verify

Surface: **Public verify** only.

Shows: VERIFIED, HASH, TIMESTAMP, CANONICAL STATE, READ ONLY.

## Operational surface types

| Surface class | Role |
|---------------|------|
| `ex-op-surface--governance` | Governance / execution posture |
| `ex-op-surface--authority` | Canonical hierarchy |
| `ex-op-surface--intelligence` | Integrity index, taxonomy, diagnostics |
| `ex-op-surface--replay` | Replay status, evidence, internals |
| `ex-op-surface--deploy` | Deployment scope |
| `ex-op-surface--findings` | Findings layer |
| `ex-op-surface--audit` | Audit chain |
| `ex-op-surface--retention` | Governed artifact retention |
| `ex-op-surface--public-verify` | Minimal proof facts |

## Components

- `public/components/engineering-governance-surfaces.js` — mode renderers
- `public/components/executia-governance-modes.js` — perspective rail, `executia:governance-mode-change`
- `public/components/executia-governance-modes.css` — panel visibility, density widths
- `console/engineering.html` / `public/console/engineering.html` — five `data-mode-panel` shells

## Data flow

1. Single `GET /api/v1/engineering/intelligence` fetch.
2. `buildContext()` caches payload.
3. Mode switch dispatches `executia:governance-mode-change`.
4. `EXECUTIA_GOVERNANCE_SURFACES.renderActiveMode(mode, ctx)` fills the active panel.

Authority band (`EXECUTIA_OPERATIONAL_SHELL.setAuthorityState`) updates on every render from the same payload.

## Switcher UX

Institutional **Perspective** rail under the authority band — underline active link, no tabs, filters, or admin controls.

Persistence: `localStorage` key `executia_governance_mode`, optional `#mode=` hash.
