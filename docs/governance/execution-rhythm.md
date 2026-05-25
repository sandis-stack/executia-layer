# Execution Rhythm (Phase 5H)

Continuous execution reality for governed consoles — presentation and refresh rhythm only. No API, SQL, or execution logic changes.

## Objective

Feel **alive**, **deterministic**, **continuously governing**, **institutionally active**, and **operationally inevitable**.

Must **not** feel like a static dashboard, snapshot UI, analytics screen, reporting environment, trading terminal, or live feed.

## Canonical rhythm controller

One interval owner per page: `EXECUTIA_EXECUTION_RHYTHM.runGovernedRefresh(refreshFn, options)`.

- Stops any prior controller before starting
- No duplicate `setInterval` in engineering console
- Events: `executia:execution-rhythm-tick`, `executia:execution-rhythm-sync`

## Deterministic temporal behavior

| Behavior | Detail |
|----------|--------|
| Cadence | 30s default (`DEFAULT_CADENCE_MS`) |
| Sync line | `deterministic refresh · governed cadence · last synchronized … · continuity maintained` |
| During fetch | “Governance synchronizing” — no blinking, no fast animation |
| Pulse | 6s opacity cycle on 6px dot; disabled under `prefers-reduced-motion` |

## Continuity framing

| Frame | Signal |
|-------|--------|
| EXECUTION CONTINUITY MAINTAINED | Always in set; rotates as primary line |
| GOVERNANCE SYNCHRONIZED | Governance refresh complete |
| CANONICAL RHYTHM ACTIVE | Readiness OK / payload OK |
| EXECUTION STATE CONTINUOUS | Integrity or canonical anchors |
| EXECUTION SURFACE SYNCHRONIZED | Governed execution surface detected |

## Temporal hierarchy

| Tier | Role | Markup |
|------|------|--------|
| Primary | Execution continuity | `.ex-rhythm-primary` |
| Secondary | Governance state | `.ex-rhythm-secondary` |
| Tertiary | Diagnostics / timing | `.ex-rhythm-tertiary` |

## Timing language (use)

synchronized · canonical · deterministic · governed · continuity maintained

## Timing language (avoid)

realtime dashboard · analytics refresh · monitoring-tool · live feed

## Enable

```html
<script src="/components/executia-governance-core.js"></script>
<script src="/components/executia-execution-rhythm.js"></script>
```

Body: `ex-rhythm-enabled` (included in `executia-governed-presentation.css`).

```javascript
const rhythm = EXECUTIA_EXECUTION_RHYTHM.runGovernedRefresh(synchronizeGovernance, {
  cadenceMs: EXECUTIA_EXECUTION_RHYTHM.DEFAULT_CADENCE_MS,
  context: () => buildContext(lastPayload)
});
```

## Preserved

Governance core (5G), modes (5E), surfaces, institutional calm, light palette.
