# EXECUTIA Homepage — Conversion Masterplan

**Authority:** EXECUTIA CTO · **Task:** CTO TASK 02  
**Source:** `docs/executia-homepage-audit.md`  
**Date:** 2026-06-01  
**Constraint:** Planning only — no code, UI, or deployment changes.

---

## Audience

| Segment | Primary concern | Decision authority | Success signal |
|---------|-----------------|-------------------|----------------|
| **Governments** | Procurement integrity, public accountability, audit defensibility | Permanent secretary, procurement director | Can justify pilot to cabinet / audit committee |
| **Regulators** | Traceability, compliance exposure, evidence continuity | Chief compliance officer, audit director | Can verify governance without post-hoc investigation |
| **Ministries** | Cross-agency execution risk, policy-to-operations gap | Director general, operations lead | Can name failure cost before budget commitment |
| **Equinor-class enterprises** | Supplier payment, energy ops, multi-jurisdiction exposure | CFO office, head of governance, sector COO | Can quantify risk on a named process in under 2 minutes |
| **Infrastructure operators** | Contractor execution, maintenance approval, safety governance | Asset director, infrastructure PMO | Can map one operational commitment to governance gaps |

**Universal conversion outcome:** Visitor understands failure cost → sees proof → runs assessment on their process → receives executive output → requests pilot — without human explanation.

---

## Ideal Conversion Flow

```
HERO (orient + primary scroll)
  ↓
COST OF EXECUTION FAILURE (motivation)
  ↓
WHY CURRENT SYSTEMS FAIL (legitimacy of problem)
  ↓
WHAT EXECUTIA DOES (mechanism trust)
  ↓
GOVERNMENT USE CASES ──┐
ENTERPRISE USE CASES  ──┴→ (self-identify)
  ↓
LIVE PROOF (evidence — static example + link to Demonstration)
  ↓
EXECUTION ENGINE (interactive assessment — their process)
  ↓
LIVE PROOF (dynamic — Executive Report revealed)
  ↓
PROOF EXPLORER (optional depth — regulator path)
  ↓
PILOT PROGRAM (scope + deliverables)
  ↓
REQUEST PILOT (conversion)
```

**Regulator-fast path:** HERO → LIVE PROOF (Demonstration / Proof Explorer) → REQUEST PILOT (institutional review)  
**Enterprise-fast path:** HERO → EXECUTION ENGINE → LIVE PROOF (result) → REQUEST PILOT  
**Government-fast path:** HERO → GOVERNMENT USE CASES → EXECUTION ENGINE → REQUEST PILOT

---

## Section 01 — HERO

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Establish institutional authority in one screen; orient all five audience segments to a single outcome proposition |
| **Visitor question answered** | *What is EXECUTIA and why should I continue?* |
| **Conversion goal** | Scroll commitment — visitor proceeds to failure-cost section or primary CTA |
| **CTA** | **Assess Your Process** (scroll to EXECUTION ENGINE) · secondary: **View Live Proof** (scroll to LIVE PROOF) |
| **Existing section reused** | Global header `[data-ex-env-header]` · brand subline from institutional shell · partial intent from `#exHomeProblem` lead |
| **New content required** | Single headline stating execution governance before commitment · one-sentence outcome promise · audience-neutral institutional badge · no form in hero |
| **Priority** | **P0** — entry gate; without hero, triple-entry confusion (Problem + Example + Form) persists per audit |

### Architecture rules

**WHY IT EXISTS**  
Homepage currently lacks a dedicated hero; Problem, Example Result, and Assessment form compete as entry points. Hero consolidates institutional identity before conversion narrative.

**WHAT MUST BE SHOWN**  
- EXECUTIA™ as execution governance standard (not product marketing)  
- One primary outcome statement: governance before operational commitment  
- Two CTAs maximum: assess (engine) and proof (evidence)  
- Global nav: Home · Demonstration · Request Pilot (unchanged shell)

**WHAT MUST NOT BE SHOWN**  
- Assessment form fields  
- Static example metrics  
- Publication annex / registry document identity  
- Technical architecture labels (Execution Risk Assessment, Governance Readiness Review)  
- Multiple competing primary buttons

---

## Section 02 — COST OF EXECUTION FAILURE

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Name the financial, compliance, and reputational cost of execution proceeding without governance continuity |
| **Visitor question answered** | *What do we lose when execution fails?* |
| **Conversion goal** | Problem recognition — visitor accepts failure is structural, not episodic |
| **CTA** | Implicit scroll · optional text link: *Why this keeps happening* → Section 03 |
| **Existing section reused** | `#exHomeProblem` — Hidden risk · Compliance exposure · Delayed correction |
| **New content required** | Section title **Cost of Execution Failure** · optional one-line government/enterprise parallel (procurement vs supplier payment) · no new metrics required at launch |
| **Priority** | **P0** — motivation block; required before mechanism or engine |

### Architecture rules

**WHY IT EXISTS**  
Ministries and enterprise CFO offices need failure cost named before they invest attention in proof or assessment. Current Problem section content maps here with label upgrade only.

**WHAT MUST BE SHOWN**  
- Three failure outcomes (risk · compliance · correction delay)  
- Institutional tone — not alarmist marketing  
- Failure framed as *execution continuing without governance continuity*

**WHAT MUST NOT BE SHOWN**  
- Product feature lists  
- Duplicate Before/With EXECUTIA narrative (reserved for Sections 03–04)  
- Assessment form or pilot pricing  
- Vendor comparison language

---

## Section 03 — WHY CURRENT SYSTEMS FAIL

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Explain why ERP, workflow, and manual governance do not prevent execution-stage failure |
| **Visitor question answered** | *Why hasn't our existing control environment solved this?* |
| **Conversion goal** | Legitimacy — visitor accepts new governance layer is required, not replacement of systems |
| **CTA** | Scroll to **What EXECUTIA Does** · optional: *See proof* → Section 05 |
| **Existing section reused** | `#exHomeDifference` — **Before** column (Supplier paid → Contract reviewed later → Issue discovered → Audit investigates) |
| **New content required** | Section title **Why Current Systems Fail** · optional regulator line: *evidence assembled after commitment, not before* · map Before column explicitly to systemic failure pattern |
| **Priority** | **P1** — critical for regulators and ministries; reduces "we already have controls" objection |

### Architecture rules

**WHY IT EXISTS**  
Regulators and government audit functions ask why existing systems failed. Before-column narrative answers without attacking incumbent vendors.

**WHAT MUST BE SHOWN**  
- Sequential failure pattern (pay → review later → discover → investigate)  
- Post-commitment discovery as root cause  
- Applicability to procurement, payments, infrastructure approvals

**WHAT MUST NOT BE SHOWN**  
- EXECUTIA solution details (Section 04)  
- Live proof or generated results  
- Implementation timeline or pilot scope  
- "With EXECUTIA" column (moved to Section 04)

---

## Section 04 — WHAT EXECUTIA DOES

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | State mechanism: validation before commitment, decision trace, registry proof, immediate audit availability |
| **Visitor question answered** | *What does EXECUTIA actually do to our process?* |
| **Conversion goal** | Mechanism trust — visitor believes EXECUTIA governs execution without replacing systems |
| **CTA** | **Run Assessment on Your Process** → Section 08 · secondary: **View Government / Enterprise Cases** → Sections 06–07 |
| **Existing section reused** | `#exHomeDifference` — **With** column · partial `#exHomeWhatYouReceive` mechanism rows (Missing Controls · Validation Failures · Recommended Actions) |
| **New content required** | Unified mechanism statement (4 bullets max) · explicit *no system replacement* line for enterprise · separation of mechanism (here) from deliverables (Section 10) |
| **Priority** | **P0** — bridge between problem recognition and proof/engine |

### Architecture rules

**WHY IT EXISTS**  
Equinor-class enterprises and infrastructure operators need to know EXECUTIA sits above existing ERP/workflow, not as rip-and-replace.

**WHAT MUST BE SHOWN**  
- Validation before payment/commitment  
- Decision trace recorded  
- Registry proof created  
- Audit available immediately  
- Business-language deliverable names only where listing outputs

**WHAT MUST NOT BE SHOWN**  
- Technical pipeline labels (REQUEST → VALIDATION → GOVERNANCE → COMMIT) on homepage body  
- Duplicate failure outcomes from Section 02  
- Full deliverable registry (split to Section 10)  
- Assessment form

---

## Section 05 — LIVE PROOF

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Demonstrate that EXECUTIA produces verifiable governance output — before and after visitor runs engine |
| **Visitor question answered** | *Can you prove this works on a real process?* |
| **Conversion goal** | Evidence acceptance — visitor trusts output format before investing form completion |
| **CTA** | **View Evidence Annex** → `/demonstration/` · **Export Executive Report** (post-engine) · **Open Proof Explorer** → Section 09 |
| **Existing section reused** | `#exHomeExampleResult` (static preview) · `#exHomeResultSection` (dynamic post-assessment) · `#homeExportPdfBtn` · nav → Demonstration |
| **New content required** | Two-state layout: *Example Result* (always visible) + *Your Result* (revealed after engine) · single LIVE PROOF section header · link tile to Demonstration annex |
| **Priority** | **P0** — regulators and ministries require evidence before pilot commitment |

### Architecture rules

**WHY IT EXISTS**  
Audit maps Example Result at position 3 (before form) and Executive Report at position 5 (after form) under one proof concept with clear preview vs generated states.

**WHAT MUST BE SHOWN**  
- Static example: Risk level · Validation gaps · Compliance exposure · Audit readiness · Pilot candidate  
- Dynamic report (post-engine): Executive Summary · Execution Risk Level · Detected Governance Gaps · Compliance Exposure · Recommended Actions · EXECUTIA Evaluation  
- Export Executive Report action (only after generated result)  
- Path to Demonstration evidence annex

**WHAT MUST NOT BE SHOWN**  
- Assessment intake fields inside proof block  
- Request Pilot CTA (reserved for Section 11)  
- Publication Sequence / Administrative Review Records  
- Fabricated organization names without assessment context

---

## Section 06 — GOVERNMENT USE CASES

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Enable government, ministry, and regulator visitors to self-identify within 10 seconds |
| **Visitor question answered** | *Does EXECUTIA apply to our public-sector execution environment?* |
| **Conversion goal** | Segment match — government visitor proceeds to engine with sector pre-context |
| **CTA** | **Assess Public Process** → Section 08 (Sector pre-select: Government / Public Procurement) |
| **Existing section reused** | Sector dropdown values: Government · Public Procurement · Infrastructure (from `#exHomeAuditEntry`) · institutional copy from demonstration annex where applicable |
| **New content required** | 4–6 government use-case rows: Public procurement · Ministry cross-agency approval · Regulatory reporting · Infrastructure concession · Healthcare governance · Defense logistics · each with one-line execution failure pattern |
| **Priority** | **P1** — required for government/ministry/regulator conversion; currently missing on homepage |

### Architecture rules

**WHY IT EXISTS**  
No homepage narrative today for government segment; sector exists only as form dropdown per audit.

**WHAT MUST BE SHOWN**  
- Named public-sector process types  
- Failure pattern per case (one line)  
- Institutional applicability — not country-specific law citations on homepage  
- Link to assessment with sector context

**WHAT MUST NOT BE SHOWN**  
- Enterprise-only cases (Section 07)  
- Pricing or contract terms  
- Political positioning  
- Full case studies (link to Demonstration)

---

## Section 07 — ENTERPRISE USE CASES

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Enable Equinor-class and infrastructure operator visitors to self-identify |
| **Visitor question answered** | *Does EXECUTIA apply to our operational and supplier execution environment?* |
| **Conversion goal** | Segment match — enterprise visitor proceeds to engine with sector pre-context |
| **CTA** | **Assess Enterprise Process** → Section 08 (Sector pre-select: Energy / Infrastructure / Finance) |
| **Existing section reused** | Sector dropdown: Energy · Infrastructure · Finance · Regulated Operations · execution-test scenario names (Public Procurement, Banking Settlement, Infrastructure Maintenance) as reference |
| **New content required** | 4–6 enterprise use-case rows: Energy supplier payment · Banking settlement · Infrastructure maintenance · Regulated operations · Transportation · Construction · Equinor-class energy ops called generically (*major energy operator supplier payment*) not as endorsement |
| **Priority** | **P1** — required for enterprise/infrastructure conversion; currently missing |

### Architecture rules

**WHY IT EXISTS**  
Enterprise visitors need process-level recognition (supplier payment, maintenance approval) before assessment.

**WHAT MUST BE SHOWN**  
- Named operational process types  
- Multi-jurisdiction / scale signal for Equinor-class without client logo unless approved  
- Infrastructure operator maintenance and contractor paths  
- CTA into engine with sector hint

**WHAT MUST NOT BE SHOWN**  
- Government procurement detail (Section 06)  
- Product SaaS positioning  
- Implementation team bios  
- ROI calculators (out of scope for institutional homepage)

---

## Section 08 — EXECUTION ENGINE

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Convert visitor intent into a governed assessment on their real process in under 60 seconds |
| **Visitor question answered** | *What would EXECUTIA find in our organization?* |
| **Conversion goal** | Assessment completion → Executive Report generated → proof + pilot path unlocked |
| **CTA** | **Generate Assessment** · on success scroll/reveal LIVE PROOF (dynamic state) |
| **Existing section reused** | `#exHomeAuditEntry` full form: Country · Sector · Organization · Process · `#homeRunAuditBtn` · `executia-homepage-engine-ux.js` flow |
| **New content required** | Section title **Execution Engine** · one-line instruction · sector pre-fill from Sections 06–07 CTAs · resolve duplication with `/execution-test/` — homepage engine is canonical; Execution Test linked as *advanced simulation* optional secondary |
| **Priority** | **P0** — primary conversion interaction |

### Architecture rules

**WHY IT EXISTS**  
Assessment-first funnel is the core conversion mechanic per audit. Must be single canonical intake on homepage.

**WHAT MUST BE SHOWN**  
- Four fields: Country · Sector · Organization · Process  
- Generate Assessment button (enabled when intake confirmed)  
- Generating state indicator  
- Post-submit reveal of Section 05 dynamic proof  
- Optional footnote link to `/execution-test/` for extended simulation (not duplicate form)

**WHAT MUST NOT BE SHOWN**  
- Six-step Governance Audit intake (removed from Execution Test rollback)  
- Operational Commitment multi-step wizard on homepage  
- Request Pilot form fields (Section 11)  
- Example result metrics inside engine block  
- Two parallel assessment forms on same page

---

## Section 09 — PROOF EXPLORER

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Offer regulator and audit-depth visitors immutable proof-chain exploration without blocking main funnel |
| **Visitor question answered** | *Can I inspect the proof chain myself?* |
| **Conversion goal** | Regulator trust — depth proof supports pilot or institutional review request |
| **CTA** | **Open Proof Explorer** → `/proof-explorer/` · secondary: **View Public Proof** → `/public-proof/` |
| **Existing section reused** | Surface at `/proof-explorer/` (not currently homepage-linked per audit) · `/public-proof/` institutional proof band |
| **New content required** | Homepage IA slot: 2–3 lines describing proof-chain continuity · single CTA tile · optional screenshot/reference from proof explorer (content only, no UI redesign) |
| **Priority** | **P2** — regulator path; not required for enterprise fast path but required for institutional completeness |

### Architecture rules

**WHY IT EXISTS**  
Regulators and audit directors need self-service proof inspection; audit identified Proof Explorer as unlinked orphan surface.

**WHAT MUST BE SHOWN**  
- Proof chain concept (immutable · replay-safe · regulator-readable)  
- Link to Proof Explorer  
- Optional link to Public Proof registry

**WHAT MUST NOT BE SHOWN**  
- Full proof explorer embedded on homepage (link out only)  
- Assessment form  
- Marketing demo animations  
- Duplicate LIVE PROOF example metrics

---

## Section 10 — PILOT PROGRAM

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Define pilot scope, deliverables, and suitability so visitor knows exactly what pilot produces |
| **Visitor question answered** | *What do we get from a pilot and is it bounded?* |
| **Conversion goal** | Pilot qualification — visitor accepts 2–4 week evaluation scope before requesting |
| **CTA** | **Request Pilot Evaluation** → Section 11 · visible after assessment recommended (or always for qualified visitors) |
| **Existing section reused** | `#exHomeWhatYouReceive` deliverable rows · `#homePilotRecommendationBlock` expected outputs list · `/request-pilot/` scope copy (reference only, not duplicated form) |
| **New content required** | Structured blocks: **What You Receive** · **Suitable For** (Government · Energy · Infrastructure · Banking · Procurement · Regulated Enterprise) · **Pilot Scope** (2–4 week · existing process only · no system replacement · governance focus · executive review output) · merge recommendation text from result engine when assessment complete |
| **Priority** | **P0** — required before final conversion; separates promise from action |

### Architecture rules

**WHY IT EXISTS**  
Audit identified duplication between What You Receive, Recommendation block, and Request Pilot page. Pilot Program consolidates promise; Request Pilot holds action.

**WHAT MUST BE SHOWN**  
- Deliverables in business language: Risks Identified · Missing Controls · Compliance Exposure · Validation Failures · Recommended Actions · Executive Audit Report  
- Pilot scope boundaries  
- Suitability list for government and enterprise segments  
- EXECUTIA Recommendation when assessment indicates pilot candidate

**WHAT MUST NOT BE SHOWN**  
- Request form fields (Section 11)  
- Publication Sequence · Review Records · Annex language  
- Pricing  
- Full Executive Report tables (Section 05)  
- Technical evaluation band labels without business translation

---

## Section 11 — REQUEST PILOT

### Block specification

| Field | Definition |
|-------|------------|
| **Objective** | Capture pilot request in under 60 seconds with assessment context pre-filled |
| **Visitor question answered** | *How do I start?* |
| **Conversion goal** | **Conversion** — pilot request submitted with organization, process, and assessment payload |
| **CTA** | **Request Pilot Evaluation** (primary) · success state: Pilot request received |
| **Existing section reused** | `#homeRequestPilotBtnTop` · `#homeRequestPilotBtn` · header/footer Request Pilot nav · `/request-pilot/` onboarding form (Organization · Domain · Risk · System · Problem · Contact · Email · Request Pilot Review) · session/query payload from assessment |
| **New content required** | Homepage closing CTA band pointing to `/request-pilot/` · pre-fill contract documented (Organization · Process · Risk level · Detected issues · Pilot candidate from assessment) · single CTA placement on homepage (remove duplicate top/bottom in IA plan — one primary in this section) |
| **Priority** | **P0** — terminal conversion event |

### Architecture rules

**WHY IT EXISTS**  
All funnel paths must terminate in pilot request. Audit shows CTAs currently hidden inside Executive Report; masterplan moves conversion intent to dedicated final section while retaining deep links from result.

**WHAT MUST BE SHOWN**  
- Primary CTA: Request Pilot Evaluation  
- Assurance line: executive review initiated · confirmation timeline  
- Path for visitors who skipped assessment (header nav always available)  
- Assessment context carried forward when available

**WHAT MUST NOT BE SHOWN**  
- Duplicate pilot scope essay (Section 10)  
- Assessment form re-entry  
- Administrative publication registry  
- Multiple competing submit buttons on homepage body

---

## Global Shell (Header + Footer)

| Element | Role in conversion | Action |
|---------|-------------------|--------|
| `[data-ex-env-header]` | Persistent orient + exit to Demonstration / Request Pilot | **KEEP** unchanged |
| `[data-ex-env-footer]` | Trust metadata + nav repeat | **KEEP** unchanged |
| Demonstration nav | LIVE PROOF annex entry | **KEEP** |
| Request Pilot nav | REQUEST PILOT bypass | **KEEP** |

---

## Priority Summary

| Priority | Sections | Rationale |
|----------|----------|-----------|
| **P0** | 01 HERO · 02 COST · 04 WHAT EXECUTIA DOES · 05 LIVE PROOF · 08 EXECUTION ENGINE · 10 PILOT PROGRAM · 11 REQUEST PILOT | Minimum viable institutional conversion funnel |
| **P1** | 03 WHY SYSTEMS FAIL · 06 GOVERNMENT · 07 ENTERPRISE | Objection handling + segment self-identification |
| **P2** | 09 PROOF EXPLORER | Regulator depth path |

---

## Implementation Sequence (IA only — not code)

1. Reorder existing blocks per target architecture  
2. Add HERO slot (content synthesis, no new visual system)  
3. Split `#exHomeDifference` into Sections 03 and 04  
4. Merge `#exHomeExampleResult` + `#exHomeResultSection` under Section 05  
5. Add Sections 06–07 (new copy, reuse sector taxonomy)  
6. Relocate `#exHomeAuditEntry` to Section 08; link Execution Test as secondary  
7. Add Section 09 link tile to Proof Explorer  
8. Split `#exHomeWhatYouReceive` + recommendation into Section 10  
9. Consolidate pilot CTAs into Section 11  

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Time to assessment start | ≤ 90 seconds from landing for enterprise visitor |
| Time to pilot CTA visibility | ≤ 120 seconds after assessment complete |
| Segment self-identification | Government or enterprise visitor finds case row without scrolling past engine |
| Regulator path | Proof + Proof Explorer reachable without completing assessment |
| Duplication | Zero parallel assessment forms on homepage |
| Content preservation | All existing homepage blocks reused or merged — none discarded without merge target |

---

**End of masterplan. No code modified.**
