# EXECUTIA Endpoint Taxonomy (Phase 4B)

**Document class:** Governance / architecture intelligence  
**Scope:** Local classification of `api/v1` routes for graph and intelligence scoring  
**Status:** Additive — no runtime, SQL, or database changes  

---

## 1. Why endpoint classification matters

EXECUTIA has many API routes accumulated across phases. Without taxonomy, the architecture graph treats most routes as **orphans** disconnected from canonical anchors — inflating noise and lowering stability scores.

Phase 4B assigns each route a **governed layer** so that:

- Institutional review focuses on true unknowns
- Canonical ownership stays visible
- Projection endpoints are not mistaken for verification authority

---

## 2. Orphan reduction

**Before 4B:** Orphans included any endpoint not edge-connected to audit verify / governance seeds (~54 routes).

**After 4B:** Orphans are **only** endpoints with classification `unknown`. All known taxonomy classes are excluded from orphan candidates.

This is classification only — **no endpoints are removed**.

---

## 3. Canonical ownership

| Layer | Ownership |
|-------|-----------|
| `canonical_authority` | Phase 3B2/3B3 audit verify + ledger/audit materialization |
| `replay_layer` | Deterministic replay (defers to canonical verify) |
| `public_verification` | Public verify (reuses replay loader) |

These three anchors remain the **verification chain** in the architecture graph.

---

## 4. Governed routing

Routes are grouped by institutional role:

- **Execution** — `governance_execution` (submit, execute)
- **Operator** — `operator_control` (review, decisions, auth)
- **Projections** — proof, ledger, audit, history (read/present, not redefine truth)
- **Intelligence** — `engineering_intelligence` (local artifact aggregate)
- **Legacy** — compat verify wrappers (`legacy_projection`)

---

## 5. Canonical authority vs projection

| Type | Example | Rule |
|------|---------|------|
| Canonical authority | `GET /api/v1/audit/verify` | Defines verification truth |
| Projection | `GET /api/v1/proof/export` | Presents or derives from truth; legacy-aware |
| Legacy projection | `GET /api/v1/ledger-verify` | Compat wrapper → defers to audit verify |
| Unknown | Unlisted new route | Requires explicit taxonomy before refactor |

---

## 6. Generator

Taxonomy is applied when running:

```bash
node scripts/phase-3b8-architecture-graph.js
```

Outputs in `architecture-graph/latest.json`:

- `findings.endpoint_taxonomy` — counts by class, classified vs unknown
- `findings.orphan_candidates` — unknown endpoints only

---

## 7. Non-goals

- Not a runtime router change
- Not an authorization matrix
- Not a deprecation list

---

*Phase 4B — endpoint taxonomy for governed architecture intelligence.*
