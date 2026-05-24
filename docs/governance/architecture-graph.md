# EXECUTIA Architecture Graph (Phase 3B8)

**Document class:** Governance / architecture intelligence  
**Scope:** Local JSON graph of endpoints, authority, replay, and governance paths  
**Status:** Additive — no runtime, SQL, or database changes  

---

## 1. Purpose

Phase 3B8 produces a **canonical architecture graph**: a machine-readable map of how EXECUTIA routes, services, SQL authority artifacts, and governance scripts relate. It supports:

- Shadow logic detection (legacy verify URLs, legacy event names)
- Orphan endpoint identification (routes not tied to canonical/governance anchors)
- Deploy-time architecture review
- Deterministic institutional memory alongside the engineering ledger (3B6)

---

## 2. Generator

```bash
node scripts/phase-3b8-architecture-graph.js
```

**Outputs:**

| File | Role |
|------|------|
| `architecture-graph/latest.json` | Current graph |
| `architecture-graph/<timestamp>.json` | Historical snapshot |

**Console:**

```text
ARCHITECTURE_GRAPH_RECORDED
architecture-graph/<timestamp>.json
architecture-graph/latest.json
```

---

## 3. Graph schema

```json
{
  "generated_at": "ISO-8601",
  "branch": "git branch",
  "commit": "git SHA",
  "nodes": [
    { "id": "endpoint:audit/verify", "type": "endpoint", "file": "...", "label": "...", "canonical": true }
  ],
  "edges": [
    { "from": "endpoint:audit/verify", "to": "service:audit", "relation": "uses" }
  ],
  "findings": {
    "canonical_authority": ["endpoint:audit/verify"],
    "replay_layer": ["endpoint:execution/replay"],
    "public_verification": ["endpoint:verify/execution_id"],
    "governance_layer": ["governance:phase-3b5", "..."],
    "legacy_projection": ["endpoint:ledger-verify", "..."],
    "orphan_candidates": [],
    "shadow_flow_candidates": []
  }
}
```

---

## 4. Mapped anchors

| Institutional surface | Detection |
|----------------------|-----------|
| Canonical verification | `api/v1/audit/verify.js` |
| Replay layer | `api/v1/execution/replay.js` |
| Public verification | `api/v1/verify/[execution_id].js` |
| Audit service | `services/audit.js` |
| Ledger service | `services/ledger.js` |
| Supplemental audit SQL | `sql/012_supplemental_audit_chain.sql` |
| Ledger authority SQL | `sql/011_ledger_hash_authority.sql` |
| Governance | Phase 3B5 / 3B6 / 3B7 / 3B8 scripts |
| AI governance memory | `.cursor/rules/*`, `.cursor/context/*` |

---

## 5. Declared edges (institutional)

| From | To | Relation |
|------|-----|----------|
| audit verify | audit.js, ledger.js | uses |
| audit verify | 011 / 012 SQL | verifies |
| execution replay | audit_events, ledger_entries | reads |
| execution replay | audit verify | defers_to |
| public verify | execution replay loader | reuses_loader |
| governance 3B5 | protected services / audit verify | protects |
| drift 3B7 | architecture graph 3B8 | feeds |
| engineering ledger 3B6 | git state | records |
| ledger-verify / core-ledger-verify | audit verify | compat_wraps |

---

## 6. Findings semantics

### canonical_authority

Must include `endpoint:audit/verify`. Confirms Phase 3B2/3B3 verification authority is present in the graph.

### replay_layer / public_verification

Must include replay and public verify endpoint nodes.

### governance_layer

Must include 3B5, 3B6, 3B7, 3B8 script nodes.

### legacy_projection

Lists `ledger-verify` and `core-ledger-verify` compatibility endpoints when present.

### orphan_candidates

API routes not reachable from canonical/governance seeds via declared edges. Review for shadow or entry-only flows.

### shadow_flow_candidates

Project files (excluding rollback/docs/governance exemptions) referencing legacy verify URLs or legacy RPC event names.

---

## 7. Pre-deploy integration

After Phase 3B7 drift check, before Phase 3B6 engineering ledger:

```bash
node scripts/phase-3b8-architecture-graph.js
```

---

## 8. Non-goals

- Not a live dependency tracer (static map only)
- Not a replacement for `audit/verify` or execution replay APIs
- No GraphQL/Neo4j export in 3B8
- No secret or env capture

---

*Phase 3B8 — canonical architecture graph for governed, replayable software evolution.*
