# EXECUTIA Engine Live Final — Deployment

## 1. Database
Apply migration files in `database/migrations/` in lexical order, or run `schema.sql` for greenfield deployment.

## 2. Seed
Create at least one operator row and one API key row before public use.

## 3. Environment
Required in production:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- ALLOWED_ORIGIN=https://execution.executia.io
- EXECUTIA_DB_KEYS_ENABLED=true
- WEBHOOK_CALLBACK_SECRET
- EXECUTIA_OPERATOR_BOOTSTRAP_PASSWORD_HASH
- EXECUTIA_PROVIDER_WEBHOOK_URL
- DEFAULT_PROVIDER=webhook
- EXECUTIA_REQUIRE_PROVIDER=true
- ALLOW_SIMULATE=false
- EXECUTIA_DEV_MODE=false

## 4. Verify
- GET `/api/v1/health`
- POST `/api/v1/auth-login`
- GET `/api/v1/auth-session`
- POST signed `/api/v1/provider-callback`
- POST `/api/v1/reconcile`

## 5. Test suite
Run `npm run check` and `npm test` locally before deployment.
