# EXECUTIA Execution Intelligence (Phase 3B9)

**Document class:** Governance / deploy intelligence  
**Scope:** Local risk prediction, stability metrics, architecture delta, deploy readiness  
**Status:** Additive — no runtime, SQL, or database changes  

---

## 1. Purpose

Phase 3B9 synthesizes institutional signals into **execution intelligence**:

- **Predictive governance** — risk before deploy from git + graph + ledger
- **Stability metrics** — deterministic scores from measurable deductions
- **Architecture evolution** — delta vs previous `architecture-graph` snapshot
- **Deploy intelligence** — which canonical, replay, verify, and governance surfaces are touched
- **Replayable engineering state** — JSON snapshots for audit of pre-deploy decisions

---

## 2. Generator

```bash
node scripts/phase-3b9-execution-intelligence.js
```

**Inputs (read-only):**

| Source | Path |
|--------|------|
| Architecture graph | `architecture-graph/latest.json` |
| Graph report | `architecture-graph/report.md` |
| Engineering ledger | Latest `engineering-ledger/*.json` |
| Git state | Working tree diff |
| Protected config | `.cursor/context/protected-files.md` (patterns mirrored in script) |

**Outputs:**

| File | Role |
|------|------|
| `execution-intelligence/latest.json` | Current intelligence |
| `execution-intelligence/report.md` | Human deploy brief |
| `execution-intelligence/<timestamp>.json` | Historical snapshot |

**Console:**

```text
EXECUTION_INTELLIGENCE_RECORDED
execution-intelligence/<timestamp>.json
execution-intelligence/latest.json
execution-intelligence/report.md
```

---

## 3. JSON schema

```json
{
  "generated_at": "ISO-8601",
  "branch": "git branch",
  "commit": "git SHA",
  "stability": {
    "overall_score": 0,
    "architecture_score": 0,
    "governance_score": 0,
    "replay_score": 0,
    "verification_score": 0,
    "endpoint_consistency_score": 0,
    "deductions": {}
  },
  "risk": {
    "overall": "LOW",
    "canonical_risk": "LOW",
    "replay_risk": "LOW",
    "governance_risk": "LOW",
    "architecture_risk": "LOW",
    "orphan_risk": "LOW",
    "mutation_risk": "LOW"
  },
  "architecture_delta": {
    "new_nodes": [],
    "removed_nodes": [],
    "new_edges": [],
    "removed_edges": [],
    "new_orphans": [],
    "removed_orphans": [],
    "new_shadow_flows": [],
    "removed_shadow_flows": []
  },
  "deploy_intelligence": {
    "protected_files_touched": [],
    "canonical_authority_affected": [],
    "replay_layer_affected": [],
    "public_verify_affected": [],
    "governance_layer_affected": []
  },
  "findings": [],
  "recommendations": [],
  "deploy_readiness": "READY"
}
```

---

## 4. Stability scoring

Deterministic formula — starts at **100**, subtracts:

| Deduction | Source |
|-----------|--------|
| Orphan count | `findings.orphan_candidates` / graph summary |
| Shadow flow count | `findings.shadow_flow_candidates` |
| Protected modifications | Git diff vs protected patterns |
| Governance warnings | Engineering ledger + protected touches + graph report signals |
| Missing canonical edges | Required audit/replay/verify edges absent from graph |

Overall and sub-scores clamped to **0–100**. No random or heuristic “fake” scores.

---

## 5. Risk rules

| Condition | Risk |
|-----------|------|
| Canonical SQL / audit / ledger touched | `CANONICAL` / `HIGH` |
| Replay layer file in diff | `HIGH` |
| Public verify in diff | `HIGH` |
| Protected files touched | `HIGH` (governance) |
| Docs-only diff | `LOW` (overall capped) |
| High orphan / shadow counts | `MEDIUM` / `HIGH` (architecture) |

`overall` = maximum dimension risk unless docs-only override applies.

---

## 6. Architecture delta

Compares `architecture-graph/latest.json` to the **previous timestamped** graph snapshot:

- New / removed nodes and edges
- New / removed orphan candidates
- New / removed shadow flow references

First run without prior snapshot treats current graph as baseline (`baseline: "none"`).

---

## 7. Deploy readiness

| Status | Meaning |
|--------|---------|
| `READY` | LOW risk, stability acceptable |
| `CAUTION` | MEDIUM risk or moderate stability |
| `REVIEW_REQUIRED` | HIGH / CANONICAL risk or low stability |
| `BLOCKED` | Missing architecture graph input |

---

## 8. Pre-deploy integration

After Phase 3B8 architecture graph, **before** Phase 3B6 engineering ledger:

```bash
node scripts/phase-3b9-execution-intelligence.js
```

Full chain:

```text
npm test → 3B5 → 3B7 → 3B8 → 3B9 → 3B6
```

---

## 9. Non-goals

- Not a production API or monitoring service
- No ML / external risk APIs
- No database writes
- Does not replace `audit/verify` or manual canonical approval

---

*Phase 3B9 — execution intelligence for governed, replayable deploy decisions.*
