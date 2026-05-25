# EXECUTIA Vendor Operations (AI Operator)

Vendor-specific rules. **Verify before acting.**

## Supabase

- **Production project id:** `dnyaancdvdsibbkdjdor` — confirm before any SQL or dashboard action.
- Never apply SQL blindly; read migration intent and diff first.
- Never mutate `audit_events` or `ledger_entries` without **explicit user approval**.
- Verify functions/tables exist before assuming “missing state”.
- Separate: wrong project vs wrong RLS vs wrong query vs app not calling RPC.
- Service role stays server-side only; never commit or log keys.

## Vercel

- Production deploy: `vercel --prod` (when user requests deploy).
- Production alias to verify: `https://execution.executia.io`
- If JSON parse fails in UI or script, run `curl -i` on the URL first.
- Never assume dynamic routes work without checking `vercel.json` and file path.
- Deployment bug ≠ code bug until build logs and response headers are checked.

## GitHub / Git

- Always `git status --short` before commit.
- Never commit secrets or `.env` files.
- Small, focused commits; one purpose per commit.
- Never commit a broken working tree (failing tests).
- Show diff when protected files change (see `phase-3b5-governance-check.js`).
- Branch/state bugs: confirm branch name and what is staged vs unstaged.

## Resend

- Never hardcode API keys.
- Verify env: `RESEND_API_KEY` (name only in logs — never print value).
- Validate from-domain / sender configuration separately from app logic.
- Email delivery failure ≠ application logic failure — check Resend response first.

## Environment variables

- Never expose `.env` in chat, commits, or screenshots.
- Never `console.log(process.env)`.
- Report missing vars by **safe name only** (e.g. “`SUPABASE_URL` unset”).
- Distinguish local `.env` missing vs Vercel env not configured.

## Production verification commands (examples)

```bash
curl -i https://execution.executia.io/api/v1/health
git status --short
npm test
node scripts/phase-ai-operator-check.js
```
