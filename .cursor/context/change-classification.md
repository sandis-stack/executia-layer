# EXECUTIA Change Classification (Phase 3B5)

Cursor and contributors must **state classification before proposing edits**.

## Change classes

| Class | Description |
|-------|-------------|
| `UI_CHANGE` | Console, public HTML/CSS, institutional layout only |
| `ROUTING_CHANGE` | API route files, `vercel.json` rewrites, handler wiring |
| `SECURITY_CHANGE` | Auth, JWT, internal keys, RLS-related application logic |
| `AUDIT_IMPACTING_CHANGE` | Supplemental audit chain, `audit/verify`, `services/audit.js` |
| `LEDGER_IMPACTING_CHANGE` | `ledger_entries`, `services/ledger.js`, material hash authority |
| `REPLAY_IMPACTING_CHANGE` | `execution/replay`, public verify, replay UI |
| `CANONICAL_TRUTH_CHANGE` | Any change that alters what “verified” or “truth” means |
| `DOCS_ONLY` | Markdown, context, rules, runbooks — no runtime behavior |

## Risk levels

| Level | Meaning |
|-------|---------|
| `LOW` | Cosmetic / copy / non-behavioral UI |
| `MEDIUM` | UI with new client fetch paths or display of proof data |
| `HIGH` | Auth, routing, new endpoints, client exposure surface |
| `CANONICAL` | Material truth, audit chain, SQL, verification semantics |

## Classification rules

| Change pattern | Class | Risk |
|----------------|-------|------|
| HTML/CSS/console only | `UI_CHANGE` | `LOW` or `MEDIUM` |
| New or moved API handlers | `ROUTING_CHANGE` | `HIGH` |
| `services/auth.js`, `jwt-auth.js`, operator gates | `SECURITY_CHANGE` | `HIGH` |
| `api/v1/audit/**`, `services/audit.js` | `AUDIT_IMPACTING_CHANGE` | `CANONICAL` |
| `services/ledger.js`, ledger verify helpers | `LEDGER_IMPACTING_CHANGE` | `CANONICAL` |
| `execution/replay.js`, `verify/**`, replay UI | `REPLAY_IMPACTING_CHANGE` | `HIGH` or `CANONICAL` |
| `sql/**` | `LEDGER_IMPACTING_CHANGE` + `AUDIT_IMPACTING_CHANGE` | `CANONICAL` |
| Alters verify outcome or hash formulas | `CANONICAL_TRUTH_CHANGE` | `CANONICAL` |
| `.cursor/**`, `docs/**` only | `DOCS_ONLY` | `LOW` |

### Public verify endpoint

| Change | Class | Risk |
|--------|-------|------|
| Read-only field additions (public-safe) | `REPLAY_IMPACTING_CHANGE` | `HIGH` |
| Auth required on public route | `SECURITY_CHANGE` | `CANONICAL` |
| Exposes actor, email, payload, secrets | `CANONICAL_TRUTH_CHANGE` | `CANONICAL` |

### SQL

All `sql/**` changes are **`CANONICAL`** regardless of intent. Require explicit human approval and `PHASE_3B5_ALLOW_SQL=1` for governance check bypass.

## Required statement (before edits)

```
Classification: <CLASS> (+ optional secondary)
Risk: <LOW|MEDIUM|HIGH|CANONICAL>
Protected files: <list or none>
Verification plan: node --check …, npm test, …
```

## Examples

| Task | Classification | Risk |
|------|----------------|------|
| Ledger modal replay timeline cards | `UI_CHANGE` + `REPLAY_IMPACTING_CHANGE` | `MEDIUM` |
| New public verify field (hash only) | `REPLAY_IMPACTING_CHANGE` | `HIGH` |
| Patch `executia_append_global_audit_event` | `AUDIT_IMPACTING_CHANGE` | `CANONICAL` |
| Typos in `docs/PHASE_3B*.md` | `DOCS_ONLY` | `LOW` |
