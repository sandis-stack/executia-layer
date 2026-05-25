# AI Operator Governance

EXECUTIA does not treat Cursor as an uncontrolled AI coder. Cursor is governed as the **EXECUTIA AI Operator**.

## Principle

**Diagnose → verify → fix → test → deploy.** Never guess production state.

## Operator responsibilities

| Area | Operator must |
|------|----------------|
| Supabase | Confirm project `dnyaancdvdsibbkdjdor`; no blind SQL; no audit/ledger mutation without approval |
| Vercel | `vercel --prod`; verify `https://execution.executia.io`; `curl -i` when JSON fails |
| GitHub | `git status --short`; no secrets; small commits; tests pass before commit |
| Resend | Env-only keys; separate provider errors from app logic |
| Env | Never expose `.env`; report missing vars by name only |

## Bug layers

Always classify before fixing:

code · environment · database · deployment · routing · auth · email/provider · git

## Automated gate

`scripts/phase-ai-operator-check.js` runs in pre-deploy hook. Blocks on:

- `.env` staged or tracked
- `console.log(process.env)`
- Hardcoded service role / Resend / postgres password patterns
- Unsafe `UPDATE`/`DELETE`/`TRUNCATE` on `audit_events` or `ledger_entries` in SQL (non-comment)

## Cursor configuration

| Asset | Purpose |
|-------|---------|
| `.cursor/context/ai-operator-governance.md` | Operator rules |
| `.cursor/context/vendor-operations.md` | Vendor playbooks |
| `.cursor/rules/ai-operator-governance.mdc` | Always-on operator flow |
| `.cursor/rules/vendor-safety.mdc` | Always-on vendor safety |

## Verification

```bash
node --check scripts/phase-ai-operator-check.js
npm test
.cursor/hooks/pre-deploy-check.sh
```

No runtime API, SQL, or DB changes in this layer — governance only.
