-- EXECUTIA™ Legacy drift inspection (READ-ONLY)
-- IDs from live ledger-verify:
--   execution_chain tampered_execution_id: 93d10bcc-518b-4353-8e0b-852e04d34aa4
--   core_ledger_chain tampered_id:         ed9f4e9c-2c9b-4eb1-a117-391bb135e718
--
-- Rules: SELECT only. No UPDATE / DELETE / DDL.
-- Phase 3A authority: ledger_entries is materialized truth; execution_results is projection.

-- =============================================================================
-- CONSTANTS (replace if re-running for other IDs)
-- =============================================================================
-- \set exec_id '93d10bcc-518b-4353-8e0b-852e04d34aa4'
-- \set core_id 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'

-- =============================================================================
-- A. EXECUTION ID: 93d10bcc-518b-4353-8e0b-852e04d34aa4
-- =============================================================================

-- A1) execution_results projection (verifyExecutionChain input)
SELECT
  'execution_results' AS source,
  execution_id,
  status,
  decision,
  reason,
  hash AS stored_hash,
  prev_hash AS stored_prev_hash,
  created_at,
  updated_at,
  organization_id,
  payload
FROM execution_results
WHERE execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid;

-- A2) ledger_entries material truth (all links for this execution)
SELECT
  'ledger_entries' AS source,
  id AS ledger_row_id,
  execution_id,
  status,
  previous_hash,
  entry_hash,
  created_at,
  payload,
  payload->>'decision' AS payload_decision
FROM ledger_entries
WHERE execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
ORDER BY created_at ASC;

-- A3) Latest ledger head vs projection (projection drift detector)
WITH head AS (
  SELECT *
  FROM ledger_entries
  WHERE execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
  ORDER BY created_at DESC
  LIMIT 1
),
exec AS (
  SELECT *
  FROM execution_results
  WHERE execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
)
SELECT
  e.execution_id,
  e.status AS exec_status,
  h.status AS ledger_head_status,
  e.decision AS exec_decision,
  h.payload->>'decision' AS ledger_payload_decision,
  e.hash AS exec_hash,
  h.entry_hash AS ledger_head_hash,
  e.prev_hash AS exec_prev_hash,
  h.previous_hash AS ledger_head_prev_hash,
  (e.hash = h.entry_hash) AS hash_matches_ledger_head,
  (e.prev_hash = h.previous_hash) AS prev_hash_matches_ledger_head,
  (e.status = h.status) AS status_matches,
  CASE
    WHEN h.execution_id IS NULL THEN 'ORPHAN_PROJECTION_NO_LEDGER'
    WHEN e.hash IS NULL THEN 'NO_HASH_SKIPPED_BY_VERIFIER'
    WHEN e.hash = h.entry_hash AND e.prev_hash = h.previous_hash THEN 'ALIGNED'
    WHEN e.hash IS DISTINCT FROM h.entry_hash THEN 'PROJECTION_HASH_DRIFT'
    WHEN e.prev_hash IS DISTINCT FROM h.previous_hash THEN 'PROJECTION_PREV_HASH_DRIFT'
    ELSE 'OTHER_MISMATCH'
  END AS drift_class
FROM exec e
LEFT JOIN head h ON true;

-- A4) verifyExecutionChain formula (matches services/audit.js → ledger.js)
--     expected = sha256(execution_id || status || coalesce(decision,'REVIEW') || prev_hash)
SELECT
  e.execution_id,
  e.status,
  e.decision,
  e.prev_hash,
  e.hash AS stored_hash,
  encode(
    sha256(
      (
        e.execution_id::text
        || e.status
        || coalesce(e.decision, 'REVIEW')
        || coalesce(e.prev_hash, 'GENESIS')
      )::bytea
    ),
    'hex'
  ) AS expected_execution_chain_hash,
  (e.hash = encode(
    sha256(
      (
        e.execution_id::text
        || e.status
        || coalesce(e.decision, 'REVIEW')
        || coalesce(e.prev_hash, 'GENESIS')
      )::bytea
    ),
    'hex'
  )) AS execution_chain_verify_pass,
  CASE
    WHEN e.hash IS NULL THEN 'SKIP_NULL_HASH'
    WHEN e.hash <> encode(sha256((e.execution_id::text || e.status || coalesce(e.decision,'REVIEW') || coalesce(e.prev_hash,'GENESIS'))::bytea), 'hex')
      THEN 'EXECUTION_CHAIN_BREAK: stored hash != f(status, decision, prev_hash)'
    ELSE 'EXECUTION_CHAIN_OK'
  END AS execution_chain_break_cause
FROM execution_results e
WHERE e.execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid;

-- A5) verifyLedgerChain formula per ledger row (matches services/ledger.js + decisionFromStatus)
--     decision inferred: payload.decision, else APPROVE/BLOCK/REVIEW from status
SELECT
  le.id,
  le.execution_id,
  le.status,
  le.previous_hash,
  le.entry_hash AS stored_entry_hash,
  coalesce(
    le.payload->>'decision',
    CASE le.status
      WHEN 'APPROVED' THEN 'APPROVE'
      WHEN 'COMMITTED' THEN 'APPROVE'
      WHEN 'BLOCKED' THEN 'BLOCK'
      ELSE 'REVIEW'
    END
  ) AS inferred_decision,
  encode(
    sha256(
      (
        le.execution_id::text
        || le.status
        || coalesce(
          le.payload->>'decision',
          CASE le.status
            WHEN 'APPROVED' THEN 'APPROVE'
            WHEN 'COMMITTED' THEN 'APPROVE'
            WHEN 'BLOCKED' THEN 'BLOCK'
            ELSE 'REVIEW'
          END
        )
        || le.previous_hash
      )::bytea
    ),
    'hex'
  ) AS expected_ledger_entry_hash,
  (le.entry_hash = encode(
    sha256(
      (
        le.execution_id::text
        || le.status
        || coalesce(
          le.payload->>'decision',
          CASE le.status
            WHEN 'APPROVED' THEN 'APPROVE'
            WHEN 'COMMITTED' THEN 'APPROVE'
            WHEN 'BLOCKED' THEN 'BLOCK'
            ELSE 'REVIEW'
          END
        )
        || le.previous_hash
      )::bytea
    ),
    'hex'
  )) AS ledger_row_verify_pass
FROM ledger_entries le
WHERE le.execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
ORDER BY le.created_at ASC;

-- A6) Global ledger link: is this execution's ledger row(s) breaking the GLOBAL chain?
WITH ordered AS (
  SELECT
    id,
    execution_id,
    previous_hash,
    entry_hash,
    created_at,
    lag(entry_hash) OVER (ORDER BY created_at ASC) AS prior_entry_hash
  FROM ledger_entries
  ORDER BY created_at ASC
)
SELECT
  o.id,
  o.execution_id,
  o.previous_hash,
  o.prior_entry_hash AS chain_expects_previous,
  (o.previous_hash = coalesce(o.prior_entry_hash, 'GENESIS')) AS global_previous_link_ok,
  o.created_at
FROM ordered o
WHERE o.execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
ORDER BY o.created_at ASC;

-- A7) Duplicate ledger append for same execution?
SELECT
  execution_id,
  count(*) AS ledger_row_count,
  count(DISTINCT entry_hash) AS distinct_entry_hashes,
  array_agg(entry_hash ORDER BY created_at) AS entry_hashes_in_order,
  CASE
    WHEN count(*) > 1 THEN 'POSSIBLE_DUPLICATE_APPEND'
    WHEN count(*) = 0 THEN 'NO_LEDGER_ORPHAN'
    ELSE 'SINGLE_APPEND'
  END AS append_class
FROM ledger_entries
WHERE execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
GROUP BY execution_id;

-- A8) audit_events for this execution (supplemental; not execution-chain authority)
SELECT
  id,
  event_type,
  execution_id,
  actor,
  created_at,
  payload
FROM audit_events
WHERE execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
ORDER BY created_at ASC;

-- A8b) audit hash columns if present (optional — omit if column missing)
-- SELECT id, event_type, hash, previous_hash, previous_event_hash, created_at
-- FROM audit_events
-- WHERE execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
-- ORDER BY created_at ASC;

-- A9) core_ledger rows tied to same execution_id
SELECT
  id,
  execution_id,
  transaction_type,
  status,
  decision,
  hash,
  prev_hash,
  amount,
  currency,
  created_at,
  payload
FROM core_ledger
WHERE execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid
ORDER BY created_at ASC;

-- A10) Position in verifyExecutionChain scan order (first failure may be earliest bad row by created_at)
SELECT
  execution_id,
  status,
  decision,
  hash,
  prev_hash,
  created_at,
  row_number() OVER (ORDER BY created_at ASC) AS verify_scan_order,
  (execution_id = '93d10bcc-518b-4353-8e0b-852e04d34aa4'::uuid) AS is_reported_tamper_id
FROM execution_results
WHERE hash IS NOT NULL
ORDER BY created_at ASC;

-- =============================================================================
-- B. CORE LEDGER ROW ID: ed9f4e9c-2c9b-4eb1-a117-391bb135e718
-- =============================================================================

-- B1) Target core_ledger row
SELECT
  'core_ledger' AS source,
  id,
  execution_id,
  transaction_type,
  status,
  decision,
  hash AS stored_hash,
  prev_hash AS stored_prev_hash,
  amount,
  net_amount,
  gross_amount,
  currency,
  debit_account,
  credit_account,
  tax_rate,
  settlement_status,
  created_at,
  payload
FROM core_ledger
WHERE id = 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'::uuid;

-- B2) Prior core_ledger row in global created_at order (chain context)
SELECT
  id,
  execution_id,
  hash,
  prev_hash,
  created_at
FROM core_ledger
WHERE created_at < (
  SELECT created_at FROM core_ledger WHERE id = 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'::uuid
)
ORDER BY created_at DESC
LIMIT 3;

-- B3) WRONG historical formula (commit-execution era): execution ledger concat hash
--     Same as ledger.js: sha256(execution_id || status || decision || prev_hash)
SELECT
  c.id,
  c.execution_id,
  c.status,
  coalesce(c.decision, 'APPROVE') AS decision_used,
  c.prev_hash,
  c.hash AS stored_hash,
  encode(
    sha256(
      (
        coalesce(c.execution_id::text, '')
        || c.status
        || coalesce(c.decision, 'APPROVE')
        || coalesce(c.prev_hash, 'GENESIS')
      )::bytea
    ),
    'hex'
  ) AS expected_wrong_commit_execution_formula,
  (c.hash = encode(
    sha256(
      (
        coalesce(c.execution_id::text, '')
        || c.status
        || coalesce(c.decision, 'APPROVE')
        || coalesce(c.prev_hash, 'GENESIS')
      )::bytea
    ),
    'hex'
  )) AS matches_wrong_formula,
  CASE
    WHEN c.hash = encode(sha256((coalesce(c.execution_id::text,'') || c.status || coalesce(c.decision,'APPROVE') || coalesce(c.prev_hash,'GENESIS'))::bytea), 'hex')
      THEN 'WRONG_HISTORICAL_FORMULA_MATCH (commit-execution style)'
    ELSE 'NO_MATCH_WRONG_FORMULA'
  END AS wrong_formula_class
FROM core_ledger c
WHERE c.id = 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'::uuid;

-- B4) Note: correct core_ledger hash uses stableStringify in JS (not reproducible 1:1 in plain SQL).
--     After inspection, use POST /api/v1/core-ledger-repair or app buildLedgerHash(core-ledger.js).
--     B4 shows whether stored hash matches execution-style formula (diagnostic only).

-- B5) Global core_ledger order — find first row that fails wrong-formula probe (diagnostic)
WITH ordered AS (
  SELECT
    id,
    execution_id,
    status,
    decision,
    hash,
    prev_hash,
    created_at,
    lag(hash) OVER (ORDER BY created_at ASC) AS prior_row_hash
  FROM core_ledger
  ORDER BY created_at ASC
)
SELECT
  id,
  execution_id,
  prev_hash,
  prior_row_hash,
  (prev_hash = coalesce(prior_row_hash, 'GENESIS')) AS prev_link_matches_prior_row,
  (id = 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'::uuid) AS is_reported_tamper_id
FROM ordered
WHERE id = 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'::uuid
   OR prev_hash IS NULL
   OR prev_hash = 'GENESIS'
ORDER BY created_at ASC
LIMIT 5;

-- B6) ledger_entries for linked execution_id (if any)
SELECT le.*
FROM core_ledger c
JOIN ledger_entries le ON le.execution_id = c.execution_id
WHERE c.id = 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'::uuid
ORDER BY le.created_at ASC;

-- B7) execution_results for linked execution_id
SELECT e.*
FROM core_ledger c
JOIN execution_results e ON e.execution_id = c.execution_id
WHERE c.id = 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'::uuid;

-- B8) audit_events for linked execution_id
SELECT a.*
FROM core_ledger c
JOIN audit_events a ON a.execution_id = c.execution_id
WHERE c.id = 'ed9f4e9c-2c9b-4eb1-a117-391bb135e718'::uuid
ORDER BY a.created_at ASC;

-- =============================================================================
-- C. CROSS-SUMMARY (both IDs)
-- =============================================================================

SELECT 'ledger_global' AS check_name,
  (SELECT count(*) FROM ledger_entries) AS rows,
  NULL::boolean AS reported_issue;

SELECT 'execution_projection_drift' AS check_name,
  count(*) AS rows_with_hash_mismatch_vs_ledger_head
FROM execution_results e
JOIN (
  SELECT DISTINCT ON (execution_id) execution_id, entry_hash, previous_hash
  FROM ledger_entries ORDER BY execution_id, created_at DESC
) h ON h.execution_id = e.execution_id
WHERE e.hash IS NOT NULL
  AND (e.hash IS DISTINCT FROM h.entry_hash OR e.prev_hash IS DISTINCT FROM h.previous_hash);
