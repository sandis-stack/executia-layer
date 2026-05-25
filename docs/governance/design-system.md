# EXECUTIA Institutional Design System

Phase 5A establishes the first canonical design system for **execution governance** interfaces. This is not a dashboard design system. It defines how EXECUTIA presents **execution authority**, **governance responsibility**, and **operational integrity** to institutional operators and engineering reviewers.

## Philosophy

### Deterministic interface

Surfaces are read-only where intelligence is aggregated. Copy and hierarchy emphasize **governed**, **deterministic**, and **canonical** execution — not live analytics or exploratory debugging.

### Operational calm

Whitespace, restrained typography, and connected strata replace card stacks and metric grids. The interface should feel **deliberate**, **slow**, and **stable** — appropriate for infrastructure that carries execution consequence.

### Execution authority presentation

Authority flows top-down:

1. **Governance status** — institutional operating posture  
2. **Canonical authority** — material truth and verify anchors  
3. **Execution intelligence** — integrity index and governed architecture posture  
4. **Replay and deploy** — secondary operational diagnostics  
5. **History and findings** — tertiary review layers  

## Operational surfaces

Operational surfaces include the Engineering Console and future governance consoles that adopt:

- `executia-design-system.css`
- `executia-governance-shell.css`
- `executia-governance-language.js`
- `engine-shell.js` (canonical header)

Surfaces must not resemble SaaS dashboards, monitoring tools, or developer admin panels.

## Typography system

| Level | CSS class | Typical use |
|-------|-----------|-------------|
| Executive heading | `ex-ds-executive` | EXECUTIA governance status |
| Governance heading | `ex-ds-governance` | Section titles (intelligence, canonical block) |
| Authority heading | `ex-ds-authority-heading` | Lead step in authority ladder |
| Operational subtitle | `ex-ds-operational-subtitle` | Opening presence statement |
| Metadata | `ex-ds-metadata` | Branch, refresh time |
| Diagnostics | `ex-ds-diagnostics` | Findings, history lines |
| Institutional label | `ex-ds-institutional-label` | Integrity measure labels |

Sentence case is preferred over uppercase metadata blocks.

## Spacing system

Only five rhythm values are permitted: **8, 16, 24, 40, 64** pixels.

They normalize:

- Section margins and stratum gaps  
- Component padding inside tiers  
- Shell header height and nav gaps  
- Authority ladder step spacing  

Larger visual gaps are achieved by combining utilities (e.g. 64px margin + 64px padding).

## Governance UI hierarchy

### Primary components

- **Governance status** — dominant crown stratum  
- **Canonical authority** — vertical authority ladder (verify → replay → public → intelligence → execution surface)

### Secondary components

- **Intelligence** — execution integrity index and canonical/replay/governed measures  
- **Replay** — governed replay infrastructure and ledger timeline  
- **Deploy state** — governed path scope (prose, not widgets)

### Tertiary components

- **Findings** — institutional review lines  
- **Diagnostics** — recommendations when present  
- **History** — engineering ledger snapshots  
- **Ledger** — referenced via shell navigation, not duplicated on engineering surface  

## Canonical language system

All institutional UI copy should draw from `EXECUTIA_GOVERNANCE_LANGUAGE`:

| Term | Meaning in UI |
|------|----------------|
| Canonical | Primary verify and truth anchors |
| Verified | Public proof verification |
| Governed | Policy-bound paths and readiness |
| Replay safe | Deterministic replay integrity |
| Deterministic | Consistency and verification posture |
| Execution authority | Primary authority ladder |
| Execution integrity | Stability index and measures |
| Read only | Intelligence and diagnostics surfaces |
| Governance status | Top executive block |
| Execution surface | Operational API projection layer |

Random technical labels, debug wording, and inconsistent naming are out of scope.

## Header shell

**Primary shell branding**

- EXECUTIA™  
- Execution Governance System  

**Primary navigation**

- Control  
- Governance  
- Engineering  

**Secondary navigation** (contextual, quieter)

- Ledger, Audit, Audit ledger, Operations, Proofs, Health  

Engineering Console is the reference implementation (`public/console/engineering.html`).

## Operational surface rules

**Avoid**

- Dashboard and widget layouts  
- Analytics metric grids  
- Startup or admin panel aesthetics  
- Graph/debug visualizations on operational pages  
- Neon, black backgrounds, marketing hero blocks  

**Target**

- Institutional calm  
- Execution authority and consequence  
- Deterministic operational atmosphere  

## Operational shell (Phase 5B)

Unified operating environment: `executia-operational-shell.css` + `executia-operational-shell.js`.

Add body class `ex-op-shell` for shared authority band (governance state + canonical state) and surface component modifiers. See `docs/governance/operational-shell.md`.

## Implementation checklist

1. Link design system + governance shell + operational shell CSS after `engine-shell.css`  
2. Load `executia-governance-language.js` before page scripts  
3. Set body classes: `ex-engine-shell ex-ds-governance-shell ex-operational-surface`  
4. Use `engine-shell.js` — do not duplicate inline headers  
5. Bind static titles via `EXECUTIA_GOVERNANCE_LANGUAGE.PHRASES`  
6. Keep API and runtime logic unchanged — presentation only  

See also: `.cursor/context/design-system.md` for agent-facing summary.
