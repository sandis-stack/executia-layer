-- LEGACY PRE-3B1 RPC. Not canonical production authority.
-- Canonical submit path is sql/009b_canonical_evaluation_bridge.sql emitting EXECUTION_SUBMITTED.
--
-- EXECUTIA™ Atomic Execution RPC
-- Run AFTER sql/001_schema.sql
-- This is the ONLY way execution enters the system.
-- One function. One transaction. Zero partial states.

CREATE OR REPLACE FUNCTION commit_execution(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id        uuid    := gen_random_uuid();
  v_amount    numeric := COALESCE((payload->>'amount')::numeric, 0);
  v_limit     numeric := COALESCE((payload->'rule_context'->>'approval_limit')::numeric, 0);
  v_decision  text;
  v_status    text;
  v_reason    text;
  v_prev_hash text;
  v_hash      text;
BEGIN
  -- 1. DECISION ENGINE
  IF payload->>'actor' IS NULL OR payload->>'subject' IS NULL OR payload->>'request_type' IS NULL THEN
    v_decision := 'REVIEW';
    v_reason   := 'VALIDATION_INCOMPLETE';
  ELSIF (payload->'rule_context'->>'requires_operator')::boolean = true THEN
    v_decision := 'REVIEW';
    v_reason   := 'OPERATOR_REQUIRED';
  ELSIF v_limit > 0 AND v_amount > v_limit THEN
    v_decision := 'BLOCK';
    v_reason   := 'AMOUNT_EXCEEDS_APPROVAL_LIMIT';
  ELSE
    v_decision := 'APPROVE';
    v_reason   := 'RULES_PASSED';
  END IF;

  v_status := CASE v_decision
    WHEN 'APPROVE' THEN 'APPROVED'
    WHEN 'BLOCK'   THEN 'BLOCKED'
    ELSE                'PENDING_REVIEW'
  END;

  -- 2. ADVISORY LOCK — prevents parallel requests corrupting hash chain
  PERFORM pg_advisory_xact_lock(hashtext('executia_ledger'));

  -- 3. PREVIOUS HASH — safe inside lock
  SELECT COALESCE(entry_hash, 'GENESIS')
    INTO v_prev_hash
    FROM ledger_entries
   ORDER BY created_at DESC
   LIMIT 1;
  v_prev_hash := COALESCE(v_prev_hash, 'GENESIS');

  -- 4. HASH — execution truth fingerprint
  v_hash := encode(sha256((v_id::text || v_status || v_decision || v_prev_hash)::bytea), 'hex');

  -- 5. ATOMIC INSERT — all three or none (transaction rollback on any error)
  INSERT INTO execution_results
    (execution_id, request_type, actor, subject, status, decision, reason,
     amount, organization_id, payload, hash, prev_hash, created_at, updated_at)
  VALUES
    (v_id,
     COALESCE(payload->>'request_type', 'UNKNOWN'),
     COALESCE(payload->>'actor',        'unknown'),
     COALESCE(payload->>'subject',      'unknown'),
     v_status, v_decision, v_reason,
     v_amount,
     NULLIF(payload->>'organization_id', '')::uuid,
     payload, v_hash, v_prev_hash, now(), now());

  INSERT INTO audit_events (event_type, execution_id, actor, payload, created_at)
  VALUES ('EXECUTION_CREATED', v_id, COALESCE(payload->>'actor','system'),
          jsonb_build_object('status', v_status, 'decision', v_decision, 'reason', v_reason), now());

  INSERT INTO ledger_entries (execution_id, status, previous_hash, entry_hash, payload, created_at)
  VALUES (v_id, v_status, v_prev_hash, v_hash, payload, now());

  -- 6. RETURN TRUTH
  RETURN jsonb_build_object(
    'ok',          true,
    'execution_id', v_id,
    'status',       v_status,
    'decision',     v_decision,
    'reason',       v_reason,
    'hash',         v_hash,
    'prev_hash',    v_prev_hash
  );
END;
$$;

GRANT EXECUTE ON FUNCTION commit_execution(jsonb) TO service_role;
