# EXECUTIA Homepage — Component Inventory

**Authority:** EXECUTIA CTO · **Task:** CTO TASK 05  
**Sources:** `docs/executia-homepage-wireframe.md` · codebase scan of `public/index.html` and homepage-related components  
**Date:** 2026-06-01  
**Constraint:** Inventory and feasibility analysis only — no code, UI, or deployment changes.

---

## Scan Scope

| Path | Role |
|------|------|
| `public/index.html` | Current homepage DOM sections |
| `public/components/executia-homepage-engine-ux.js` | Engine UX, result renderers, CTA wiring |
| `public/components/executia-homepage-audit-result.js` | Assessment result model, PDF, pilot query |
| `public/components/executia-homepage-engine.css` | Homepage section + CTA + result styles |
| `public/components/executia-institutional-environment.js` | Global header/footer, hero/CTA renderers (entry mount) |
| `public/components/executia-institutional-environment.css` | Shell, registry, publication, request-pilot field styles |
| `public/components/executia-assessment-demo.css` | Shared `ex-inst-field`, `ex-inst-generate-btn`, registry |
| `public/components/executia-intake-catalogs.js` | Sector/country catalogs |
| `public/components/executia-intake-autocomplete.js` | Country/organization autocomplete |
| `public/components/executia-organization-registry.js` | Organization registry confirmation |
| `public/components/executia-pilot-readiness.js` | Pilot/proof example data + render helpers |
| `public/components/executia-standard-homepage.js` | Publication metadata (not in current index DOM) |
| `public/components/executia-demonstration-ux.js` | Evidence annex surface |
| `public/proof-explorer/index.html` | Proof Explorer destination |
| `public/request-pilot/index.html` | Pilot request destination |
| `public/demonstration/index.html` | Live proof evidence annex |

---

## Asset Categories

### 1. Existing Sections (current `public/index.html`)

| ID | Label | Wireframe target |
|----|-------|------------------|
| `[data-ex-env-header]` | Global header | All sections (shell) |
| `#exHomeProblem` | Problem | 02 Cost of Execution Failure |
| `#exHomeWhatYouReceive` | What You Receive | 04 + 10 (split) |
| `#exHomeExampleResult` | Example Assessment Result | 05 Live Proof (static) |
| `#exHomeAuditEntry` | Run Execution Assessment | 08 Execution Engine |
| `#exHomeResultSection` | Executive Report | 05 Live Proof (dynamic) |
| `#exHomeDifference` | Before / With EXECUTIA | 03 + 04 (split) |
| `[data-ex-env-footer]` | Global footer | Shell |

**Not in current index:** `#exHomeHero`, `#exHomeGovernmentCases`, `#exHomeEnterpriseCases`, `#exHomeProofExplorer`, `#exHomePilotProgram`, `#exHomeRequestPilot`

---

### 2. Existing Proof Components

| Component | File | Capability |
|-----------|------|------------|
| Static example registry | `#exHomeExampleResult` | Risk · gaps · compliance · audit readiness · pilot candidate |
| Dynamic executive report | `#exHomeResultSection` + `executia-homepage-engine-ux.js` | Summary · risk scale · gaps table · compliance · actions · evaluation |
| Audit result engine | `executia-homepage-audit-result.js` | `buildAuditResult`, `buildAuditPdfHtml`, `buildPilotQuery`, issue catalog |
| Export executive report | `#homeExportPdfBtn` + inline print handler | PDF/print window |
| Before/after contrast | `#exHomeDifference` | Narrative proof |
| Proof examples renderer | `executia-pilot-readiness.js` → `renderProofExamples()` | Replay-safe proof cards (not homepage-mounted) |
| Proof intro renderer | `executia-institutional-environment.js` → `renderProofIntro()` | Proof band copy (not homepage-mounted) |
| Proof Explorer surface | `public/proof-explorer/index.html` | Standalone proof lookup |
| Public proof surface | `public/public-proof/index.html` | Proof receipt registry |
| Demonstration annex | `public/demonstration/index.html` + `executia-demonstration-ux.js` | Evidence annex (nav-linked) |

---

### 3. Existing Governance Components

| Component | File | Capability |
|-----------|------|------------|
| Institutional shell | `executia-institutional-environment.js` | Header, footer, page resolution, AI clarity vocabulary |
| Design tokens | `executia-design-system.css` | Spacing, color, typography tokens |
| Registry rows | `ex-home-registry`, `ex-home-registry-row`, `ex-standard-registry-row` | Label/value institutional rows |
| Section labels | `ex-inst-label` | Institutional section headings |
| Standard homepage metadata | `executia-standard-homepage.js` | JSON-LD, publication identity (parallel system) |
| Governance core | `executia-governance-core.js`, `executia-canonical-semantics.js` | Runtime semantics (not homepage-rendered) |
| Consequence band | `renderConsequenceBand()` | Execution posture strip |

---

### 4. Existing Engine Components

| Component | File | Capability |
|-----------|------|------------|
| Assessment form | `#exHomeAuditForm` | Country · Sector · Organization · Process |
| Generate control | `#homeRunAuditBtn`, `#homeAuditGenerating` | Trigger + loading state |
| Engine UX module | `executia-homepage-engine-ux.js` | Ready check, run audit, render all result blocks, visibility |
| Intake catalogs | `executia-intake-catalogs.js` | SECTORS, COUNTRIES arrays |
| Intake autocomplete | `executia-intake-autocomplete.js` | Country/organization typeahead |
| Organization registry | `executia-organization-registry.js` | Registry confirmation badge |
| API bridge | `POST /api/v1/execution/analyze` | Assessment backend (via engine UX) |
| Session payload | `executia_home_audit_payload` sessionStorage | Cross-surface continuity |

---

### 5. Existing CTA Components

| Component | Location | Label |
|-----------|----------|-------|
| `ex-inst-generate-btn` | `#homeRunAuditBtn` | Generate Assessment |
| `ex-home-pilot-btn` / `ex-home-action-primary` | `#homeRequestPilotBtnTop`, `#homeRequestPilotBtn` | Request Pilot Evaluation |
| `ex-home-export-btn` | `#homeExportPdfBtn` | Export Executive Report |
| `ex-home-cta-primary` / `ex-home-cta-secondary` | CSS only (no current DOM) | Hero CTA pattern |
| `ex-env-hero-cta` | `renderEntryCtas()` | Request institutional review · Assess operational exposure |
| Header nav | `renderHeader()` | Home · Demonstration · Request Pilot |
| Footer nav | `renderFooter()` | Home · Demonstration · Request Pilot |
| Request Pilot submit | `public/request-pilot/index.html` | Request Pilot Review |

---

### 6. Existing Use-Case Components

| Component | File | Content |
|-----------|------|---------|
| Sector dropdown | `#domain` in `#exHomeAuditForm` | Energy · Government · Public Procurement · Infrastructure · etc. |
| Sector catalog | `executia-intake-catalogs.js` → `SECTORS` | 13 sector values |
| Pilot examples data | `executia-pilot-readiness.js` → `PILOT_EXAMPLES` | Procurement · Payment · Compliance · Infrastructure |
| Pilot examples renderer | `renderPilotExamples()` | Button list (mount: `[data-ex-env-pilot-examples]`) |
| Defined-for list | `renderEntryDefinedFor()` | Institutional audience list (entry hero mount) |
| Institutional proof cases | `renderInstitutionalProofCases()` | Entry-section proof cases |
| Execution Test scenarios | `public/execution-test/index.html` | Public Procurement · Banking · Infrastructure · etc. (separate surface) |
| `ex-home-pilot-card` CSS | `executia-assessment-demo.css` | Card grid pattern (unused in current index) |

**Gap:** No dedicated `#exHomeGovernmentCases` or `#exHomeEnterpriseCases` section or renderer on homepage.

---

## Wireframe Section Feasibility

### 01 — HERO

| Metric | Value |
|--------|-------|
| **Status** | **PARTIAL** |
| **Ready %** | 40% |
| **Reuse %** | 45% |
| **New Build %** | 55% |
| **Missing Components** | `#exHomeHero` section DOM · wireframe headline/subline copy block · anchor CTAs (`Assess Your Process` / `View Live Proof`) · `[data-ex-env-hero]` mount or equivalent |
| **Implementation Risk** | **MEDIUM** — CSS classes exist (`ex-home-hero`, `ex-home-cta-primary/secondary`) but unused in index; `renderHomeHero()` is entry-v2 semantic stack (wrong copy/structure for wireframe); requires new section assembly from existing tokens, not new design system |

**Reusable:** `renderHeader()`, `ex-home-hero` CSS, `ex-home-cta-*` CSS, `ex-inst-label`, `ex-home-kicker` pattern

---

### 02 — COST OF EXECUTION FAILURE

| Metric | Value |
|--------|-------|
| **Status** | **READY** |
| **Ready %** | 92% |
| **Reuse %** | 90% |
| **New Build %** | 10% |
| **Missing Components** | Section title rename (`Problem` → `Cost of Execution Failure`) · optional `#exHomeCostOfFailure` ID alias |
| **Implementation Risk** | **LOW** — reorder + relabel only |

**Reusable:** `#exHomeProblem`, `ex-home-problem-lead`, `ex-home-problem-outcomes`, `ex-inst-label`

---

### 03 — WHY CURRENT SYSTEMS FAIL

| Metric | Value |
|--------|-------|
| **Status** | **PARTIAL** |
| **Ready %** | 68% |
| **Reuse %** | 70% |
| **New Build %** | 30% |
| **Missing Components** | Standalone `#exHomeWhySystemsFail` section · split Before column from combined `#exHomeDifference` · section title |
| **Implementation Risk** | **LOW** — DOM split/reorder; no new logic |

**Reusable:** `#exHomeDifference` Before block, `ex-home-contrast-block`, `ex-home-flow-list`, list copy (supplier paid → audit investigates)

---

### 04 — WHAT EXECUTIA DOES

| Metric | Value |
|--------|-------|
| **Status** | **PARTIAL** |
| **Ready %** | 65% |
| **Reuse %** | 68% |
| **New Build %** | 32% |
| **Missing Components** | `#exHomeWhatExecutiaDoes` wrapper · With-only layout · *no system replacement* assurance line · CTA anchor to engine |
| **Implementation Risk** | **LOW** — extract With column + optional mechanism rows from `#exHomeWhatYouReceive` |

**Reusable:** `#exHomeDifference` With column, `ex-home-flow-list`, partial registry row pattern

---

### 05 — LIVE PROOF

| Metric | Value |
|--------|-------|
| **Status** | **READY** (with wrapper gap) |
| **Ready %** | 88% |
| **Reuse %** | 85% |
| **New Build %** | 15% |
| **Missing Components** | Unified `#exHomeLiveProof` wrapper · sub-headings *Example Result* / *Your Result* · Demonstration link tile (`/demonstration/`) |
| **Implementation Risk** | **LOW** — merge/reorder existing blocks; all render logic exists |

**Reusable:** `#exHomeExampleResult`, `#exHomeResultSection` (all sub-blocks), `#homeExportPdfBtn`, all `render*` functions in `executia-homepage-engine-ux.js`, `buildAuditPdfHtml`, registry + table CSS

---

### 06 — GOVERNMENT USE CASES

| Metric | Value |
|--------|-------|
| **Status** | **MISSING** |
| **Ready %** | 22% |
| **Reuse %** | 28% |
| **New Build %** | 72% |
| **Missing Components** | `#exHomeGovernmentCases` section · use-case row list (6 rows) · per-row CTA with sector pre-select · failure-pattern copy |
| **Implementation Risk** | **MEDIUM** — new section; data partially seedable from `PILOT_EXAMPLES` (procurement, compliance), `SECTORS`, `renderEntryDefinedFor` |

**Reusable:** `ex-home-registry-row` pattern, `SECTORS` (Government, Public Procurement, Healthcare, Defense), `PILOT_EXAMPLES[procurement|compliance]`, `ex-home-pilot-card` CSS (optional)

---

### 07 — ENTERPRISE USE CASES

| Metric | Value |
|--------|-------|
| **Status** | **MISSING** |
| **Ready %** | 24% |
| **Reuse %** | 30% |
| **New Build %** | 70% |
| **Missing Components** | `#exHomeEnterpriseCases` section · use-case row list (6 rows) · sector pre-select CTAs · enterprise copy |
| **Implementation Risk** | **MEDIUM** — new section; data from `PILOT_EXAMPLES` (payment, infrastructure), execution-test scenario names, Energy/Infrastructure sectors |

**Reusable:** Registry row pattern, `PILOT_EXAMPLES[payment|infrastructure]`, sector values Energy · Finance · Infrastructure · Transportation · Construction

---

### 08 — EXECUTION ENGINE

| Metric | Value |
|--------|-------|
| **Status** | **READY** |
| **Ready %** | 94% |
| **Reuse %** | 95% |
| **New Build %** | 5% |
| **Missing Components** | Section title rename (`Execution Engine`) · sector pre-fill from use-case CTAs · optional footnote link to `/execution-test/` |
| **Implementation Risk** | **LOW** — full stack exists; reorder + pre-fill wiring only |

**Reusable:** `#exHomeAuditEntry`, `#exHomeAuditForm`, `#homeRunAuditBtn`, `executia-homepage-engine-ux.js`, `executia-homepage-audit-result.js`, intake scripts, `ex-inst-field`, `ex-inst-generate-btn`

---

### 09 — PROOF EXPLORER

| Metric | Value |
|--------|-------|
| **Status** | **PARTIAL** |
| **Ready %** | 38% |
| **Reuse %** | 42% |
| **New Build %** | 58% |
| **Missing Components** | `#exHomeProofExplorer` homepage section · link tile copy · CTA to `/proof-explorer/` and `/public-proof/` |
| **Implementation Risk** | **LOW** — link-out section only; destination surfaces exist; `renderProofIntro()` provides copy vocabulary |

**Reusable:** `public/proof-explorer/index.html`, `public/public-proof/index.html`, `AI_CLARITY` terms, `renderProofIntro()` copy patterns, institutional link/CTA classes

---

### 10 — PILOT PROGRAM

| Metric | Value |
|--------|-------|
| **Status** | **PARTIAL** |
| **Ready %** | 58% |
| **Reuse %** | 60% |
| **New Build %** | 40% |
| **Missing Components** | `#exHomePilotProgram` unified wrapper · **Suitable For** list · **Pilot Scope** list (2–4 weeks · existing process only · etc.) · consolidation of split deliverable/recommendation blocks |
| **Implementation Risk** | **MEDIUM** — merge `#exHomeWhatYouReceive` + `#homePilotRecommendationBlock`; scope/suitability lists exist in prior request-pilot conversion HTML (not current f7ede8f pilot page) — copy assembly required |

**Reusable:** `#exHomeWhatYouReceive` rows, `#homePilotRecommendationBlock`, `#homePilotExpectedOutputs`, `ex-home-recommendation-list`, registry rows

---

### 11 — REQUEST PILOT

| Metric | Value |
|--------|-------|
| **Status** | **PARTIAL** |
| **Ready %** | 72% |
| **Reuse %** | 75% |
| **New Build %** | 25% |
| **Missing Components** | `#exHomeRequestPilot` closing CTA band on homepage · consolidated single homepage pilot CTA (duplicate top/bottom in result section) |
| **Implementation Risk** | **LOW** — destination surface complete; `buildPilotQuery` + session payload exist |

**Reusable:** `#homeRequestPilotBtn*`, `buildPilotQuery()`, `/request-pilot/` form + submit + success state, header/footer Request Pilot nav, `ex-home-pilot-btn`

---

## Final Summary Table

| Section | Status | Ready % | Reuse % | New Build % | Missing Components | Implementation Risk |
|---------|--------|---------|---------|-------------|-------------------|---------------------|
| **01 HERO** | PARTIAL | 40 | 45 | 55 | Hero DOM, wireframe copy, anchor CTAs | MEDIUM |
| **02 COST OF EXECUTION FAILURE** | READY | 92 | 90 | 10 | Title rename only | LOW |
| **03 WHY CURRENT SYSTEMS FAIL** | PARTIAL | 68 | 70 | 30 | Split Before block, new section ID | LOW |
| **04 WHAT EXECUTIA DOES** | PARTIAL | 65 | 68 | 32 | With-only section, assurance line, CTA | LOW |
| **05 LIVE PROOF** | READY | 88 | 85 | 15 | Unified wrapper, Demonstration tile | LOW |
| **06 GOVERNMENT USE CASES** | MISSING | 22 | 28 | 72 | Full section, rows, CTAs, copy | MEDIUM |
| **07 ENTERPRISE USE CASES** | MISSING | 24 | 30 | 70 | Full section, rows, CTAs, copy | MEDIUM |
| **08 EXECUTION ENGINE** | READY | 94 | 95 | 5 | Title, sector pre-fill, footnote link | LOW |
| **09 PROOF EXPLORER** | PARTIAL | 38 | 42 | 58 | Homepage link section | LOW |
| **10 PILOT PROGRAM** | PARTIAL | 58 | 60 | 40 | Suitable For, Pilot Scope lists, wrapper | MEDIUM |
| **11 REQUEST PILOT** | PARTIAL | 72 | 75 | 25 | Homepage closing CTA band | LOW |

---

## Overall Feasibility

| Metric | Value |
|--------|-------|
| **Weighted average Ready %** | **61%** |
| **Weighted average Reuse %** | **63%** |
| **Weighted average New Build %** | **37%** |
| **Sections READY** | 3 of 11 (02, 05, 08) |
| **Sections PARTIAL** | 6 of 11 |
| **Sections MISSING** | 2 of 11 (06, 07) |

### Verdict

**The wireframe can be built using existing assets without a new design system.** Approximately **63% reuse** of current DOM, CSS classes, JS modules, and external surfaces. **No new visual system required** — implementation is reorder, split, merge, and copy assembly within `ex-home-*`, `ex-inst-*`, and institutional shell patterns.

### Highest-risk gaps

1. **HERO** — CSS exists but no mounted section; wrong hero renderer (`renderHomeHero` entry-v2) if reused verbatim  
2. **GOVERNMENT / ENTERPRISE USE CASES** — only data seeds exist; full sections are new build  
3. **PILOT PROGRAM** — Suitable For / Pilot Scope lists not on current homepage (copy exists in archived request-pilot conversion variant)

### Lowest-risk path

Implement **02 → 03 → 04 → 05 → 08 → 11** first (all reuse ≥65%, risk LOW) using reorder/split only. Add **06 → 07 → 01 → 09 → 10** in phase 2.

---

**End of inventory. No code modified.**
