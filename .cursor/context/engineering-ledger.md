# EXECUTIA Engineering Ledger Context (Phase 3B6)

## Core idea

**Commits are engineering events.**  
**Deploys are governed transitions.**  
**Engineering history is replayable.**  
**Architecture drift is detectable.**  
**Engineering truth should be deterministic.**

## Relationship to execution truth

| Plane | Question |
|-------|----------|
| Execution (`ledger_entries`, audit verify) | What is the material state of an execution? |
| Engineering (`engineering-ledger/*.json`) | What changed in code before deploy, under what risk? |

Never conflate the two. Engineering snapshots do not set execution status.

## When to record

Run before deploy (via `pre-deploy-check.sh`):

```bash
node scripts/phase-3b6-engineering-ledger.js
```

Output: `ENGINEERING_LEDGER_RECORDED` + path under `engineering-ledger/`.

## Classification (summary)

| Pattern | Risk |
|---------|------|
| Docs / `.cursor` context only | `LOW` |
| UI / console HTML only | `LOW` / `MEDIUM` |
| Protected file touched | `HIGH` or `CANONICAL` |
| `sql/**`, audit, ledger, replay, verify | `CANONICAL` |
| Auth / API routing | `HIGH` |

See `change-classification.md` for full taxonomy.

## Replay

To replay engineering context for an incident:

1. Open snapshot JSON for deploy window
2. `git checkout <commit>` (read-only investigation) or diff against current HEAD
3. Re-run `npm test` and governance checks required by `governance.deterministic_checks_required`

## Drift

Compare consecutive snapshots: protected-file frequency, risk escalation, scope of `files_changed`.

## Rules for Cursor

- Do not edit historical `engineering-ledger/*.json` files
- Append new snapshots only via the script
- Do not store secrets in snapshots
- Classify changes before touching protected files (Phase 3B5)
