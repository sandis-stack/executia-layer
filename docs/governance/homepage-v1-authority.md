# EXECUTIA Homepage v1 Authority

**Status:** FROZEN FOR_REVIEW  
**Authority level:** Institutional publication  
**Authority ceiling:** ACTIVE  
**Role:** Canonical reference — review baseline  
**Manifest:** `governance/homepage-v1-frozen.json`  
**Verification:** `node scripts/executia-homepage-v1-frozen-verify.cjs`

## Scope

The public homepage (`/`) is the **v1 publication authority** for the EXECUTIA Standard. It reads as one continuous institutional document — not a website, landing page, or product menu.

## Protected structure

| Order | Section | Source |
|------:|---------|--------|
| 1 | Hero | `#exStandardHero` |
| 2 | EXECUTIA Standard | `#exStandardStructure` |
| 3 | Standard Layers | `#exStandardLayers` |
| 4 | Standard Authority | `#exStandardAuthority` |
| 5 | Today | `#exStandardToday` |
| 6 | What Changes | `#exStandardWhatChanges` |
| 7 | Why It Matters | `#exStandardWhyMatters` |
| 8 | Next Action | `#exStandardCta` |
| 9 | Publication Metadata | `[data-ex-env-footer]` in publication envelope |

## Frozen publication system

- **Envelope:** `.ex-standard-publication-document`
- **Registry language:** label column + value column rows
- **Authority system:** Standard Authority, Why It Matters, Publication Metadata share row language
- **Next Action:** indexed registry directives — no links, no CTA styling
- **Publication Metadata:** Standard / Status / Authority / Document — no navigation footer

## Allowed without unlock

- Typography refinement
- Spacing refinement
- Alignment refinement
- Responsive fixes
- Accessibility fixes

## Prohibited without unlock

- New sections
- New copy
- New design language
- New CTA concepts
- Navigation or website footer on homepage
- Section reorder or homepage redesign
- Forms, control map, or assessment on homepage

## Next phase

1. Demonstration page
2. Request Pilot page
3. Cross-page publication consistency

## Unlock protocol

1. Explicit CTO written approval naming the change
2. Update `governance/homepage-v1-frozen.json` in the same change
3. `node scripts/executia-homepage-v1-frozen-verify.cjs` must pass
4. Document approval in commit message
