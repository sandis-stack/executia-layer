# EXECUTIA Homepage — Final Wireframe

**Authority:** EXECUTIA CTO · **Task:** CTO TASK 04  
**Sources:** `docs/executia-homepage-audit.md` · `docs/executia-homepage-masterplan.md` · `docs/executia-conversion-blueprint.md`  
**Date:** 2026-06-01  
**Constraint:** Wireframe specification only — no code, HTML, CSS, or deployment.

---

## Global Shell (All Sections)

| Element | Specification |
|---------|---------------|
| Header | `[data-ex-env-header]` — EXECUTIA™ · Home · Demonstration · Request Pilot |
| Footer | `[data-ex-env-footer]` — EXECUTIA-STANDARD-V1 · nav repeat · trust metadata |
| Page wrapper | `ex-inst-shell` · `data-ex-env-page="homepage"` |
| Visual system | Existing design tokens only — no new colors, typography, or radius systems |

---

## Full Page Flow

```
┌─────────────────────────────────────────┐
│  GLOBAL HEADER                          │
├─────────────────────────────────────────┤
│  01  HERO                               │
├─────────────────────────────────────────┤
│  02  COST OF EXECUTION FAILURE          │
├─────────────────────────────────────────┤
│  03  WHY EXISTING SYSTEMS FAIL          │
├─────────────────────────────────────────┤
│  04  WHAT EXECUTIA DOES                 │
├─────────────────────────────────────────┤
│  05  LIVE PROOF                         │
├─────────────────────────────────────────┤
│  06  GOVERNMENT USE CASES               │
├─────────────────────────────────────────┤
│  07  ENTERPRISE USE CASES               │
├─────────────────────────────────────────┤
│  08  EXECUTION ENGINE                   │
├─────────────────────────────────────────┤
│  09  PROOF EXPLORER                     │
├─────────────────────────────────────────┤
│  10  PILOT PROGRAM                      │
├─────────────────────────────────────────┤
│  11  REQUEST PILOT                      │
├─────────────────────────────────────────┤
│  GLOBAL FOOTER                          │
└─────────────────────────────────────────┘
```

---

## Section 01 — HERO

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Hero |
| **PURPOSE** | Single institutional entry point; orient all audiences in one screen |
| **PRIMARY MESSAGE** | Execution governance before operational commitment |
| **SECONDARY MESSAGE** | EXECUTIA validates execution integrity before reality-changing commitments proceed |
| **TRUST SIGNAL** | EXECUTIA™ · Execution governance standard · global institutional header |
| **CTA** | Primary: **Assess Your Process** (anchor → Execution Engine) · Secondary: **View Live Proof** (anchor → Live Proof) |
| **EXISTING COMPONENTS REUSED** | `[data-ex-env-header]` · `ex-inst-label` pattern · institutional brand from `executia-institutional-environment.js` |
| **NEW COMPONENTS REQUIRED** | `#exHomeHero` section · hero headline block · hero dual-CTA row · institutional badge (eyebrow) |
| **EXPECTED USER ACTION** | Scroll down or click primary CTA toward engine or proof |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **YES** (headline + primary CTA minimum) |
| Must contain CTA? | **YES** |
| Must contain proof? | **NO** |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ GLOBAL HEADER ]

[ BADGE: Execution Governance Standard ]

[ H1: Execution governance before operational commitment ]

[ Subline: one sentence outcome promise ]

[ Assess Your Process ]  [ View Live Proof ]
```

---

## Section 02 — COST OF EXECUTION FAILURE

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Cost of Execution Failure |
| **PURPOSE** | Name structural cost of execution without governance continuity |
| **PRIMARY MESSAGE** | Execution failures create measurable institutional cost |
| **SECONDARY MESSAGE** | Risk hides until after commitment; compliance exposure accumulates; correction arrives too late |
| **TRUST SIGNAL** | Institutional label · no marketing superlatives |
| **CTA** | Text link: **Why this keeps happening** → Section 03 (optional) |
| **EXISTING COMPONENTS REUSED** | `#exHomeProblem` · `ex-home-problem-outcomes` list · `ex-inst-label` |
| **NEW COMPONENTS REQUIRED** | Section title rename only · `#exHomeCostOfFailure` ID (IA alias) |
| **EXPECTED USER ACTION** | Read three outcomes · continue scroll |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **YES** (section label + at least two outcomes on desktop) |
| Must contain CTA? | **NO** |
| Must contain proof? | **NO** |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ LABEL: Cost of Execution Failure ]

[ Lead: Execution failures create: ]

• Hidden risk
• Compliance exposure
• Delayed correction

[ optional: Why this keeps happening → ]
```

---

## Section 03 — WHY EXISTING SYSTEMS FAIL

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Why Existing Systems Fail |
| **PURPOSE** | Legitimize problem — ERP/workflow/manual governance fail post-commitment |
| **PRIMARY MESSAGE** | Failure is discovered after commitment, not prevented before it |
| **SECONDARY MESSAGE** | Supplier paid → contract reviewed later → issue discovered → audit investigates |
| **TRUST SIGNAL** | Recognizable process pattern (procurement/payment) · no vendor attack |
| **CTA** | Implicit scroll · optional: **See what EXECUTIA does** → Section 04 |
| **EXISTING COMPONENTS REUSED** | `#exHomeDifference` Before column · `ex-home-contrast-block` · `ex-home-flow-list` |
| **NEW COMPONENTS REQUIRED** | Standalone section wrapper `#exHomeWhySystemsFail` · single-column Before layout (split from contrast) |
| **EXPECTED USER ACTION** | Recognize own process in failure sequence · accept systemic gap |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** |
| Must contain CTA? | **NO** |
| Must contain proof? | **NO** |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ LABEL: Why Existing Systems Fail ]

[ H3: Before — current pattern ]

1. Supplier paid
2. Contract reviewed later
3. Issue discovered later
4. Audit investigates
```

---

## Section 04 — WHAT EXECUTIA DOES

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | What EXECUTIA Does |
| **PURPOSE** | State mechanism; confirm no system replacement |
| **PRIMARY MESSAGE** | EXECUTIA governs execution before commitment |
| **SECONDARY MESSAGE** | Validation before payment · decision trace recorded · registry proof created · audit available immediately |
| **TRUST SIGNAL** | *No system replacement* explicit line · mechanism over marketing |
| **CTA** | **Run Assessment on Your Process** → Section 08 · secondary: **View use cases** → Sections 06–07 |
| **EXISTING COMPONENTS REUSED** | `#exHomeDifference` With column · partial `#exHomeWhatYouReceive` mechanism rows |
| **NEW COMPONENTS REQUIRED** | `#exHomeWhatExecutiaDoes` section · mechanism bullet list · no-replacement assurance line |
| **EXPECTED USER ACTION** | Accept mechanism · proceed toward proof or engine |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** |
| Must contain CTA? | **YES** |
| Must contain proof? | **NO** |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ LABEL: What EXECUTIA Does ]

[ Assurance: No system replacement. Existing process only. ]

[ With EXECUTIA — mechanism list ]

• Validation before payment
• Decision trace recorded
• Registry proof created
• Audit available immediately

[ Run Assessment on Your Process ]
```

---

## Section 05 — LIVE PROOF

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Live Proof |
| **PURPOSE** | Demonstrate verifiable governance output — preview and generated |
| **PRIMARY MESSAGE** | EXECUTIA produces inspectable governance output on real processes |
| **SECONDARY MESSAGE** | Example result below; generate assessment to produce yours |
| **TRUST SIGNAL** | Static example metrics · Demonstration annex link · export action post-generation |
| **CTA** | **View Evidence Annex** → `/demonstration/` · **Export Executive Report** (post-engine only) |
| **EXISTING COMPONENTS REUSED** | `#exHomeExampleResult` · `#exHomeResultSection` (all sub-blocks) · `#homeExportPdfBtn` · registry row pattern |
| **NEW COMPONENTS REQUIRED** | Unified `#exHomeLiveProof` wrapper · sub-headings: *Example Result* / *Your Result* · Demonstration link tile |
| **EXPECTED USER ACTION** | Review example metrics · click Demonstration or proceed to engine · after engine: review report · export |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** (example preview may peek on large viewports — not required) |
| Must contain CTA? | **YES** |
| Must contain proof? | **YES** |
| Must contain numbers? | **YES** |

**Wireframe block:**
```
[ LABEL: Live Proof ]

── Example Result (always visible) ──
| Risk Score      | HIGH    |
| Validation Gaps | 4       |
| Compliance      | MEDIUM  |
| Audit Readiness | LOW     |
| Pilot Candidate | YES     |

[ View Evidence Annex → /demonstration/ ]

── Your Result (hidden until assessment) ──
[ Executive Summary ]
[ Execution Risk Level ]
[ Detected Governance Gaps — table ]
[ Compliance Exposure ]
[ Recommended Actions — table ]
[ EXECUTIA Evaluation ]

[ Export Executive Report ]
```

---

## Section 06 — GOVERNMENT USE CASES

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Government Use Cases |
| **PURPOSE** | Government/ministry/regulator self-identification in ≤10 seconds |
| **PRIMARY MESSAGE** | EXECUTIA applies to public-sector execution environments |
| **SECONDARY MESSAGE** | Procurement · ministry cross-agency · regulatory reporting · infrastructure concession · healthcare · defense logistics |
| **TRUST SIGNAL** | Named public process types · institutional applicability |
| **CTA** | **Assess Public Process** → Section 08 (sector pre-select: Government / Public Procurement) |
| **EXISTING COMPONENTS REUSED** | Sector dropdown values from `#exHomeAuditEntry` · registry row pattern · `ex-inst-label` |
| **NEW COMPONENTS REQUIRED** | `#exHomeGovernmentCases` · use-case row list (label + one-line failure pattern each) |
| **EXPECTED USER ACTION** | Find matching case · click assess with sector context |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** |
| Must contain CTA? | **YES** |
| Must contain proof? | **NO** |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ LABEL: Government Use Cases ]

| Public procurement          | Payment before contract validation        | [ Assess → ]
| Ministry cross-agency       | Approval gaps across silos                | [ Assess → ]
| Regulatory reporting        | Evidence assembled after commitment       | [ Assess → ]
| Infrastructure concession   | Contractor execution without trace        | [ Assess → ]
| Healthcare governance       | Treatment approval chain gaps             | [ Assess → ]
| Defense logistics           | Multi-party execution exposure            | [ Assess → ]
```

---

## Section 07 — ENTERPRISE USE CASES

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Enterprise Use Cases |
| **PURPOSE** | Equinor-class and infrastructure enterprise self-identification |
| **PRIMARY MESSAGE** | EXECUTIA applies to operational and supplier execution at enterprise scale |
| **SECONDARY MESSAGE** | Energy supplier payment · banking settlement · infrastructure maintenance · regulated operations · transportation · construction |
| **TRUST SIGNAL** | Named operational processes · scale signal without unauthorized logos |
| **CTA** | **Assess Enterprise Process** → Section 08 (sector pre-select: Energy / Infrastructure / Finance) |
| **EXISTING COMPONENTS REUSED** | Sector dropdown values · execution-test scenario names as reference · registry row pattern |
| **NEW COMPONENTS REQUIRED** | `#exHomeEnterpriseCases` · use-case row list |
| **EXPECTED USER ACTION** | Find matching case · click assess with sector context |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** |
| Must contain CTA? | **YES** |
| Must contain proof? | **NO** |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ LABEL: Enterprise Use Cases ]

| Energy — supplier payment      | Governance gaps before settlement      | [ Assess → ]
| Banking settlement             | Authorization without trace            | [ Assess → ]
| Infrastructure maintenance     | Contractor approval path gaps          | [ Assess → ]
| Regulated operations           | Compliance exposure across jurisdictions| [ Assess → ]
| Transportation                 | Cross-node execution integrity         | [ Assess → ]
| Construction                   | Commitment before validation           | [ Assess → ]
```

---

## Section 08 — EXECUTION ENGINE

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Execution Engine |
| **PURPOSE** | Interactive assessment — visitor's process in under 60 seconds |
| **PRIMARY MESSAGE** | Generate a governance assessment for a real process in your organization |
| **SECONDARY MESSAGE** | Country · Sector · Organization · Process — four fields |
| **TRUST SIGNAL** | Institutional form · generating state · immediate result reveal |
| **CTA** | **Generate Assessment** (primary) · footnote: *Advanced simulation* → `/execution-test/` |
| **EXISTING COMPONENTS REUSED** | `#exHomeAuditEntry` · `#exHomeAuditForm` · `#homeRunAuditBtn` · `#homeAuditGenerating` · `executia-homepage-engine-ux.js` · intake autocomplete scripts |
| **NEW COMPONENTS REQUIRED** | Section title **Execution Engine** · sector pre-fill from Sections 06–07 · single canonical engine (no duplicate form) |
| **EXPECTED USER ACTION** | Complete four fields · click Generate · wait · scroll to Live Proof dynamic state |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** |
| Must contain CTA? | **YES** |
| Must contain proof? | **NO** (output appears in Section 05) |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ LABEL: Execution Engine ]

[ Lead: Generate a governance assessment for a real process in your organization. ]

| Country      | [___________] |
| Sector       | [ dropdown  ] |
| Organization | [___________] |
| Process      | [___________] |

[ Generate Assessment ]

[ Generating assessment… ]  (hidden until active)

[ Advanced simulation → /execution-test/ ]
```

---

## Section 09 — PROOF EXPLORER

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Proof Explorer |
| **PURPOSE** | Regulator depth path — self-service proof-chain inspection |
| **PRIMARY MESSAGE** | Inspect immutable proof continuity independently |
| **SECONDARY MESSAGE** | Replay-safe verification · regulator-readable evidence · execution-time truth |
| **TRUST SIGNAL** | Link to live Proof Explorer surface · institutional vocabulary from AI_CLARITY |
| **CTA** | **Open Proof Explorer** → `/proof-explorer/` · secondary: **View Public Proof** → `/public-proof/` |
| **EXISTING COMPONENTS REUSED** | External surfaces only — no homepage embed · footer trust meta vocabulary |
| **NEW COMPONENTS REQUIRED** | `#exHomeProofExplorer` · 2–3 line description · single link tile |
| **EXPECTED USER ACTION** | Click through to Proof Explorer (regulator path) or continue to Pilot Program |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** |
| Must contain CTA? | **YES** |
| Must contain proof? | **YES** (proof access point, not data) |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ LABEL: Proof Explorer ]

[ Body: Inspect proof-chain continuity, replay-safe verification, and
        regulator-readable execution evidence. ]

[ Open Proof Explorer → /proof-explorer/ ]

[ View Public Proof → /public-proof/ ]
```

---

## Section 10 — PILOT PROGRAM

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Pilot Program |
| **PURPOSE** | Define pilot scope and deliverables before conversion |
| **PRIMARY MESSAGE** | Bounded institutional pilot evaluation — existing process only |
| **SECONDARY MESSAGE** | 2–4 weeks · governance focus · executive review output · no system replacement |
| **TRUST SIGNAL** | Deliverables registry · suitability list · recommendation when assessment complete |
| **CTA** | **Request Pilot Evaluation** → Section 11 |
| **EXISTING COMPONENTS REUSED** | `#exHomeWhatYouReceive` rows · `#homePilotRecommendationBlock` · `#homePilotExpectedOutputs` list |
| **NEW COMPONENTS REQUIRED** | `#exHomePilotProgram` unified section · **Suitable For** list · **Pilot Scope** list |
| **EXPECTED USER ACTION** | Accept pilot boundaries · proceed to request |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** |
| Must contain CTA? | **YES** |
| Must contain proof? | **NO** (deliverable promise, not live data) |
| Must contain numbers? | **YES** (2–4 week scope) |

**Wireframe block:**
```
[ LABEL: Pilot Program ]

── What You Receive ──
• Risks Identified
• Missing Controls
• Compliance Exposure
• Validation Failures
• Recommended Actions
• Executive Audit Report

── Suitable For ──
Government · Energy · Infrastructure · Banking · Procurement · Regulated Enterprise

── Pilot Scope ──
• 2–4 week evaluation
• Existing process only
• No system replacement
• Governance and audit focus
• Executive review output

── EXECUTIA Recommendation (when assessment complete) ──
Based on the assessment, a pilot evaluation is recommended.
[ expected outputs list ]

[ Request Pilot Evaluation → ]
```

---

## Section 11 — REQUEST PILOT

| Field | Specification |
|-------|---------------|
| **SECTION NAME** | Request Pilot |
| **PURPOSE** | Terminal conversion — pilot request in under 60 seconds |
| **PRIMARY MESSAGE** | Request institutional execution pilot |
| **SECONDARY MESSAGE** | EXECUTIA evaluates suitability and creates pilot review identifier |
| **TRUST SIGNAL** | Pre-fill from assessment · success confirmation · executive review timeline |
| **CTA** | **Request Pilot Evaluation** → `/request-pilot/` · submit on destination page: **Request Pilot Review** |
| **EXISTING COMPONENTS REUSED** | `#homeRequestPilotBtn` (consolidated single homepage CTA) · header/footer Request Pilot nav · `/request-pilot/` form · session/query payload from engine |
| **NEW COMPONENTS REQUIRED** | `#exHomeRequestPilot` closing CTA band on homepage · pre-fill contract documented in IA |
| **EXPECTED USER ACTION** | Click CTA · complete `/request-pilot/` form · receive success state |

| Requirement | Value |
|-------------|-------|
| Must stay above fold? | **NO** |
| Must contain CTA? | **YES** |
| Must contain proof? | **NO** |
| Must contain numbers? | **NO** |

**Wireframe block:**
```
[ LABEL: Request Pilot ]

[ H2: Request institutional execution pilot ]

[ Lead: Define the governance problem and operational environment.
        Assessment context carried forward when available. ]

[ Request Pilot Evaluation → /request-pilot/ ]

── On /request-pilot/ (existing surface) ──
Organization · Execution Domain · Risk · System · Governance Problem ·
Contact · Email

[ Request Pilot Review ]

── Success ──
EXECUTIA Pilot Review Created
Governance onboarding request received.
```

---

## Above-Fold Summary (Desktop 1440px Reference)

| Section | Above fold? |
|---------|-------------|
| Global Header | YES |
| 01 Hero | YES (headline + primary CTA) |
| 02 Cost of Execution Failure | YES (partial — label + outcomes) |
| 03–11 | NO |

**Mobile (375px):** Hero headline + one CTA above fold only; Cost section begins below fold.

---

## CTA Map (Full Page)

| Section | CTA | Target |
|---------|-----|--------|
| Header | Request Pilot · Demonstration | `/request-pilot/` · `/demonstration/` |
| 01 Hero | Assess Your Process · View Live Proof | `#exHomeExecutionEngine` · `#exHomeLiveProof` |
| 02 Cost | Why this keeps happening (optional) | `#exHomeWhySystemsFail` |
| 04 What EXECUTIA Does | Run Assessment on Your Process | `#exHomeExecutionEngine` |
| 05 Live Proof | View Evidence Annex · Export Executive Report | `/demonstration/` · print/PDF |
| 06 Government | Assess Public Process (× rows) | `#exHomeExecutionEngine` + sector |
| 07 Enterprise | Assess Enterprise Process (× rows) | `#exHomeExecutionEngine` + sector |
| 08 Engine | Generate Assessment | in-page → reveals Live Proof |
| 09 Proof Explorer | Open Proof Explorer · View Public Proof | `/proof-explorer/` · `/public-proof/` |
| 10 Pilot Program | Request Pilot Evaluation | `#exHomeRequestPilot` |
| 11 Request Pilot | Request Pilot Evaluation | `/request-pilot/` |
| Footer | Home · Demonstration · Request Pilot | nav repeat |

---

## Component Reuse Summary

| New section ID | Primary reused audit IDs |
|----------------|-------------------------|
| `#exHomeHero` | New (header shell reused) |
| `#exHomeCostOfFailure` | `#exHomeProblem` |
| `#exHomeWhySystemsFail` | `#exHomeDifference` (Before) |
| `#exHomeWhatExecutiaDoes` | `#exHomeDifference` (With) + partial `#exHomeWhatYouReceive` |
| `#exHomeLiveProof` | `#exHomeExampleResult` + `#exHomeResultSection` |
| `#exHomeGovernmentCases` | Sector taxonomy from `#exHomeAuditEntry` |
| `#exHomeEnterpriseCases` | Sector taxonomy + execution-test scenarios |
| `#exHomeExecutionEngine` | `#exHomeAuditEntry` |
| `#exHomeProofExplorer` | Link-only to `/proof-explorer/` |
| `#exHomePilotProgram` | `#exHomeWhatYouReceive` + `#homePilotRecommendationBlock` |
| `#exHomeRequestPilot` | `#homeRequestPilotBtn*` + `/request-pilot/` |

---

## Implementation Readiness Checklist

- [ ] All 11 sections specified with messages, CTAs, and reuse map  
- [ ] Above-fold rules defined for Hero and Cost sections  
- [ ] Proof concentrated in Sections 05 and 09  
- [ ] Numbers only in Sections 05 (metrics) and 10 (2–4 weeks)  
- [ ] No duplicate assessment forms  
- [ ] No publication annex on conversion homepage  
- [ ] Terminal conversion = Section 11 → `/request-pilot/` submit success  

---

**End of wireframe. No code modified.**
