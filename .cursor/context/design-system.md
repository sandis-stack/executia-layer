# EXECUTIA Design System (Phase 5A)

Canonical institutional execution governance design system — not a dashboard or analytics UI.

## Assets

| Asset | Path |
|-------|------|
| Design tokens + typography + surfaces | `public/components/executia-design-system.css` |
| Governance shell (primary/secondary nav) | `public/components/executia-governance-shell.css` |
| Governance language | `public/components/executia-governance-language.js` |
| Engine shell base | `public/components/engine-shell.css` + `engine-shell.js` |
| Human spec | `docs/governance/design-system.md` |

Body classes on operational pages: `ex-engine-shell ex-ds-governance-shell ex-operational-surface ex-ds-surface`

## Typography hierarchy

| Role | Class | Use |
|------|-------|-----|
| Executive heading | `.ex-ds-executive` | Governance status, top authority |
| Governance heading | `.ex-ds-governance` | Primary section titles |
| Authority heading | `.ex-ds-authority-heading` | Canonical authority ladder lead |
| Operational subtitle | `.ex-ds-operational-subtitle` | Presence / institutional lead |
| Metadata | `.ex-ds-metadata` | Branch, timestamps, footnotes |
| Diagnostics | `.ex-ds-diagnostics` | Tertiary review, history, findings |
| Institutional label | `.ex-ds-institutional-label` | Measure and integrity labels |

Reduce: uppercase overload, metadata noise, debug/monospace styling.

## Spacing rhythm

**Allowed values only:** `8` · `16` · `24` · `40` · `64` px (`--ex-ds-s8` … `--ex-ds-s64`).

Combine with margin + padding utilities — never introduce ad-hoc values (96, 120, etc.).

Key utilities: `.ex-ds-mt-*`, `.ex-ds-gap-stratum`, `.ex-ds-pad-block`, shell uses `--ex-ds-s24` / `--ex-ds-s40` for nav.

## Governance terminology (canonical)

`EXECUTIA_GOVERNANCE_LANGUAGE.TERMS`:

- CANONICAL, VERIFIED, GOVERNED, REPLAY_SAFE, DETERMINISTIC
- EXECUTION_AUTHORITY, EXECUTION_INTEGRITY, READ_ONLY
- GOVERNANCE_STATUS, EXECUTION_SURFACE

Do not invent alternate UI labels (dashboard, analytics, monitoring, admin).

## Authority hierarchy (presentation order)

1. Governance status (executive)
2. Canonical authority (authority ladder)
3. Execution intelligence (integrity index)
4. Replay / deploy (secondary)
5. History / findings / diagnostics (tertiary)

## Component tiers

**Primary:** Governance status, Canonical authority  
**Secondary:** Intelligence, Replay, Deploy state  
**Tertiary:** Findings, Diagnostics, History, Ledger

## Operational shell

- Brand: **EXECUTIA™** + subtitle **Execution Governance System**
- Primary nav: Control · Governance · Engineering
- Secondary nav: contextual (Ledger, Audit, Operations, Proofs, Health, etc.)

## Operational UI rules

- Light palette, governance blue `#1c3554`, no black/neon
- Open strata layout; no widget grids or bordered cards
- Institutional calm; deliberate pacing
- Deterministic identity; read-only intelligence surfaces

## Institutional interaction rules

- No pill clusters or metric dashboards on operational surfaces
- Single operational state line at governance tier (avoid repeating readiness/risk)
- Hairline dividers ≤ 6% opacity only
- 30s refresh allowed; no flashy loading states
- Errors: quiet `.ex-ds-err`, no alert banners

Reference UI: `console/engineering.html`, `public/console/engineering.html`.

Operational shell (5B): `docs/governance/operational-shell.md` — body class `ex-op-shell`, surfaces `ex-op-surface--*`.
