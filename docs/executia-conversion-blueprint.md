# EXECUTIA Conversion Blueprint

**Authority:** EXECUTIA CTO · **Task:** CTO TASK 03  
**Sources:** `docs/executia-homepage-audit.md` · `docs/executia-homepage-masterplan.md`  
**Date:** 2026-06-01  
**Constraint:** Planning only — no code, UI, or deployment changes.

---

## Objective

Define exactly how a first-time visitor becomes a pilot applicant — by audience psychology, proof requirements, dropout triggers, and a seven-step conversion journey with goal, message, evidence, and CTA at each step.

**Terminal conversion event:** Pilot request submitted at `/request-pilot/` with organization, process, and assessment context (when available).

---

## Audience Profiles

### 1. Government Minister

| Dimension | Definition |
|-----------|------------|
| **A. Primary fear** | Public execution failure becomes political liability — procurement scandal, audit finding, or compliance breach discovered after commitment |
| **B. Primary objective** | Demonstrate governance continuity before budget or policy commitment; defensible decision trail for cabinet and parliament |
| **C. First 5 seconds** | *Is this institutional infrastructure or a vendor product?* · *Does this apply to government execution, not IT?* |
| **D. First 30 seconds** | *What failure cost are we avoiding?* · *Can this be explained to audit committee without technical jargon?* · *Is there evidence from comparable public processes?* |
| **E. Proof required** | Named public-sector use case · before/after execution pattern · sample governance output (risk · gaps · compliance exposure) · link to evidence annex · exportable executive report |
| **F. What causes them to leave** | Product marketing tone · SaaS demo aesthetic · no government applicability · assessment form too early · technical pipeline vocabulary · no bounded pilot scope |
| **G. What causes them to request pilot** | Clear 2–4 week bounded evaluation · existing process only (no system replacement) · executive summary output · assessment on a named ministry/agency process · institutional language throughout |

---

### 2. Regulator

| Dimension | Definition |
|-----------|------------|
| **A. Primary fear** | Execution proceeds without traceable governance; evidence assembled post-hoc; audit investigates instead of prevents |
| **B. Primary objective** | Verify execution integrity, proof continuity, and replay-safe evidence before endorsing or inspecting an operator |
| **C. First 5 seconds** | *Is this a governance standard or an application?* · *Can I inspect proof independently?* |
| **D. First 30 seconds** | *What evidence chain exists?* · *Is output regulator-readable?* · *Does this block invalid execution before commitment?* |
| **E. Proof required** | Live proof sample (static + generated) · Proof Explorer access · Demonstration evidence annex · immutable proof language · export executive report · detected governance gaps table with business impact |
| **F. What causes them to leave** | Claims without verifiable proof path · no proof explorer · marketing superlatives · black-box AI language · assessment required before any evidence visible |
| **G. What causes them to request pilot** | Self-service proof inspection succeeds · sample output matches regulator inspection needs · pilot scoped to governance/audit focus only · clear institutional review pathway |

---

### 3. State Agency

| Dimension | Definition |
|-----------|------------|
| **A. Primary fear** | Cross-agency execution breaks down — approvals bypassed, contractor payments proceed, audit exposure accumulates across silos |
| **B. Primary objective** | Map one operational commitment to governance gaps; obtain executive output to escalate internally |
| **C. First 5 seconds** | *Does this apply to our agency process?* · *Is this procurement-only or broader operational governance?* |
| **D. First 30 seconds** | *What would EXECUTIA find in our process?* · *How long does assessment take?* · *What deliverables do we receive?* |
| **E. Proof required** | Government use-case row matching agency function · example assessment result · ability to run assessment on agency process (country · sector · organization · process) · recommended actions list · pilot deliverables registry |
| **F. What causes them to leave** | Enterprise-only examples · form too complex · no public-sector cases · unclear deliverables · pilot scope appears open-ended |
| **G. What causes they to request pilot** | Assessment completed on their process · pilot candidate = YES or SUITABLE · pre-filled pilot request · 60-second form · confirmation that executive review will follow |

---

### 4. Equinor-class Enterprise

| Dimension | Definition |
|-----------|------------|
| **A. Primary fear** | Supplier payment, energy operations, or multi-jurisdiction process executes with hidden governance gaps — CFO and board exposure |
| **B. Primary objective** | Quantify execution risk on a named process (e.g. supplier payment) in minutes; obtain executive audit report for internal governance forum |
| **C. First 5 seconds** | *Is this for operations or IT?* · *Does this apply to energy / major enterprise scale?* |
| **D. First 30 seconds** | *What failure cost?* · *Does it replace our ERP?* (must answer: no) · *Can I test on Equinor-scale process without sales call?* |
| **E. Proof required** | Enterprise use-case row (energy · supplier payment) · example HIGH risk result · execution engine on real org/process · executive report with risk level and gaps · export PDF |
| **F. What causes them to leave** | Government-only framing · long explanatory website · sales-first CTA · duplicate intake systems · no energy/enterprise case · assessment button disabled without explanation |
| **G. What causes them to request pilot** | Assessment on their organization/process · HIGH VALUE CANDIDATE or SUITABLE evaluation · pilot scope: existing process only · Request Pilot with pre-filled context · under 60 seconds to submit |

---

### 5. Infrastructure Operator

| Dimension | Definition |
|-----------|------------|
| **A. Primary fear** | Contractor execution, maintenance approval, or safety-critical commitment proceeds without continuous oversight — incident discovered after the fact |
| **B. Primary objective** | Validate governance on one infrastructure operational commitment; proof for asset director or PMO |
| **C. First 5 seconds** | *Does this cover contractor/maintenance execution?* · *Infrastructure-specific or generic compliance?* |
| **D. First 30 seconds** | *What controls are missing today?* · *How does proof work for regulators?* · *Pilot bounded to one process?* |
| **E. Proof required** | Infrastructure use-case row · before/after contrast (pay → review later vs validate before payment) · assessment on maintenance/concession process · compliance exposure breakdown · pilot scope: no system replacement |
| **F. What causes them to leave** | Finance-only examples · no infrastructure narrative · heavy publication/registry language · proof buried after long scroll · no maintenance/contractor path |
| **G. What causes them to request pilot** | Assessment reflects their operational commitment · detected issues match their risk profile · pilot recommendation visible · clear executive review output promise |

---

## EXECUTIA Conversion Journey

### Step 1 — Arrival

| Field | Definition |
|-------|------------|
| **Goal** | Orient visitor in one screen; establish institutional authority; route segment without confusion |
| **Message** | EXECUTIA governs execution before operational commitment. Execution governance standard — not a product demo. |
| **Evidence** | Global header (EXECUTIA™ · Home · Demonstration · Request Pilot) · hero outcome statement · institutional badge |
| **CTA** | **Assess Your Process** (scroll to Engine) · **View Live Proof** (scroll to Proof) |

**Audience notes:** Minister and regulator need institutional tone in 5 seconds. Enterprise and infrastructure need *operations not IT* signal immediately.

---

### Step 2 — Problem Recognition

| Field | Definition |
|-------|------------|
| **Goal** | Visitor accepts execution failure has structural cost — not isolated incidents |
| **Message** | Execution failures create hidden risk, compliance exposure, and delayed correction. Cost accumulates when commitment precedes governance. |
| **Evidence** | Cost of Execution Failure block — three outcome bullets · optional public/private parallel line |
| **CTA** | Implicit scroll · *Why current systems fail* → Step 3 |

**Audience notes:** Minister fears political liability. Regulator fears post-hoc audit. Enterprise fears CFO exposure. All need failure named before solution.

---

### Step 3 — Trust Formation

| Field | Definition |
|-------|------------|
| **Goal** | Visitor accepts EXECUTIA adds governance layer without replacing existing systems; understands why incumbents failed |
| **Message** | Current systems discover failure after commitment (paid → reviewed later → issue found → audit investigates). EXECUTIA validates before commitment, records decision trace, creates registry proof, makes audit available immediately. |
| **Evidence** | Why Current Systems Fail (before pattern) · What EXECUTIA Does (mechanism bullets) · explicit *no system replacement* |
| **CTA** | **See proof** → Step 4 · **Assess your process** → Step 5 |

**Audience notes:** State agency and infrastructure operator need *no rip-and-replace* assurance. Regulator needs *before commitment* mechanism.

---

### Step 4 — Proof Validation

| Field | Definition |
|-------|------------|
| **Goal** | Visitor believes output is real, inspectable, and applicable to their environment |
| **Message** | EXECUTIA produces verifiable governance output on real processes. Example below; run assessment to generate yours. |
| **Evidence** | Static example result (risk · gaps · compliance · audit readiness · pilot candidate) · link to Demonstration evidence annex · optional Proof Explorer entry · post-engine: full Executive Report · Export Executive Report |
| **CTA** | **View Evidence Annex** → `/demonstration/` · **Open Proof Explorer** → `/proof-explorer/` · **Generate Assessment** → Step 5 |

**Audience notes:** Regulator requires Proof Explorer path. Minister requires exportable report. Enterprise requires example HIGH-risk sample before form investment.

---

### Step 5 — Engine Exploration

| Field | Definition |
|-------|------------|
| **Goal** | Visitor completes assessment on their process; receives personalized executive output |
| **Message** | Generate a governance assessment for a real process in your organization. Four fields. Under 60 seconds. |
| **Evidence** | Execution Engine form: Country · Sector · Organization · Process · Generate Assessment · generating state · revealed Executive Report (summary · risk · gaps · compliance · actions · evaluation) |
| **CTA** | **Generate Assessment** (primary) · on success → scroll to dynamic Live Proof · optional: *Advanced simulation* → `/execution-test/` |

**Audience notes:** Equinor-class visitor pre-fills Energy + organization + Supplier Payment. State agency pre-fills Government/Public Procurement. Dropout if button stays disabled without field guidance.

---

### Step 6 — Pilot Evaluation

| Field | Definition |
|-------|------------|
| **Goal** | Visitor qualifies pilot scope and accepts bounded evaluation before submitting |
| **Message** | Based on assessment, a pilot evaluation is recommended. 2–4 weeks. Existing process only. Governance and audit focus. Executive review output. |
| **Evidence** | Pilot Program block: What You Receive · Suitable For · Pilot Scope · EXECUTIA Recommendation (when assessment complete) · expected outputs list (Governance Gap Analysis · Validation Review · Execution Risk Mapping · Executive Summary · Pilot Recommendation) |
| **CTA** | **Request Pilot Evaluation** → Step 7 |

**Audience notes:** Minister requires bounded scope. Infrastructure operator requires *one process* clarity. All segments reject open-ended consulting language.

---

### Step 7 — Pilot Request

| Field | Definition |
|-------|------------|
| **Goal** | Capture pilot request; confirm executive review initiated |
| **Message** | Request institutional execution pilot. Define governance problem and operational environment. EXECUTIA evaluates suitability and creates pilot review identifier. |
| **Evidence** | `/request-pilot/` form · pre-fill from assessment (organization · process · risk · issues · pilot candidate) · success state: Pilot request received · executive review timeline |
| **CTA** | **Request Pilot Review** / **Request Pilot Evaluation** (submit) · header Request Pilot always available as bypass |

**Audience notes:** All segments convert when form ≤ 60 seconds and assessment context pre-filled. Minister may bypass assessment via header if already convinced — form must stand alone.

---

## Journey by Audience (Fast Paths)

| Audience | Primary path | Proof emphasis | Typical dropout step |
|----------|--------------|----------------|---------------------|
| **Government Minister** | 1 → 2 → 3 → 6 → 7 | Bounded pilot scope | Step 4 if no government case visible |
| **Regulator** | 1 → 4 → 9 (Proof Explorer) → 6 → 7 | Proof Explorer + Demonstration | Step 5 if assessment required before proof |
| **State Agency** | 1 → 2 → 6 (gov cases) → 5 → 7 | Assessment on agency process | Step 5 if form blocked |
| **Equinor-class Enterprise** | 1 → 7 (enterprise cases) → 5 → 6 → 7 | Executive report export | Step 3 if replacement fear not addressed |
| **Infrastructure Operator** | 1 → 2 → 7 (infra case) → 5 → 6 → 7 | Before/after + gaps table | Step 4 if proof not infrastructure-relevant |

---

## Conversion Requirements (All Audiences)

| Requirement | Standard |
|-------------|----------|
| Time to institutional clarity | ≤ 5 seconds (hero + header) |
| Time to problem recognition | ≤ 30 seconds (Steps 1–2) |
| Time to first proof | ≤ 60 seconds (Step 4 reachable without assessment) |
| Time to assessment complete | ≤ 120 seconds (Step 5) |
| Time to pilot submit | ≤ 60 seconds after reaching Step 7 |
| Language | Business outcomes only on homepage body |
| Forbidden dropout triggers | Publication annex · review records · disabled CTA without cause · duplicate assessment forms · technical pipeline as primary copy |

---

## Mapping to Homepage Architecture

| Journey step | Homepage section (masterplan) |
|--------------|-------------------------------|
| 1 Arrival | 01 HERO + global shell |
| 2 Problem Recognition | 02 COST OF EXECUTION FAILURE |
| 3 Trust Formation | 03 WHY CURRENT SYSTEMS FAIL + 04 WHAT EXECUTIA DOES |
| 4 Proof Validation | 05 LIVE PROOF + 09 PROOF EXPLORER |
| 5 Engine Exploration | 08 EXECUTION ENGINE |
| 6 Pilot Evaluation | 10 PILOT PROGRAM |
| 7 Pilot Request | 11 REQUEST PILOT → `/request-pilot/` |

---

## Success Definition

A first-time visitor becomes a pilot applicant when:

1. They recognize execution failure cost (Step 2)  
2. They trust EXECUTIA mechanism without system replacement fear (Step 3)  
3. They accept proof format (Step 4) — or complete assessment (Step 5)  
4. They accept pilot scope (Step 6)  
5. They submit Request Pilot with valid contact and process context (Step 7)  

**Conversion = Step 7 submit success state reached.**

---

**End of blueprint. No code modified.**
