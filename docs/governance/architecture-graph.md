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
| `architecture-graph/report.md` | Human-readable reduction report (3B8-A) |
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
    {
      "id": "endpoint:audit/verify",
      "type": "endpoint",
      "file": "...",
      "label": "...",
      "canonical": true,
      "classification": "canonical_authority"
    }
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
    "shadow_flow_candidates": [],
    "summary_counts": { "total_nodes": 0, "orphan_candidates": 0, "by_layer": {} },
    "next_recommended_cleanup": []
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

### orphan_candidates (3B8-A reduced)

Only **unclassified** API routes (`classification: unknown`) not reachable from canonical/governance seeds. Excluded from orphan noise:

- `docs/**`, `.cursor/**`, `engineering-ledger/**`, `architecture-graph/**`
- `scripts/phase-3b*`, `sql/rollback/**`, legacy-documented `sql/009_atomic_execution_rpc.sql`
- Proof projection routes (`api/v1/proof/*`) and static UI (`console/**`, `public/**`, `dashboard/**`)

Orphans require **classification before deletion** — they are not automatically wrong.

### shadow_flow_candidates (3B8-A suppressed)

Line-level scan with false-positive suppression:

- Entire scanner files (`phase-3b8-architecture-graph.js`, `phase-3b7-architecture-drift.js`)
- `docs/governance/**`, `.cursor/context/**`, `sql/rollback/**`
- Comment lines containing `LEGACY` / `legacy`
- Proof files marked `Legacy projection check only`

### Node classification (3B8-A)

Each node carries `classification`:

| Label | Meaning |
|-------|---------|
| `canonical_authority` | Audit verify, ledger/audit services, authority SQL |
| `replay_layer` | Execution replay |
| `public_verification` | Public verify route |
| `governance_layer` | 3B5–3B7 scripts, Cursor rules |
| `architecture_memory` | Docs, `.cursor/context` |
| `proof_projection` | Proof API (legacy-aware projection) |
| `legacy_projection` | Compat verify wrappers, rollback SQL |
| `ui_console` | Console / dashboard HTML |
| `local_tooling` | Graph generator itself |
| `unknown` | Unclassified API — review before refactor |

---

## 7. Phase 3B8-A — Graph reduction

**Additive only** — no runtime API, SQL, or DB changes.

| Capability | Description |
|------------|-------------|
| **Graph reduction** | Fewer orphan/shadow false positives via path and layer filters |
| **Human report** | `architecture-graph/report.md` with layers, counts, next cleanup |
| **False positive suppression** | Scanner self-reference, governance docs, LEGACY comments |
| **Endpoint classification** | Every node labeled for institutional review |

Use `report.md` before large refactors; do not treat `unknown` endpoints as canonical authority.

---

## 8. Pre-deploy integration

After Phase 3B7 drift check, before Phase 3B6 engineering ledger:

```bash
node scripts/phase-3b8-architecture-graph.js
```

---

## 9. Non-goals

- Not a live dependency tracer (static map only)
- Not a replacement for `audit/verify` or execution replay APIs
- No GraphQL/Neo4j export in 3B8
- No secret or env capture

---

*Phase 3B8 / 3B8-A — canonical architecture graph and human report for governed, replayable software evolution.*
