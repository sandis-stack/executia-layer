# Execution Consequence (Phase 5I)

Governed transition gravity across EXECUTIA surfaces — presentation only. No API, SQL, or execution logic changes.

## Objective

Actions and state changes must feel:

- consequential
- deterministic
- authoritative
- operationally irreversible
- institutionally serious

Not like UI feedback, admin controls, or generic approval workflows.

## Consequence layer

| Asset | Role |
|-------|------|
| `executia-execution-consequence.js` | Transition framing, operator action mapping, `applyConsequence` |
| `executia-execution-consequence.css` | Institutional band + governed-act styling (not buttons) |

Imported via `executia-governed-presentation.css`. Enable with `ex-consequence-enabled`.

## Transition language

| Frame | Use |
|-------|-----|
| EXECUTION COMMITTED | Readiness committed / approve-class actions |
| GOVERNANCE TRANSITION VERIFIED | Governed verify / block-class transitions |
| CANONICAL STATE UPDATED | Canonical layer change |
| EXECUTION CONSEQUENCE APPLIED | Default governed consequence |
| AUTHORITY CONFIRMED | Confirm / authority affirmation |

Avoid: success messages, “OK”, generic confirmations, monitoring-tool wording.

## Transition hierarchy

| Tier | Role | Class |
|------|------|-------|
| Primary | Execution consequence | `.ex-consequence-primary` |
| Secondary | Governance transition | `.ex-consequence-secondary` |
| Tertiary | Diagnostic metadata | `.ex-consequence-tertiary` |

## Operator presentation (no API change)

Map UI actions to consequence frames without changing endpoints:

```javascript
EXECUTIA_EXECUTION_CONSEQUENCE.frameOperatorAction("APPROVE");
// → EXECUTION COMMITTED + transition event
```

Governed act markup (replaces button feeling):

```html
<button type="button" data-ex-consequence-act="APPROVE">Apply execution consequence</button>
```

Use `bindGovernedActs(container)` to attach pending transition presentation on click.

## Engineering console

Consequence band mounts below rhythm; state derived from intelligence payload (readiness, risk, canonical anchors).

```javascript
CONSEQUENCE().applyConsequence(ctx);
```

## Descriptors

- Operational consequence is final — governed, traceable, binding
- State transitions follow canonical authority
- Authority confirms material truth before consequence attaches
- Every transition remains deterministic and auditable

## Preserved

Execution rhythm (5H), governance core (5G), modes, institutional calm.
