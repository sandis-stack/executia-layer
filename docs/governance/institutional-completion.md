# Institutional Completion (executia.io)

Finish executia.io as one sovereign execution environment — presentation completion only.

## Objective

Public product experience must feel:

- sovereign, inevitable, institutional, operational, execution-native

Not: startup website, landing page, SaaS product, AI project, dashboard collection.

## Institutional environment layer

| Asset | Role |
|-------|------|
| `executia-institutional-environment.js` | Canonical header, footer, flow architecture |
| `executia-institutional-environment.css` | Spacing rhythm, calm typography overrides |

Enable with `ex-institutional-env` on `body` and optional `data-ex-env-page` for active flow step.

## Single flow architecture

```
Entry → Execution Test → Engine → Proof → Onboarding
```

Context navigation: Verify · Regulator · Demo · Onboarding (primary CTA)

All public surfaces share the same header/footer — one environment, not separate pages.

## Surfaces wired

- `/` — institutional entry (no redirect-only stub)
- `/execution-test/` — governed execution test
- `/request-pilot/` — institutional onboarding
- `/public-proof/` — proof receipt
- `/proof-explorer/` — verify
- `/regulator/` — oversight
- `/execution-demo.html` — governed demonstration

Console/engineering surfaces continue using `executia-operational-shell` + governance core (unchanged).

## Preserved

Institutional calm, execution authority, canonical compression, governance sovereignty, deterministic atmosphere. No new execution concepts — completion quality only.

## Verification

```bash
npm test
.cursor/hooks/pre-deploy-check.sh
```
