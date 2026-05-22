-- EXECUTIA™ Phase 3A — Ledger hash authority (materialized execution truth)
-- Run AFTER sql/001_schema.sql
-- Deploy BEFORE sql/009b / sql/010 refactors that call these functions.
--
-- Canonical formula (must match services/ledger.js buildLedgerHash):
--   entry_hash = sha256(execution_id::text || status || decision || previous_hash)

CREATE OR REPLACE FUNCTION executia_ledger_entry_hash(
  p_execution_id uuid,
  p_status text,
  p_decision text,
  p_previous_hash text DEFAULT 'GENESIS'
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT encode(
    sha256(
      (
        p_execution_id::text
        || coalesce(p_status, '')
        || coalesce(p_decision, '')
        || coalesce(nullif(p_previous_hash, ''), 'GENESIS')
      )::bytea
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION executia_get_last_ledger_hash()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_prev text;
BEGIN
  SELECT entry_hash
    INTO v_prev
    FROM ledger_entries
   ORDER BY created_at DESC
   LIMIT 1;

  RETURN coalesce(v_prev, 'GENESIS');
END;
$$;

-- Caller must hold pg_advisory_xact_lock(hashtext('executia_ledger')) in the same transaction.
CREATE OR REPLACE FUNCTION executia_ledger_append(
  p_execution_id uuid,
  p_status text,
  p_decision text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev text;
  v_hash text;
BEGIN
  v_prev := executia_get_last_ledger_hash();
  v_hash := executia_ledger_entry_hash(p_execution_id, p_status, p_decision, v_prev);

  INSERT INTO ledger_entries (
    execution_id,
    status,
    previous_hash,
    entry_hash,
    payload,
    created_at
  )
  VALUES (
    p_execution_id,
    p_status,
    v_prev,
    v_hash,
    coalesce(p_payload, '{}'::jsonb),
    now()
  );

  RETURN jsonb_build_object(
    'previous_hash', v_prev,
    'entry_hash', v_hash
  );
END;
$$;

GRANT EXECUTE ON FUNCTION executia_ledger_entry_hash(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION executia_get_last_ledger_hash() TO service_role;
GRANT EXECUTE ON FUNCTION executia_ledger_append(uuid, text, text, jsonb) TO service_role;
