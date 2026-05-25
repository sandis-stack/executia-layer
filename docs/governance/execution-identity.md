# Execution Identity (Phase 5F)

Presentation-only execution authority identity. The interface must read as **execution authority itself** — not a governance portal, analytics system, enterprise dashboard, or engineering tooling console.

No API, SQL, or execution logic changes.

## Core identity

| Pillar | Meaning |
|--------|---------|
| Execution truth | Material state is authoritative before narrative |
| Canonical authority | Verify anchors define execution legitimacy |
| Deterministic governance | Read-only, replay-safe, governed surfaces |
| Operational consequence | Readiness and risk imply real commitment weight |
| Execution integrity | Composite integrity score across layers |

## Execution posture

The posture band (`ex-ex-id-posture`) implies:

- authority
- consequence
- control
- inevitability
- operational trust

Operational authority descriptors (`AUTHORITY_DESCRIPTORS`) reinforce material truth, consequence, deterministic control, canonical inevitability, and operational trust.

## Execution state framing

Derived from local intelligence (read-only) and shown when conditions match:

| State | Typical signal |
|-------|----------------|
| EXECUTION VERIFIED | High integrity or READY readiness |
| CANONICAL STATE ACTIVE | Canonical verify anchors present |
| REPLAY SAFE | Replay score threshold met |
| GOVERNANCE INTEGRITY VERIFIED | Governance score or no HIGH findings |
| EXECUTION SURFACE GOVERNED | Engineering execution surface detected |
| EXECUTION AUTHORITY ACTIVE | Execution authority layer active |
| EXECUTION INTEGRITY MAINTAINED | Integrity score held without HIGH findings |

## Hierarchy psychology

| Tier | Role | Class |
|------|------|-------|
| Primary | Execution authority | `ex-ex-id-tier-primary` |
| Secondary | Governance state | `ex-ex-id-tier-secondary` |
| Tertiary | Diagnostics | `ex-ex-id-tier-tertiary` |

## Language standard

`executia-governance-language.js` replaces dashboard and enterprise labels with:

- **Execution Authority** brand subline
- Nav: EXECUTION · GOVERNANCE · AUTHORITY
- Secondary: Replay record, Audit verify, Public verify, Authority health

## Components

- `public/components/executia-execution-identity.js`
- `public/components/executia-execution-identity.css`
- `EXECUTIA_EXECUTION_IDENTITY.applyIdentity(ctx)` on engineering console

## Enable

```html
<link rel="stylesheet" href="/components/executia-execution-identity.css" />
<script src="/components/executia-execution-identity.js"></script>
```

Body: `ex-ex-id-enabled` on `ex-op-shell` pages.
