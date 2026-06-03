# EXECUTIA Homepage — Information Architecture Audit

**Authority:** EXECUTIA CTO · **Task:** CTO TASK 01  
**Scope:** Current homepage only (`public/index.html` + institutional shell mount)  
**Date:** 2026-06-01  
**Constraint:** Analysis only — no code, design, or functionality changes performed.

**Production route:** `https://execution.executia.io/` (also `executia.io` entry when routed to same surface)

---

## 1. Current Section Order

| # | Section ID | Label / Purpose | Visibility |
|---|------------|-----------------|------------|
| 0 | `[data-ex-env-header]` | Global EXECUTIA header + primary navigation | Always |
| 1 | `#exHomeProblem` | Problem — execution failure outcomes | Always |
| 2 | `#exHomeWhatYouReceive` | What You Receive — deliverable registry | Always |
| 3 | `#exHomeExampleResult` | Example Assessment Result — static sample metrics | Always |
| 4 | `#exHomeAuditEntry` | Run Execution Assessment — intake form + Generate | Always |
| 5 | `#exHomeResultSection` | Executive Report — post-assessment output | Hidden until assessment completes |
| 5a | `#homeRequestPilotBtnTop` | Next Step — Request Pilot Evaluation | Hidden until result |
| 5b | `#homeResultExecutiveSummary` | Executive Summary | Hidden until result |
| 5c | `#homeExecutionRiskScale` | Execution Risk Level | Hidden until result |
| 5d | `#homeDetectedIssuesTable` | Detected Governance Gaps | Hidden until result |
| 5e | `#homeComplianceExposure` | Compliance Exposure | Hidden until result |
| 5f | `#homeRecommendedActionsTable` | Recommended Actions | Hidden until result |
| 5g | `#homeEvaluationScale` | EXECUTIA Evaluation | Hidden until result |
| 5h | `#homePilotRecommendationBlock` | EXECUTIA Recommendation + pilot outputs list | Hidden until result |
| 5i | `#homeRequestPilotBtn` | Request Pilot Evaluation (bottom) | Hidden until result |
| 5j | `#homeExportPdfBtn` | Export Executive Report | Hidden until result |
| 6 | `#exHomeDifference` | Before EXECUTIA / With EXECUTIA — contrast proof | Always |
| 7 | `[data-ex-env-footer]` | Global footer + publication metadata | Always |

**Note:** Frozen Publication System v1 sections (Hero, Standard Structure, Standard Layers, Standard Authority, Today, What Changes, Why It Matters, Next Action, Publication Metadata) are **not** present in the current working homepage HTML. The live codebase homepage is the outcome-first assessment engine surface documented above.

---

## 2. Current Navigation Structure

### Global header (homepage)

Mounted via `executia-institutional-environment.js` → `PUBLIC_PRODUCT_FLOW`:

| Nav item | Route | Active on homepage |
|----------|-------|-------------------|
| EXECUTIA™ (brand) | `/` | — |
| Home | `/` | Yes |
| Demonstration | `/demonstration/` | No |
| Request Pilot | `/request-pilot/` | No |

Brand subline on homepage: **Execution governance standard**

### Global footer (homepage)

| Element | Content |
|---------|---------|
| Primary line | `EXECUTIA-STANDARD-V1 · Published · EXECUTIA CTO` |
| Footer nav | Home · Demonstration · Request Pilot |
| Meta line | `EXECUTIA Standard` |

### Not in homepage navigation (exists elsewhere)

| Surface | Route | Relevance |
|---------|-------|-----------|
| Execution Test | `/execution-test/` | Institutional FLOW nav on non-product pages |
| Proof | `/public-proof/` | FLOW nav |
| Governance | `/execution-demo.html` | FLOW nav |
| Proof Explorer | `/proof-explorer/` | Not linked from homepage |

---

## 3. Current CTA Locations

| CTA | Location | Type | Default state |
|-----|----------|------|---------------|
| **Generate Assessment** | `#exHomeAuditEntry` / `#homeRunAuditBtn` | Primary button | Disabled until intake confirmed |
| **Request Pilot Evaluation** | `#exHomeResultSection` top (`#homeRequestPilotBtnTop`) | Link → `/request-pilot/` | Hidden until result |
| **Request Pilot Evaluation** | `#exHomeResultSection` recommendation block (`#homeRequestPilotBtn`) | Link → `/request-pilot/` | Hidden until result |
| **Export Executive Report** | `#exHomeResultSection` actions (`#homeExportPdfBtn`) | Button (print/PDF) | Hidden + disabled until result |
| **Request Pilot** | Global header nav | Link → `/request-pilot/` | Always visible |
| **Demonstration** | Global header nav | Link → `/demonstration/` | Always visible |
| **Home** | Global header + footer nav | Link → `/` | Always visible |

**No in-page CTA** to Execution Test, Proof Explorer, or Engine on homepage body.

---

## 4. Current Proof Locations

| Proof type | Location | Nature |
|------------|----------|--------|
| Static sample result | `#exHomeExampleResult` | Fixed HIGH / 4 gaps / MEDIUM / LOW / YES |
| Dynamic assessment result | `#exHomeResultSection` | Generated after form submit |
| Exportable report | `#homeExportPdfBtn` → PDF/print window | Post-assessment artifact |
| Before/after contrast | `#exHomeDifference` | Narrative proof (supplier payment flow) |
| Deliverable promise | `#exHomeWhatYouReceive` | Outcome registry (not live data) |
| External proof surfaces | Nav only → `/demonstration/` | Not embedded on homepage |
| External execution proof | Not linked from homepage | `/public-proof/`, `/proof-explorer/` |

---

## 5. Current Conversion Path

```
Entry (/)
  → Read Problem outcomes
  → Scan What You Receive (deliverables)
  → View Example Assessment Result (static proof)
  → Complete Run Execution Assessment (Country, Sector, Organization, Process)
  → Generate Assessment
  → Executive Report revealed
       → Export Executive Report  OR  Request Pilot Evaluation
  → Request Pilot (/request-pilot/) with query/session payload
  → (Optional) scroll to Before/With EXECUTIA contrast — after primary flow
```

**Alternate exits (navigation only, not in-page funnel):**

- Demonstration (`/demonstration/`) — evidence annex
- Request Pilot (`/request-pilot/`) — direct from header without assessment

**Conversion intent:** Assessment-first → result → pilot request. Header allows pilot bypass.

---

## TARGET STRUCTURE (Conversion System IA)

| # | Target section | Purpose |
|---|----------------|---------|
| 1 | **HERO** | Institutional entry — single value proposition + primary action |
| 2 | **COST OF EXECUTION FAILURE** | Quantify / name failure cost |
| 3 | **WHY CURRENT SYSTEMS FAIL** | Systemic failure explanation |
| 4 | **WHAT EXECUTIA DOES** | Capability / mechanism |
| 5 | **LIVE PROOF** | Verifiable evidence |
| 6 | **GOVERNMENT USE CASES** | Sector-specific government paths |
| 7 | **ENTERPRISE USE CASES** | Sector-specific enterprise paths |
| 8 | **EXECUTION ENGINE** | Interactive execution / assessment entry |
| 9 | **PROOF EXPLORER** | Proof chain exploration |
| 10 | **PILOT PROGRAM** | Pilot scope, deliverables, suitability |
| 11 | **REQUEST PILOT** | Conversion form / CTA |

---

## Section Mapping Table

| Current Section | Current Location | Target Location | Action | Reason |
|-----------------|------------------|-----------------|--------|--------|
| Global header + nav | `[data-ex-env-header]` | HERO (shell) + all sections | **KEEP** | Shared institutional shell; required for conversion continuity |
| Problem | `#exHomeProblem` — position 1 | **COST OF EXECUTION FAILURE** | **MOVE** | Content matches failure-cost framing; rename label to target vocabulary |
| What You Receive | `#exHomeWhatYouReceive` — position 2 | **WHAT EXECUTIA DOES** + **PILOT PROGRAM** | **MERGE** | Deliverables describe both mechanism output and pilot value; split rows across two targets without duplicating registry |
| Example Assessment Result | `#exHomeExampleResult` — position 3 | **LIVE PROOF** | **MOVE** | Static proof sample belongs under live proof, not before engine |
| Run Execution Assessment (form) | `#exHomeAuditEntry` — position 4 | **EXECUTION ENGINE** | **MOVE** | Interactive assessment is the engine entry; currently placed mid-page before proof narrative completes |
| Executive Report (full block) | `#exHomeResultSection` — position 5 | **LIVE PROOF** + **REQUEST PILOT** | **MERGE** | Result is proof artifact; CTAs belong under Request Pilot target |
| Executive Summary | `#homeResultExecutiveSummary` | **LIVE PROOF** | **KEEP** | Core proof output |
| Execution Risk Level | `#homeExecutionRiskScale` | **LIVE PROOF** | **KEEP** | Proof metric |
| Detected Governance Gaps | `#homeDetectedIssuesTable` | **LIVE PROOF** | **KEEP** | Proof table |
| Compliance Exposure | `#homeComplianceExposure` | **LIVE PROOF** | **KEEP** | Proof registry |
| Recommended Actions | `#homeRecommendedActionsTable` | **LIVE PROOF** | **KEEP** | Proof actions |
| EXECUTIA Evaluation | `#homeEvaluationScale` | **LIVE PROOF** | **KEEP** | Proof verdict |
| EXECUTIA Recommendation | `#homePilotRecommendationBlock` | **PILOT PROGRAM** | **MOVE** | Pilot recommendation framing |
| Request Pilot Evaluation CTAs | `#homeRequestPilotBtnTop`, `#homeRequestPilotBtn` | **REQUEST PILOT** | **MOVE** | Conversion CTAs belong in final target section |
| Export Executive Report | `#homeExportPdfBtn` | **LIVE PROOF** | **KEEP** | Proof export action stays with proof block |
| Before EXECUTIA / With EXECUTIA | `#exHomeDifference` — position 6 | **WHY CURRENT SYSTEMS FAIL** + **WHAT EXECUTIA DOES** | **MERGE** | "Before" → why systems fail; "With" → what EXECUTIA does; currently duplicated narrative at page bottom |
| Global footer | `[data-ex-env-footer]` | All sections (shell) | **KEEP** | Institutional trust + nav repeat |
| Header: Demonstration link | Nav | **LIVE PROOF** (link target) | **KEEP** | Routes to evidence annex; anchor live proof section to same surface |
| Header: Request Pilot link | Nav | **REQUEST PILOT** | **KEEP** | Direct conversion exit |
| — (missing) | Not on homepage | **HERO** | **REMOVE DUPLICATION** | No dedicated hero; Problem + Example Result currently act as split hero — consolidate into single HERO to avoid triple entry (Problem, Example, Form) |
| — (missing) | Not on homepage | **GOVERNMENT USE CASES** | **MOVE** | Sector options exist in assessment Sector dropdown only; no narrative government block — pull from institutional copy / demonstration annex |
| — (missing) | Not on homepage | **ENTERPRISE USE CASES** | **MOVE** | Same as government — sector list in form is not a use-case section |
| — (missing) | Not on homepage | **PROOF EXPLORER** | **MOVE** | Surface exists at `/proof-explorer/` but not linked from homepage — add IA slot, link out or embed |
| — (missing) | Not on homepage | **EXECUTION ENGINE** (Execution Test) | **REMOVE DUPLICATION** | `/execution-test/` Public Execution Test is separate surface; homepage assessment duplicates engine intent — clarify single engine entry or cross-link without two intake systems |
| Publication Standard blocks (frozen v1) | Not in current HTML | N/A | **REMOVE DUPLICATION** | If reintroduced, would duplicate HERO / WHAT EXECUTIA DOES / proof — exclude from conversion homepage or merge into HERO metadata only |

---

## Target Order vs Current Order

| Target # | Target section | Primary current source(s) |
|----------|----------------|---------------------------|
| 1 | HERO | **New IA slot** — synthesize from Problem lead + institutional brand (no current single hero) |
| 2 | COST OF EXECUTION FAILURE | `#exHomeProblem` |
| 3 | WHY CURRENT SYSTEMS FAIL | `#exHomeDifference` (Before column) |
| 4 | WHAT EXECUTIA DOES | `#exHomeWhatYouReceive` + `#exHomeDifference` (With column) |
| 5 | LIVE PROOF | `#exHomeExampleResult` + `#exHomeResultSection` + nav → Demonstration |
| 6 | GOVERNMENT USE CASES | **New IA slot** — sector/intake hints only today |
| 7 | ENTERPRISE USE CASES | **New IA slot** — sector/intake hints only today |
| 8 | EXECUTION ENGINE | `#exHomeAuditEntry` (+ resolve duplication with `/execution-test/`) |
| 9 | PROOF EXPLORER | **New IA slot** — link/embed `/proof-explorer/` |
| 10 | PILOT PROGRAM | `#exHomeWhatYouReceive` (pilot rows) + `#homePilotRecommendationBlock` |
| 11 | REQUEST PILOT | `#homeRequestPilotBtn*` + header/footer Request Pilot + `/request-pilot/` |

---

## Duplication Risks (IA only)

| Duplication | Locations | Recommended IA action |
|-------------|-----------|----------------------|
| Proof before and after engine | Example Result (pos 3) vs Executive Report (pos 5) | **MERGE** under LIVE PROOF; example becomes preview, result becomes generated state |
| Pilot promise vs pilot CTA | What You Receive vs Recommendation vs Request Pilot buttons | **MERGE** PILOT PROGRAM (promise) + REQUEST PILOT (action) |
| Failure narrative | Problem vs Before/With EXECUTIA | **MERGE** into COST + WHY CURRENT SYSTEMS FAIL; remove repeated failure lists |
| Two assessment engines | Homepage form vs `/execution-test/` | **REMOVE DUPLICATION** — one canonical EXECUTION ENGINE on homepage or link-only to Execution Test |
| Three entry points | Problem, Example Result, Generate form | **REMOVE DUPLICATION** — HERO provides single entry; defer example until LIVE PROOF |

---

## Summary

The current homepage is an **assessment-led conversion funnel** (Problem → Deliverables → Example → Form → Report → Pilot) mounted in the **public product shell** (Home · Demonstration · Request Pilot). It lacks explicit HERO, sector use-case blocks, Proof Explorer integration, and separates Execution Test as an unlinked parallel engine. The target institutional conversion system requires **reordering and merging** existing blocks—not new visual design—plus **IA slots** for Government/Enterprise use cases, Hero, and Proof Explorer that today exist only on other surfaces or not at all.

**End of audit. No code modified.**
