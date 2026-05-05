# EXECUTIA™ Layer — FINAL FULL REPO READY

This ZIP is a full drop-in `executia-layer` repo package.

## Included
- Dashboard UI
- Control / operator console
- History / audit console
- Operations console
- Demo execution test
- API routes
- Rule engine
- Supabase-ready DB schema
- Ledger hash-chain
- Audit event service
- Vercel config
- Package.json
- Tests
- OpenAPI file

## Install

```bash
cd /Users/sandis/Documents/NEW
unzip executia-layer_FINAL_FULL_REPO_READY.zip

rm -rf executia-layer
git clone https://github.com/sandis-stack/executia-layer.git
cd executia-layer

cp -R ../executia-layer_FINAL_FULL_REPO_READY/executia-layer/* .
cp ../executia-layer_FINAL_FULL_REPO_READY/executia-layer/.gitignore .gitignore

npm install
npm run verify

git add .
git commit -m "final full executia layer repo"
git push
```

Then redeploy Vercel project `executia-layer`.

## Supabase
Run:

`database/schema.sql`

Set Vercel environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `EXECUTIA_INTERNAL_KEY`
