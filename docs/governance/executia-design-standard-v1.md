# EXECUTIA Design Standard v1

Status: Canonical governance policy for public surface alignment.

## Part 1 — Core Definition

Canonical definition (must be used exactly):

"EXECUTIA is an execution governance standard that validates readiness before commitment and creates verifiable proof."

This definition is canonical. All public pages must align to this definition in purpose, terminology, navigation, and calls to action.

## Part 2 — Terminology

Allowed primary terms (canonical):

- Execution
- Governance
- Validation
- Proof
- Commitment
- Evidence
- Decision Record
- Pilot

Conflicting or competing terms currently present on audited pages:

- Assessment / Analysis / Audit (used as primary identity terms on homepage and execution test)
- Control Map / Evidence Annex / Administrative Annex (document classification terms used as page-level identity)
- Engine / Execution Engine / Live Governance Shell (parallel product identity terms)
- Materialize / Immutable proof materialization (action language not mapped to canonical CTA model)
- Request / Request Pilot Evaluation / Request institutional review (inconsistent CTA naming)
- Entry (navigation label that conflicts with canonical HOME label)

## Part 3 — Navigation Standard

Canonical public navigation model:

- HOME
- EXECUTION
- PROOF
- REQUEST PILOT
- Optional: REGULATOR (only where explicitly required)

Pages currently using different navigation:

- `/` (homepage): Uses publication shell navigation (`Home`, `Proof`, `Request Pilot`) and omits `Execution`.
- `/execution-test/`: Uses flow navigation (`Execution`, `Governance`, `Proof`, `Request`) and omits `Home`; `Governance` is a non-canonical top-level nav item for public standard model.
- `/public-proof/`: Uses split navigation (`Entry`, `Execution Test`, `Engine`) plus action nav (`Proof`, `Regulator`, `Request Pilot`), creating parallel nav systems.
- `/demonstration/`: No primary public header navigation rendered (publication annex mode).
- `/request-pilot/`: No primary public header navigation rendered (publication annex mode).

## Part 4 — Page Purposes

### HOME

- Required purpose: 30-second understanding of what EXECUTIA is and why it exists.
- Core question: What is EXECUTIA and why does it matter before commitment?
- CTA model:
  - Primary CTA: View Proof
  - Secondary CTA: Request Pilot

### EXECUTION

- Required purpose: Show how readiness is validated before commitment.
- Core question: Is this execution path governance-ready before commitment?
- CTA model:
  - Primary CTA: View Proof
  - Secondary CTA: Request Pilot

### PROOF

- Required purpose: Show verifiable evidence and decision record continuity.
- Core question: What proof confirms the governance decision before/at commitment?
- CTA model:
  - Primary CTA: View Proof (current proof object/record)
  - Secondary CTA: Request Pilot

### REQUEST PILOT

- Required purpose: Formalize pilot intake using canonical terms and fields.
- Core question: What is needed to initiate a governance pilot under the standard?
- CTA model:
  - Primary CTA: Request Pilot (submission/intake continuation)
  - Secondary CTA: View Proof

## Part 5 — Visual Identity

Design standard requires one system for all public pages:

- Single typography hierarchy
- Single card system
- Single spacing system
- Single CTA system
- Single header system

Current inconsistencies across public pages:

- Typography: Publication pages use design-system/institutional typography, while `/execution-test/` and `/public-proof/` define separate inline typographic scales.
- Card system: Publication registry blocks and ad-hoc rounded panel cards coexist as parallel systems.
- Spacing: Tokenized spacing on publication pages conflicts with custom pixel spacing in inline-styled pages.
- CTA system: Multiple CTA variants are active (`View Proof`, `Verify Proof`, `Request`, `Request Pilot`, `Materialize Immutable Proof`).
- Header system: Institutional mounted header on some pages, custom manual headers on others, and no header on publication annex pages.

## Part 6 — Audit

Audit scope:

- Homepage (`/`)
- Execution Test (`/execution-test/`)
- Execution Demo (`/demonstration/`)
- Proof (`/public-proof/`)
- Request Pilot (`/request-pilot/`)

| Page | Identity | Terminology | Navigation | Purpose | CTA | Consistency |
| --- | --- | --- | --- | --- | --- | --- |
| Homepage | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS | PARTIAL |
| Execution Test | FAIL | PARTIAL | FAIL | PASS | PARTIAL | FAIL |
| Execution Demo | PARTIAL | PARTIAL | FAIL | PARTIAL | FAIL | PARTIAL |
| Proof | FAIL | PARTIAL | FAIL | PARTIAL | PARTIAL | FAIL |
| Request Pilot | PARTIAL | PARTIAL | FAIL | PARTIAL | FAIL | PARTIAL |

Audit rationale summary:

- Identity drift exists between publication identity, execution-test product language, and proof-page manual shell language.
- Terminology drift exists through parallel vocabulary not in allowed canonical terms.
- Navigation is the largest structural inconsistency across audited pages.
- CTA behavior and labels are not standardized to one model across pages.

## Part 7 — Roadmap

### Phase A: Identity alignment

- Apply the canonical definition and identity statement to all five audited pages.
- Remove parallel identity labels that imply separate products/systems.
- Ensure each page title/subtitle maps to standard purpose (HOME, EXECUTION, PROOF, REQUEST PILOT).

### Phase B: Navigation alignment

- Implement canonical navigation model on all audited pages: HOME, EXECUTION, PROOF, REQUEST PILOT (REGULATOR optional only where required).
- Remove split/parallel navigation systems and route-specific nav vocabularies.
- Standardize header rendering behavior so no audited page is nav-less.

### Phase C: Terminology alignment

- Replace non-canonical primary terms with allowed term set.
- Keep Annex/Document classification terms as metadata only, not as dominant page identity language.
- Standardize CTA text and governance action labels to canonical terminology.

### Phase D: Visual consistency

- Migrate all audited pages to one typography hierarchy, one card system, one spacing system, one CTA system, and one header system.
- Remove inline style systems on public proof and execution test pages where they diverge from design standard.
- Validate visual parity across desktop and mobile under one tokenized design baseline.

## Final Required Deliverables

1) Design Standard v1 (policy): This document defines canonical definition, terms, navigation, purpose, CTA, and visual identity requirements.

2) Audit table: Included in Part 6 with PASS/PARTIAL/FAIL status per page and criterion.

3) Alignment roadmap: Included in Part 7 with Phase A-D migration sequence.

4) Highest-priority inconsistencies:

- Navigation fragmentation across all audited pages (highest priority).
- Parallel identity systems (publication/document identity vs execution-test/proof product identity).
- Non-canonical terminology used as primary page language.
- Multiple CTA models and labels causing governance-language drift.
- Dual visual systems (institutional publication vs inline custom UI patterns).
