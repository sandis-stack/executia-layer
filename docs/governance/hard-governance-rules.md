# EXECUTIA Hard Governance Rules

**Document class:** Governance — binding constraints for all contributors and AI operators  
**Status:** Active — supersedes ad-hoc UI and flow experimentation  
**Scope:** Presentation, architecture, navigation, semantics, and change process  

---

## 1. Purpose

EXECUTIA must never again experience:

- Fragmented UI
- Hierarchy collapse
- Inconsistent buttons, spacing, or radius
- Navigation drift
- Duplicated surfaces
- Random redesign
- Flow corruption
- Authority degradation

This document defines **hard rules**. Violations require explicit user approval to proceed.

---

## 2. Governed infrastructure principle

EXECUTIA is **governed execution infrastructure**, not:

- A single app vanity landing
- A startup SaaS marketing site
- A documentation portal
- An iterative AI design experiment

One infrastructure, multiple **institutional operational surfaces**, one canonical design governance system.

---

## 3. Prohibited actions

| Prohibition | Rationale |
|-------------|-----------|
| Random UI improvisation | Prevents fragmented page-by-page styling |
| Page-by-page styling outside design system | Prevents multiple visual languages |
| Multiple button systems | One CTA pattern via design tokens |
| Multiple radius systems | Institutional surfaces use flat geometry (`0`) |
| Multiple spacing systems | Rhythm: 8 · 16 · 24 · 40 · 64 px only |
| Duplicate execution surfaces | Eight surfaces registry is canonical |
| Changing flow hierarchy without approval | REQUEST→…→CONTINUITY is fixed |
| Changing navigation structure without approval | Header/footer from institutional environment |
| Changing execution semantics without approval | `shared/canonical-execution-semantics.js` |
| Redesigning pages without explicit approval | No “refresh” or “modernize” drive-by |
| Broad multi-page rewrites | Split work; preserve institutional continuity |

---

## 4. Single canonical systems

### 4.1 Design governance

- **Module:** `public/components/executia-design-system.css`
- **Rule:** All UI changes inherit `--ex-ds-*` tokens only.

### 4.2 Institutional shell

- **Modules:** `executia-institutional-surfaces.js`, `executia-institutional-environment.js`, `.css`
- **Rule:** Public pages use `ex-institutional-env`, `data-ex-env-header`, `data-ex-env-footer`.

### 4.3 Console shell

- **Modules:** `engine-shell.js`, `executia-governance-core.js`, `executia-governed-presentation.css`
- **Rule:** Console nav built from surface registry — no parallel nav definitions.

### 4.4 Header and footer

- **One header system** — institutional environment render or governance shell (not both on same page).
- **One footer system** — institutional environment footer with eight-surface links.

### 4.5 Institutional language

- Vocabulary: Execution Governance Infrastructure, Deterministic Execution, Execution Integrity, Replay-Safe Verification, Execution-Time Truth, Canonical Governance.
- Do not substitute marketing slang or alternate product names.

---

## 5. Canonical execution flow

Fixed institutional chain (presentation and semantics alignment):

```
REQUEST
↓
VALIDATION
↓
GOVERNANCE
↓
COMMIT
↓
PROOF
↓
REPLAY
↓
CONTINUITY
```

**Do not:**

- Insert unmapped stages
- Rename approved statuses (`PENDING_REVIEW`, `COMMITTED`, `APPROVED`, etc. remain governed)
- Introduce `CONFIRMED`, `UNDER_REVIEW`, `REQUIRES_REVIEW`, or unmapped `SUCCESS`

**Reference:** `docs/governance/execution-semantics.md`, `shared/canonical-execution-semantics.js`

---

## 6. Multi-surface architecture

Eight coordinated surfaces (never collapsed):

| Surface | Role |
|---------|------|
| Execution | Engine home — central identity, not only page |
| Governance | Governance / Proof Engine demo |
| Proof | Public proof receipt |
| Replay | Replay-safe verification |
| Health | Operational health |
| Operations | Operations control |
| Engineering | Engineering authority |
| Request | Pilot intake |

**Reference:** `docs/governance/institutional-multi-surface.md`

---

## 7. Large change protocol

Before any architecture or multi-file UI work, document:

1. **Scope** — boundaries of the change
2. **Affected files** — complete list
3. **Expected result** — institutional outcome
4. **Verification** — commands and checks
5. **Screenshot review** — for visible UI
6. **Must not change** — explicit list (runtime, API, SQL, flow, nav, semantics)

### Must not change (default template)

```
Must not change:
- Runtime execution logic (api/, services/ commit paths)
- SQL schema and RLS unless explicitly approved
- Canonical execution flow order and status vocabulary
- Header/footer/navigation structure
- Eight-surface registry and routes
- Design token system (no new spacing/radius/button families)
- Endpoint taxonomy (unknown_endpoints = 0)
```

---

## 8. Presentation vs runtime separation

| Layer | Paths | Change policy |
|-------|-------|---------------|
| Presentation | `public/`, `public/components/`, CSS, institutional docs | Token-bound; no runtime side effects |
| Runtime | `api/`, `services/`, `sql/`, `engine/` | Explicit approval; `npm test` + governance checks |
| Governance storage | `architecture-graph/`, phase scripts | Significant-change writes only; archival retention |

Never ship presentation “fixes” that alter RPC behavior, operator decisions, or verify authority.

---

## 9. Institutional consistency over feature expansion

When trade-offs arise:

1. Preserve institutional continuity
2. Preserve canonical systems
3. Minimize diff scope
4. Defer feature expansion unless explicitly requested

Stop feature expansion phases when user declares stabilization.

---

## 10. Verification (minimum)

```bash
node --check <changed-js-files>
npm test
.cursor/hooks/pre-deploy-check.sh
```

Additional when relevant:

- `node scripts/phase-3b8-architecture-graph.js`
- `node scripts/phase-3b9-execution-intelligence.js`
- `node scripts/phase-ai-operator-check.js`

---

## 11. Cursor enforcement

- **Rule:** `.cursor/rules/executia-hard-governance.mdc` (`alwaysApply: true`)
- **Context:** `.cursor/context/hard-governance-rules.md`

---

## 12. Related governance

- `docs/governance/artifact-retention.md`
- `docs/governance/endpoint-taxonomy.md`
- `docs/governance/ai-operator-governance.md`
- `.cursor/rules/change-governance.mdc`

---

*EXECUTIA Hard Governance — governed infrastructure, not experimentation.*
