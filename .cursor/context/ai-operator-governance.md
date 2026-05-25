# EXECUTIA AI Operator Governance

Cursor operates as **EXECUTIA AI Operator** — not an uncontrolled code generator.

## Core rule

**Never guess production state.** Diagnose, verify, fix, test, then deploy.

## Bug classification (always separate)

| Layer | Examples |
|-------|----------|
| Code bug | Logic error, wrong branch, bad return shape |
| Environment bug | Missing or wrong env var, wrong `NODE_ENV` |
| Database bug | RLS, missing function, wrong project, schema drift |
| Deployment bug | Stale build, wrong alias, failed `vercel --prod` |
| Routing bug | `vercel.json` rewrite, dynamic route mismatch |
| Auth bug | Session token, API key header, operator gate |
| Email/provider bug | Resend domain, API key, from-address |
| Git branch/state bug | Wrong branch, dirty tree, uncommitted protected files |

Do not fix the wrong layer. Identify layer **before** editing.

## Operator flow (mandatory)

1. **Reproduce** — same URL, same payload, same branch.
2. **Identify layer** — use table above.
3. **Inspect logs/output** — `curl -i`, Vercel logs, Supabase logs, API JSON body.
4. **Minimal fix** — smallest correct diff; no drive-by refactors.
5. **`node --check`** — every changed `.js` file.
6. **`npm test`** — must pass.
7. **Governance checks** — `phase-3b5`, `phase-ai-operator-check`, pre-deploy hook.
8. **Deploy** — only after tests pass; `vercel --prod` when user requests production.
9. **Verify production** — `curl -i https://execution.executia.io/...` (or relevant path).
10. **Report** — exact status code, body snippet, what changed and why.

## Prohibited

- Assuming production DB state without query or API proof
- Applying SQL without confirming project id
- Committing secrets or `.env`
- Deploying with failing tests
- Declaring “fixed” without production or local verification
- Mutating `audit_events` / `ledger_entries` without explicit user approval

## Related context

- `.cursor/context/vendor-operations.md` — Supabase, Vercel, GitHub, Resend, env
- `docs/governance/ai-operator-governance.md` — full policy
