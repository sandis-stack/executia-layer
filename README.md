# EXECUTIA™ Engine — Deploy Guide

## 1. Supabase SQL setup (in order)
```
sql/001_schema.sql          — full schema, RLS, seed data
sql/009_atomic_execution_rpc.sql — atomic execution RPC + advisory lock
```

## 2. Vercel Environment Variables
```
EXECUTIA_API_KEY=<your-secret-key>
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## 3. Install & verify
```bash
npm install
npm run check    # JS syntax check
npm test         # unit tests (rule evaluator + hash)
```

## 4. Deploy
```bash
git push origin main
```

## 5. Smoke test (after deploy)
```bash
EXECUTIA_API_KEY=<key> BASE_URL=https://your-domain.vercel.app node scripts/smoke-live.js
```

## Auth model
- `/api/v1/submit`  — public, no key from browser
- `/api/v1/execute` — internal/admin, requires x-api-key
- All operator endpoints require x-api-key
- Browser NEVER sends EXECUTIA_API_KEY (only operator pages use sessionStorage for demo)
