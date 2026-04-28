# EXECUTIA Engine Live Final

This package is built on `executia-engine-live-ai-v4-final` as the base,
with selective provider-layer hardening inspired by `executia-engine-live-launch-ready-merged`.

## Final decisions applied
- Kept V4 auth, tenant, with-engine, health, audit, and execution APIs.
- Replaced `gateway/provider-registry.js` with a version that matches live API imports.
- Replaced `gateway/providers/webhook.js` with a signed webhook provider using:
  - `EXECUTIA_PROVIDER_WEBHOOK_URL`
  - `WEBHOOK_CALLBACK_SECRET`
- Normalized deployment docs and env examples.

## Why this is the safer live build
- Preserves DB-backed keys, scopes, operator/session security, and audit trail.
- Avoids the weakened auth/tenant/health paths from the merged overlay.
- Adds a stronger real webhook dispatch model for live execution.
