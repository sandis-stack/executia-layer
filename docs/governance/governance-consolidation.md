# Governance Consolidation (Phase 5G)

Presentation-only consolidation. EXECUTIA must feel inevitable, stable, governed, calm, and authoritative — not like a layered governance framework or fragmented shell system.

No API, SQL, or execution logic changes.

## Layer audit (before)

| Layer | Responsibility | Overlap removed |
|-------|----------------|-----------------|
| `executia-governance-shell.css` | Header nav chrome | Kept — nav only |
| `executia-operational-shell.js` | Frame mount | Delegates to core |
| `executia-operational-shell.css` | Main rhythm, anti-dashboard | No authority duplication |
| `executia-governance-language.js` | Terms / nav | Merged into **governance core** |
| `executia-execution-identity.js` | States / posture | Merged into **governance core** |
| `executia-execution-identity.css` | Posture band | Deprecated → core frame |
| `executia-design-system.css` | Tokens, typography | Tier aliases unified |
| `executia-governance-modes.*` | Perspectives | Density-only metadata |
| `engineering-governance-surfaces.js` | Mode HTML | Uses core `opSurface` / `measureBlock` |

## Consolidated stack (after)

```
executia-governance-core.js          ← language + identity + render helpers (canonical)
executia-governed-presentation.css ← single CSS entry (@import chain)
executia-operational-shell.js      ← mount + surface constants (delegates)
executia-governance-modes.js         ← perspective switch + panels
engineering-governance-surfaces.js ← mode renderers only
engine-shell.js                    ← header; reads core LANGUAGE.NAV
```

## Single authority frame

`ex-gov-authority-frame` replaces duplicate authority + posture bands:

1. Execution authority line + canonical execution state  
2. One inevitability line (`FRAME_INEVITABILITY`)  
3. Up to **5** priority execution states (reduced metadata density)

## Canonical API

| Call | Purpose |
|------|---------|
| `EXECUTIA_GOVERNANCE_CORE.applyPresentation(ctx)` | Authority + states |
| `EXECUTIA_GOVERNANCE_CORE.opSurface(kind, title, html)` | Mode section markup |
| `EXECUTIA_GOVERNANCE_CORE.measureBlock(label, value)` | Integrity measures |
| `EXECUTIA_GOVERNANCE_CORE.tierClass(level)` | Unified hierarchy |
| `EXECUTIA_GOVERNANCE_LANGUAGE` | Alias of `LANGUAGE` |

## Enable (engineering console)

```html
<link rel="stylesheet" href="/components/executia-governed-presentation.css" />
<script src="/components/executia-governance-core.js"></script>
```

Body: `ex-gov-core-enabled` `ex-op-shell` `ex-gov-modes-enabled`

## Preserved

- Governance modes and real panel separation (5E)  
- Operational shell surface types  
- Institutional calm, light palette, Apple-level spacing rhythm  
- Deterministic execution identity language  

## CSS load order (via governed-presentation)

1. `executia-design-system.css` — tokens, typography  
2. `executia-governance-shell.css` — navigation  
3. `executia-governance-core.css` — authority frame, states, tiers  
4. `executia-operational-shell.css` — main frame, surfaces  
5. `executia-governance-modes.css` — perspective rail, density widths  
