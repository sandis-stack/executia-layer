# Task 35 — Canonical EXECUTIA navigation architecture

## Layer separation

| Layer | Host | Header source | Brand href | Primary nav |
|-------|------|---------------|------------|-------------|
| ENTRY | `https://executia.io` | Separate site (external deployment) | `https://executia.io/` | ENTRY · GLOBAL · INSTITUTIONAL + CTA Enter Execution Test ↗ |
| Institutional | `https://execution.executia.io` | `executia-institutional-environment.js` | `https://executia.io/` | HOME · VALIDATE EXECUTION · PROOF · PILOT |

`executia.io` is **not** built from this repository. Production ENTRY HTML is served independently (see live `site-header` at executia.io). This repo governs **execution.executia.io** only.

## Implementation

- `renderEntryHeader()` — hostname `executia.io` / `www.executia.io`
- `renderInstitutionalHeader()` — hostname `execution.executia.io` (default for local dev)
- `resolvePublicLayer()` selects render path; labels are never mixed on a single page.

## Verify

```bash
node --check public/components/executia-institutional-environment.js
node scripts/task-35-nav-architecture-verify.mjs
```

Production: `curl -i` and browser checks on both hosts after `vercel --prod`.
