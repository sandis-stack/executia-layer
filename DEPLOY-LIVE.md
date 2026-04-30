# EXECUTIA Engine Live Final — Hardened Deploy

Required:
- `NODE_ENV=production`
- `ALLOW_SIMULATE=false`
- `EXECUTIA_DEV_MODE=false`
- `DEFAULT_PROVIDER=webhook`
- `EXECUTIA_REQUIRE_PROVIDER=true`
- `ALLOWED_ORIGIN=https://execution.executia.io`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `EXECUTIA_DB_KEYS_ENABLED=true`
- `EXECUTIA_OPERATOR_BOOTSTRAP_PASSWORD_HASH`
- `EXECUTIA_PROVIDER_WEBHOOK_URL`
- `WEBHOOK_CALLBACK_SECRET`

Strongly recommended:
- use DB-backed API keys
- do not use `mock_bank` in production
- verify `/api/v1/health` before enabling console access
- run webhook callback verification before opening live traffic
