
# EXECUTIA Engine Live AI — V4 Final

This package is the canonical V4 build for EXECUTIA live deployment.

## What V4 adds
- DB migrations under `database/migrations/`
- operator sessions (`operator_sessions`)
- operator login endpoint (`/api/v1/auth-login`)
- session validation endpoint (`/api/v1/auth-session`)
- webhook replay protection (`webhook_events`)
- stricter provider contracts under `gateway/providers/`
- test skeleton under `tests/`
- audit and login console pages
- execution guarantee field in the ledger schema

## Recommended deployment path
1. Apply `schema.sql` or the migration files in order.
2. Seed an operator and API key.
3. Configure Vercel env vars from `.env.live.example`.
4. Deploy to Vercel.
5. Verify `/api/v1/health`, `/console/login.html`, and callback signature flow.

## Human vs machine access
- Machine-to-machine: API keys
- Human operators: session token from `/api/v1/auth-login`
