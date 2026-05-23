# EXECUTIA Phase 3B.1 — Supplemental Audit Layer Boundary

**Document class:** Enterprise architecture / audit-grade planning report  
**Phase:** 3B.1 (supplemental audit boundary only)  
**Approval status:** Planning approved — implementation not authorized  
**Artifacts:** Report only — no code, no SQL, no runtime changes, no commits required by this document  

**Related records:** `docs/PHASE_3A_STABILIZATION_REPORT.md`, `docs/PHASE_3B_INSTITUTIONAL_SEMANTICS_PLAN.md`

---

## Document control

| Field | Value |
|-------|-------|
| Title | Phase 3B.1 Supplemental Audit Layer Boundary |
| Version | 1.0 |
| Audience | Architecture, audit, operations, institutional stakeholders |
| Authority of this document | Defines boundaries and acceptance criteria only |

---

## 1. Purpose of Phase 3B.1

Phase 3B.1 establishes the **institutional supplemental audit layer**: a single **global, append-only, hashed** record of narrative, observation, and external attachment that supplements — but does not supersede — material execution truth established in Phase 3A.

The phase answers one architectural question with precision:

> *What may the supplemental audit plane record, and what must it never be allowed to become?*

Phase 3B.1 does **not** implement convergence. It defines:

- The boundary between **material truth** (`ledger_entries`) and **supplemental truth** (`audit_events`)
- Caller topology and write discipline (planning direction)
- Reconciliation and external proof as **observation**, not authority
- Visibility, retention, and replay constraints suitable for regulator-grade review
- Acceptance criteria and migration sequencing for a future implementation gate

Institutional outcomes targeted after implementation (out of scope for this report’s execution):

- One global supplemental hash chain (not per-execution heads)
- No shadow writers to `audit_events` outside governed service paths
- Auditors can verify supplemental integrity without conflating it with ledger authority

---

## 2. Relationship to Phase 3A

Phase 3A stabilized **materialized execution truth** on the global `ledger_entries` chain with formula identity `executia/ledger/v1`, and aligned public verification under `LEDGER_ENTRIES_PRIMARY`. Phase 3A.1 preserved legacy projection and settlement chain reporting as **warnings**, not as primary `verified` outcome.

| Phase 3A outcome | Phase 3B.1 posture |
|------------------|-------------------|
| `ledger_entries` is material authority | **Frozen** — no ledger writer or formula changes |
| `execution_results` is projection | **Frozen** for status authority in 3B.1 |
| `ledger-verify` top-level `verified` = ledger chain only | **Preserved** |
| Legacy audit rows (minimal RPC inserts, optional null hashes) | **Classified** as LEGACY era; converged under supplemental rules post-cutover |
| Audit hash not yet global / not yet RPC-unified | **3B.1 scope** — definition and gate only |

Dependency chain:

```text
Phase 1 (canonical evaluation bridge)
  → Phase 2 (operator RPC terminal decisions)
    → Phase 3A (ledger hash authority)
      → Phase 3A.1 (verify alignment)
        → Phase 3B.1 (supplemental audit boundary)  ← this document
          → [separate approval] implementation
            → Phase 3B.x+ (semantics, COMMITTED, projection rebuild, etc.)
```

Phase 3B.1 is the **narrowest** slice of the broader Phase 3B institutional semantics program. It must not absorb COMMITTED semantics, projection rebuild, or operator RPC changes.

---

## 3. Preserved frozen authority

The following authorities are **non-negotiable** for Phase 3B.1 planning and any subsequent implementation approved under a separate gate.

### 3.1 `LEDGER_ENTRIES_PRIMARY`

| Rule | Requirement |
|------|-------------|
| Material store | `ledger_entries` global chain |
| Verify API | `GET /api/v1/ledger-verify` — `authority_mode: LEDGER_ENTRIES_PRIMARY` |
| Top-level `verified` | Derived **only** from `ledger_chain.verified` |
| Legacy components | `execution_chain`, `core_ledger_chain` remain exposed as `legacy_verified` / warnings — not primary |
| Supplemental audit | Must not alter this contract |

### 3.2 `executia/ledger/v1`

| Rule | Requirement |
|------|-------------|
| Formula ID | `executia/ledger/v1` (canonical in `services/ledger.js` and SQL `executia_ledger_*`) |
| Writers | `commit_execution`, `commit_operator_decision` via `executia_ledger_append` only (material path) |
| Parity | JS/SQL deterministic vectors remain the compliance baseline |
| Supplemental audit | Uses a **separate** audit hash formula; must never replace or shadow ledger `entry_hash` |

### 3.3 Additional frozen surfaces (3B.1)

| Surface | Freeze |
|---------|--------|
| Approved execution statuses | `COMMITTED`, `BLOCKED`, `PENDING_REVIEW`, `FAILED`, `APPROVED` only — no new enums in 3B.1 |
| Operator RPC | `commit_operator_decision` transition rules and terminal semantics unchanged |
| Public proof schema | Registry and receipt JSON contract unchanged; supplemental events may **populate** existing types, not redefine exports |

---

## 4. Supplemental audit layer definition

### 4.1 Architectural definition

The **supplemental audit layer** is an institutional, append-only event log (`audit_events`) maintaining a **global** hash chain that:

1. **Correlates** to executions via `execution_id` (and optionally `organization_id`)
2. **Binds** to material truth at event time via `ledger_head_hash` (and related references in payload)
3. **Records** operator narrative, governance collection, reconciliation observations, and external proof attachments
4. **Verifies** independently of the ledger chain under supplemental verify rules

It is explicitly **not** a second ledger, not a status authority, and not a substitute for `ledger-verify`.

### 4.2 Two-plane model

```text
┌─────────────────────────────────────────────────────────────┐
│  MATERIAL PLANE (frozen — Phase 3A)                         │
│  ledger_entries → executia/ledger/v1 → LEDGER_ENTRIES_PRIMARY │
│  RPC: commit_execution, commit_operator_decision            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ bind (ledger_head_hash)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPPLEMENTAL PLANE (Phase 3B.1 boundary)                   │
│  audit_events → global hash chain → audit verify            │
│  Writers: RPC supplemental append + writeAuditEvent (T1)    │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Core invariants

| ID | Invariant |
|----|-----------|
| I1 | Global supplemental chain — one predecessor sequence for the table |
| I2 | Append-only — no in-place mutation of `hash` / `previous_hash` on committed rows |
| I3 | `reference_only: true` when payload echoes material status or decision |
| I4 | Material RPC steps unchanged in authority, ordering, and formula |
| I5 | Timeline filters by `execution_id` do not redefine chain head or predecessor |
| I6 | Public proof consumers continue to use existing registry rules |

### 4.4 Caller topology (planning direction)

| Tier | Writers | Role |
|------|---------|------|
| **T0** | Material RPCs via `executia_append_global_audit_event` (planned) | Exactly one supplemental event per RPC, same database transaction as ledger append |
| **T1** | `services/audit.js` → `writeAuditEvent` | Sole application-level append API for routes and jobs |
| **T2** | Direct `audit_events` inserts in API routes | **Retired** after implementation — zero production shadow writers |

### 4.5 RPC supplemental event rename (semantic, not yet implemented)

| Pre-3B.1 RPC label | Target supplemental type |
|--------------------|---------------------------|
| `EXECUTION_CREATED` | `EXECUTION_SUBMITTED` |
| `OPERATOR_DECISION_COMMITTED` | `OPERATOR_DECISION_RECORDED` |

Both require `reference_only: true` and recommended `ledger_head_hash` binding.

---

## 5. What audit may record

Supplemental audit **may** record institutional facts that explain, observe, or attach to material truth.

| Category | Permitted event families (direction) | Payload expectations |
|----------|--------------------------------------|----------------------|
| **Lifecycle observation** | `EXECUTION_SUBMITTED`, `OPERATOR_DECISION_RECORDED` | `reference_only`, `ledger_head_hash`, echoed status/decision as observation |
| **Operator narrative** | `OPERATOR_ACTION`, `OPERATOR_APPROVED`, `OPERATOR_BLOCKED` | Actor, rationale, decision context; registry-compatible types where proof requires them |
| **Governance collection** | `OPERATOR_APPROVAL_COLLECTED`, `ESCALATION_RECORDED`, `QUORUM_SATISFIED` | Non-terminal collection; does not replace RPC terminal write |
| **Policy** | `POLICY_MATERIALIZED`, `POLICY_DECISION_RECORDED` | Policy version references |
| **Reconciliation observation** | `RECONCILIATION_OBSERVED`, `RECONCILIATION_VERIFY`, `RECONCILIATION_CLEARED` | Observed alignment state, drift identifiers, auditor actor |
| **External attachment** | `EXTERNAL_PROVIDER_CONFIRMED`, `EXTERNAL_PROOF_ATTACHED`, `EXECUTION_TICKET_LINKED` | Content hash, source, bind to `ledger_head_hash` |
| **System / halt** | `SYSTEM_HALT`, `HALT_LIFTED` | Scope and actor (implementation deferred to later 3B phases) |
| **Correction** | `AUDIT_CORRECTION` | `correction_of` → prior audit row id; new row only |

**Schema direction (logical, not SQL in this report):** extend `audit_events` in place; post-cutover rows carry `payload.chain_era: 3B1`, required hash columns, optional `organization_id`; no parallel audit table in 3B.1.

---

## 6. What audit must never become

Supplemental audit **must never** assume roles reserved for the material plane or governance-amended semantics.

| Prohibition | Rationale |
|-------------|-----------|
| **Status authority** | No supplemental row alone may set or prove `execution_results.status` |
| **COMMITTED authority** | `COMMITTED` is not introduced or implied by audit in 3B.1 |
| **Ledger replacement** | No supplemental `entry_hash` overrides `ledger_entries.entry_hash` |
| **Invented ledger links** | No chain positions or hashes not grounded in `ledger_entries` |
| **Per-execution hash chains** | Rejected — breaks global institutional verify model |
| **Primary verify outcome** | `audit/verify` must not replace `ledger-verify` as execution truth gate |
| **Shadow writers** | No route-level direct insert bypassing T0/T1 after cutover |
| **History rewrite** | No UPDATE/DELETE of hashed audit rows; corrections only via append |
| **Public proof schema change** | No new mandatory export fields or renamed registry contract types |
| **Operator RPC semantics change** | Terminal transitions remain `commit_operator_decision` only |
| **Projection rebuild** | Rebuilding `execution_results` hash fields from audit is forbidden direction |

**Classification test for any proposed event type:**  
*If removing all supplemental audit rows would change material ledger content or approved status on the execution record, the event type is misclassified and must be rejected.*

---

## 7. Reconciliation observation model

Reconciliation in Phase 3B.1 is strictly an **observation layer** recorded in supplemental audit. It does not redefine material truth.

### 7.1 Separation of concerns

| Layer | Responsibility |
|-------|----------------|
| **Material** | Latest `ledger_entries` head; hash under `executia/ledger/v1` |
| **Projection field** | `execution_results.reconciliation_state` (existing service behavior) |
| **Supplemental audit** | Immutable log of what was compared, by whom, and what was observed |

### 7.2 Observation flow (planning)

```text
Compare(ledger_head, projection_snapshot, external_refs)
  → emit RECONCILIATION_OBSERVED { observed_state: ALIGNED | DRIFT | REQUIRED }
  → optional RECONCILIATION_CLEARED (auditor actor)
```

| `observed_state` | Meaning |
|------------------|---------|
| `ALIGNED` | Observation: projection and ledger head consistent at check time |
| `DRIFT` | Observation: mismatch detected; identifiers in payload |
| `REQUIRED` | Observation: reconciliation action required; no status change via audit alone |

### 7.3 Rules

- Reconciliation routes **must** migrate from raw `audit_events` insert to T1 `writeAuditEvent` (implementation phase).
- Changing **when** projection `reconciliation_state` updates remains **out of 3B.1**.
- `ledger-verify` legacy warnings for projection drift remain authoritative for **legacy chain reporting**, not superseded by audit observation.

---

## 8. External proof attachment model

External proof extends institutional record without altering public proof **schema**.

### 8.1 Roles

| Component | Role in 3B.1 |
|-----------|----------------|
| **Public proof registry** | Frozen receipt/proof chain rules and required event types |
| **Supplemental audit** | Stores attachment metadata and content binding |
| **Material ledger** | `ledger_head_hash` at attach time — binding anchor |

### 8.2 Attachment contract direction (`payload.external_proof` v1)

| Field | Purpose |
|-------|---------|
| `attachment_id` | Internal correlation uuid |
| `source` | `REGULATOR_PACKAGE`, `PROVIDER_API`, `OPERATOR_UPLOAD` |
| `content_type` | MIME classification |
| `content_hash` | SHA-256 of normalized content bytes |
| `ledger_head_hash` | Required bind to material head at attach time |
| `execution_id` | Execution correlation |
| `reference_only` | Always `true` |
| `registry_compatible` | Must pass existing registry validators |

### 8.3 Ingestion topology (planning)

```text
External content → validate → content_hash
  → writeAuditEvent(EXTERNAL_PROOF_ATTACHED)
  → public proof export paths unchanged (read existing chain + registry)
```

**Rules:**

- Attachment does not supply or override `entry_hash`.
- Existing proof chain types (`OPERATOR_APPROVED`, `OPERATOR_BLOCKED`, settlement types, truth anchors) remain valid; 3B.1 may emit them via T1 but must not rename registry contracts.
- No new public export shape in 3B.1.

---

## 9. Visibility, retention, and replay rules

### 9.1 Visibility model

| Audience | Access | Constraint |
|----------|--------|------------|
| **Operator (JWT)** | Events for scoped `organization_id` and permitted executions | Read APIs; no direct table exposure |
| **Internal service** | Global chain read and supplemental verify | Operator key / service role governance |
| **Auditor role** | Cross-org read per policy scope | JWT `audit` scope |
| **Public / regulator** | No direct `audit_events` access | Proof and export APIs only |

| API behavior | Rule |
|--------------|------|
| `audit/verify` without filter | Global supplemental chain |
| `audit/timeline?execution_id=` | Filtered view; **does not** change global predecessor |
| Response fields | Expose `hash`, `previous_hash`, `reference_only` for institutional clarity |

### 9.2 Retention rules

| Era | Classification | Retention |
|-----|----------------|-----------|
| **LEGACY** | `hash IS NULL` and/or `payload.chain_era = LEGACY` | Indefinite retain; verify may use separate `legacy_audit` mode |
| **3B1** | Post-cutover hashed rows | Indefinite retain — institutional record |
| **Archival** | Cold export permitted | No delete from primary store without legal hold process |
| **PII** | Subject to org policy | Hashing does not redact payload |

| Operation | Permitted |
|-----------|-----------|
| Regulator export | Yes |
| Truncate `audit_events` | **No** — destroys global chain |
| Partitioning for performance | Future — must preserve global verify semantics or document partition chain model |

### 9.3 Replay constraints

| Operation | Allowed | Forbidden |
|-----------|---------|-----------|
| Chronological replay read | Yes | — |
| Off-hours hash recompute / drift report | Yes | — |
| Rewrite historical rows | — | **Yes** |
| Replay RPC to regenerate audit | — | **Yes** |
| Rebuild audit chain from ledger alone | — | **Yes** |
| Backfill LEGACY → 3B1 | Optional future project | In-place UPDATE of legacy hashes |

**Cutover:** institutional timestamp `T_3B1_cutover` — rows before cutover excluded from strict global verify or verified under legacy sub-check.

**Safety:** supplemental verify replay must not mutate `ledger_entries` or material status fields.

---

## 10. Acceptance criteria

Implementation may proceed only when a **separate implementation approval** is granted and all criteria below are verifiable.

| ID | Criterion | Verification method |
|----|-----------|---------------------|
| AC1 | Single global supplemental hash chain for post-cutover rows | Global `verifyAuditChain` pass |
| AC2 | `executia/ledger/v1` unchanged; parity vectors pass | `test:ledger-vectors` + SQL parity |
| AC3 | `LEDGER_ENTRIES_PRIMARY` on `ledger-verify` unchanged | API contract / snapshot test |
| AC4 | Exactly one supplemental RPC event per `commit_execution` / `commit_operator_decision` in same transaction | Integration test |
| AC5 | Zero production route-level `audit_events` direct insert | CI grep / static rule |
| AC6 | Legacy verify components still exposed on `ledger-verify` | Response shape test |
| AC7 | Public proof export structure unchanged | Registry snapshot test |
| AC8 | Operator approve / block / action smoke unchanged | Smoke suite |
| AC9 | Material-echo payloads include `reference_only: true` | Payload lint |
| AC10 | External attachments include `ledger_head_hash` bind | Contract test |
| AC11 | `audit/timeline` filter does not alter global verify head | Behavioral test |
| AC12 | Cutover `T_3B1_cutover` documented in runbook | Ops sign-off |

### 10.1 Migration sequencing (planning)

| Step | Activity | Notes |
|------|----------|-------|
| M0 | Record `T_3B1_cutover` | Institutional runbook |
| M1 | Deploy supplemental hash functions and RPC branch | Staging first |
| M2 | Global `getLastAuditHash` in application layer | Staging |
| M3 | Migrate T2 callers to T1 | Staging |
| M4 | Enable strict global supplemental verify post-cutover | Feature flag fallback documented |
| M5 | Production promotion | Rollback = revert RPC/app, not ledger |
| M6 | LEGACY row count assessment | Read-only; no hash mutation in 3B.1 |

---

## 11. Explicit out-of-scope list

The following are **forbidden** in Phase 3B.1 planning scope, implementation authorized under this report, and operational cutover labeled 3B.1.

| # | Out of scope | Deferred to |
|---|--------------|-------------|
| O1 | `executia/ledger/v1` formula or input changes | — (frozen) |
| O2 | `ledger_entries` writer or RPC material step changes | — (frozen) |
| O3 | New execution status values or `COMMITTED` RPC | Phase 3B.6 / 3C |
| O4 | `execution_results` projection hash rebuild | Phase 3B.5 / 3A.2 ops |
| O5 | `core_ledger` chain repair | Phase 3C |
| O6 | Per-execution audit hash chains | — (rejected) |
| O7 | Public proof registry / receipt schema change | — (frozen) |
| O8 | Operator RPC transition rules or terminal semantics | Phase 2 lock |
| O9 | UI, console, homepage changes | — |
| O10 | `commit-execution` route retirement | Phase 3C |
| O11 | AI agent permissions expansion | Phase 3B.4+ |
| O12 | Quorum materialization RPC | Phase 3B.7 |
| O13 | Emergency halt implementation | Phase 3B.7 |
| O14 | Audit table partitioning implementation | Post-3B.1 |
| O15 | Automated archival / DELETE jobs | Legal / ops process |
| O16 | Database repair SQL execution for legacy drift | Inspection only (3A.1) |
| O17 | Any runtime, SQL, or commit driven by **this** planning report | Separate implementation gate |

---

## 12. Implementation gate — separate approval required

| Gate | Status |
|------|--------|
| **Phase 3B.1 planning boundary** | **Approved** by issuance of this report |
| **Phase 3B.1 implementation** | **Not authorized** — requires distinct approval record |
| **Production cutover (`T_3B1_cutover`)** | **Pending** — operations and architecture sign-off |
| **Phase 3B broader semantics (COMMITTED, external truth ingest, quorum)** | **Out of scope** — see `PHASE_3B_INSTITUTIONAL_SEMANTICS_PLAN.md` |

### 12.1 Preconditions for implementation approval (recommended)

1. Phase 3A SQL (`011` → `009b` → `010`) applied in target environment  
2. `ledger-verify` reports `authority_mode: LEDGER_ENTRIES_PRIMARY` with expected ledger chain behavior  
3. Legacy drift understood and accepted (warnings, not primary failure)  
4. Runbook entry for `T_3B1_cutover` drafted  
5. Rollback path documented (RPC/app revert without ledger rollback)

### 12.2 Approval record template

| Action | Approver | Date | Status |
|--------|----------|------|--------|
| Planning boundary (this document) | Architecture | — | **Approved (planning)** |
| Implementation (SQL/JS/RPC) | Architecture + Audit | — | **Pending** |
| Production cutover | Operations | — | **Pending** |

---

## Summary

Phase 3B.1 defines the **supplemental audit layer** as a global, append-only, hashed institutional log that observes and binds to Phase 3A material truth without becoming status authority, ledger authority, or a replacement for `LEDGER_ENTRIES_PRIMARY` / `executia/ledger/v1`. Reconciliation and external proof are observation and attachment models only. Visibility, retention, and replay rules protect chain integrity for audit-grade review. Implementation requires **separate approval**; this report introduces no code, SQL, or runtime change.

---

*End of Phase 3B.1 planning report.*
