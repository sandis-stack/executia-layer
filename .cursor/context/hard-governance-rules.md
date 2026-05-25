# Hard Governance Rules (Cursor context)

Binding constraints for every EXECUTIA task. **Governed infrastructure — not AI experimentation.**

## Never allow

- Fragmented UI · hierarchy collapse · nav drift
- Multiple button / radius / spacing systems
- Duplicate surfaces or single-page ENGINE collapse
- Random redesign · broad unapproved rewrites
- Flow or semantics changes without explicit approval
- Presentation + runtime mixed in one unscoped change

## Single canonical systems

| What | Where |
|------|--------|
| Design tokens | `executia-design-system.css` |
| Public shell | `executia-institutional-surfaces.js` + `executia-institutional-environment.js` |
| Console nav | `executia-governance-core.js` ← surfaces registry |
| Semantics | `shared/canonical-execution-semantics.js` |

## Execution flow (fixed)

`REQUEST → VALIDATION → GOVERNANCE → COMMIT → PROOF → REPLAY → CONTINUITY`

## Eight surfaces (fixed)

Execution · Governance · Proof · Replay · Health · Operations · Engineering · Request

## Every large task must include

1. Scope  
2. Affected files  
3. Expected result  
4. Verification (`npm test`, pre-deploy, `node --check`)  
5. Screenshot review (if UI)  
6. **Must not change** (runtime, API, SQL, flow, nav, semantics)

## UI edits

- `--ex-ds-*` tokens only · light institutional · no black backgrounds  
- One header · one footer · no duplicate shells  

## Default

**Institutional consistency over feature expansion.**

Full policy: `docs/governance/hard-governance-rules.md`  
Rule: `.cursor/rules/executia-hard-governance.mdc`
