-- EXECUTIA™ Atomic Operator Decision RPC
-- Run AFTER sql/001_schema.sql, sql/009_atomic_execution_rpc.sql, sql/011_ledger_hash_authority.sql
-- Operator review resolution must be atomic: execution update + ledger entry + audit event in one DB transaction.
-- Phase 3A: ledger hash via executia_ledger_append (canonical execution truth).
-- Phase 3B.1: supplemental audit via executia_append_global_audit_event (sql/012).

CREATE OR REPLACE FUNCTION commit_operator_decision(
  p_execution_id uuid,
  p_decision text,
  p_actor text DEFAULT 'operator',
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized text;
  v_status text;
  v_prev_hash text;
  v_hash text;
  v_ledger jsonb;
  v_existing record;
BEGIN
  v_normalized := CASE WHEN upper(coalesce(p_decision,'')) = 'APPROVE' THEN 'APPROVE' ELSE 'BLOCK' END;
  v_status := CASE WHEN v_normalized = 'APPROVE' THEN 'APPROVED' ELSE 'BLOCKED' END;

  PERFORM pg_advisory_xact_lock(hashtext('executia_ledger'));

  SELECT * INTO v_existing
    FROM execution_results
   WHERE execution_id = p_execution_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXECUTION_NOT_FOUND';
  END IF;

  IF v_existing.status <> 'PENDING_REVIEW' THEN
    RAISE EXCEPTION 'EXECUTION_NOT_PENDING_REVIEW';
  END IF;

  v_ledger := executia_ledger_append(
    p_execution_id,
    v_status,
    v_normalized,
    jsonb_build_object(
      'event', 'OPERATOR_DECISION',
      'decision', v_normalized,
      'status', v_status,
      'actor', COALESCE(p_actor, 'operator'),
      'reason', COALESCE(p_reason, 'OPERATOR_' || v_normalized)
    )
  );
  v_prev_hash := v_ledger->>'previous_hash';
  v_hash := v_ledger->>'entry_hash';

  UPDATE execution_results
     SET status = v_status,
         decision = v_normalized,
         reason = COALESCE(p_reason, 'OPERATOR_' || v_normalized),
         prev_hash = v_prev_hash,
         hash = v_hash,
         updated_at = now()
   WHERE execution_id = p_execution_id;

  PERFORM executia_append_global_audit_event(
    'OPERATOR_DECISION_RECORDED',
    p_execution_id,
    COALESCE(p_actor, 'operator'),
    jsonb_build_object(
      'chain_era', '3B1',
      'reference_only', true,
      'ledger_head_hash', v_hash,
      'status', v_status,
      'decision', v_normalized,
      'reason', COALESCE(p_reason, 'OPERATOR_' || v_normalized)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'execution_id', p_execution_id,
    'status', v_status,
    'decision', v_normalized,
    'reason', COALESCE(p_reason, 'OPERATOR_' || v_normalized),
    'hash', v_hash,
    'prev_hash', v_prev_hash
  );
END;
$$;

GRANT EXECUTE ON FUNCTION commit_operator_decision(uuid, text, text, text) TO service_role;
