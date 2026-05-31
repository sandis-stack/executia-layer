# Institutional Publication Program

**Reference:** Homepage `FROZEN_FOR_REVIEW` · institutional publication · authority ceiling **ACTIVE**  
**Rule:** Homepage remains canonical reference. No page may exceed homepage authority.

## Execution phase

| # | Workstream | Status |
|---|------------|--------|
| 01 | Demonstration | COMPLETE |
| 02 | Request Pilot | COMPLETE |
| 03 | Cross-page consistency | IN_PROGRESS |
| 04 | Mobile validation | PENDING |
| 05 | Accessibility validation | PENDING |

## Homepage restrictions

No structural changes · no new sections · no CTA redesign · no navigation expansion · no alternate design language

**Allowed:** typography · spacing · alignment · responsive · accessibility

## Machine authority

- `governance/institutional-publication-program.json`
- `governance/homepage-v1-frozen.json`
- `governance/demonstration-v1-publication.json`

## Verify

```bash
node scripts/executia-homepage-v1-frozen-verify.cjs
node scripts/executia-institutional-publication-verify.cjs
node scripts/executia-standard-v1-verify.cjs
node scripts/executia-request-pilot-v1-frozen-verify.cjs
```
