# EXECUTIA Operational Shell (Phase 5B)

Unified institutional operating environment for all governance console pages. Pages must feel like **one deterministic system**, not separate products.

## Assets

| Asset | Path |
|-------|------|
| Operational shell layout + surfaces | `public/components/executia-operational-shell.css` |
| Authority band mount + API | `public/components/executia-operational-shell.js` |
| Design system (Phase 5A) | `executia-design-system.css` |
| Governance nav shell (Phase 5A) | `executia-governance-shell.css` |
| Language layer | `executia-governance-language.js` |
| Header mount | `engine-shell.js` |

## Body classes (required)

```
ex-engine-shell ex-ds-governance-shell ex-op-shell ex-operational-surface ex-ds-surface
```

## Load order

```html
<link rel="stylesheet" href="/components/engine-shell.css" />
<link rel="stylesheet" href="/components/executia-design-system.css" />
<link rel="stylesheet" href="/components/executia-governance-shell.css" />
<link rel="stylesheet" href="/components/executia-operational-shell.css" />
<script src="/components/executia-governance-language.js"></script>
<script src="/components/engine-shell.js"></script>
<script src="/components/executia-operational-shell.js"></script>
```

## Shared governance header

`engine-shell.js` provides:

- **EXECUTIA™**
- **Execution Governance System**
- Primary nav: CONTROL · GOVERNANCE · ENGINEERING
- Secondary nav: Ledger · Audit · Operations · Proofs · Health (contextual)

`executia-operational-shell.js` inserts the **authority band** immediately below:

| Field | Element | Purpose |
|-------|---------|---------|
| Governance state | `#exOpGovState` | Readiness / risk posture |
| Canonical state | `#exOpCanonState` | Canonical anchor summary |

Update via `EXECUTIA_OPERATIONAL_SHELL.setAuthorityState(governanceLine, canonicalLine)`.

## Section hierarchy

### Primary

- Governance status — `ex-op-surface--governance ex-op-surface--primary`
- Canonical authority — `ex-op-surface--authority ex-op-surface--primary`

### Secondary

- Intelligence — `ex-op-surface--intelligence ex-op-surface--secondary`
- Replay — `ex-op-surface--replay ex-op-surface--secondary`
- Deploy state — `ex-op-surface--deploy ex-op-surface--secondary`

### Tertiary

- Findings — `ex-op-surface--findings ex-op-surface--tertiary`
- Diagnostics — `ex-ds-diagnostics` inside findings/replay
- History — replay surface or ledger references

## Interaction rhythm

- Opacity transitions only (0.2s ease)
- `prefers-reduced-motion`: no transitions
- No animations, transforms, or dashboard jitter
- Spacing from design system tokens only (8–64px)

## Reference implementation

`public/console/engineering.html` — full operational shell with all surface tiers.

## Adopting other console pages

1. Add body classes and stylesheet/script load order above.
2. Remove duplicate `.ex-header-shell` blocks (shell hides them via `ex-op-legacy-hidden`).
3. Ensure `<main>` receives `ex-op-main` (automatic via operational-shell.js).
4. Wrap sections in `ex-op-surface` modifiers where possible.
5. Do not change API or data logic — presentation only.

See also: `docs/governance/design-system.md`.
