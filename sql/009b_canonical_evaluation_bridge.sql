-- EXECUTIA™ Canonical Evaluation Bridge for commit_execution
-- Run AFTER sql/009_atomic_execution_rpc.sql AND sql/011_ledger_hash_authority.sql
-- Additive CREATE OR REPLACE: trusts canonical_evaluation v1 when present,
-- with SQL safety asserts; otherwise legacy SQL decision tree.
-- Phase 3A: ledger hash via executia_ledger_append (canonical execution truth).

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
  v_ledger    jsonb;
  v_canonical_decision text;
BEGIN
  -- 1. DECISION ENGINE
  IF payload->'canonical_evaluation'->>'version' = '1'
     AND payload->'canonical_evaluation'->>'decision' IN ('APPROVE', 'BLOCK', 'REVIEW')
  THEN
    v_canonical_decision := payload->'canonical_evaluation'->>'decision';
    v_decision := v_canonical_decision;
    v_reason   := COALESCE(payload->'canonical_evaluation'->>'reason', 'CANONICAL_EVALUATION');

    -- Safety asserts (never weaken hard institutional blocks)
    IF payload->>'actor' IS NULL OR payload->>'subject' IS NULL OR payload->>'request_type' IS NULL THEN
      v_decision := 'REVIEW';
      v_reason   := 'VALIDATION_INCOMPLETE';
    ELSIF v_limit > 0 AND v_amount > v_limit THEN
      v_decision := 'BLOCK';
      v_reason   := 'AMOUNT_EXCEEDS_APPROVAL_LIMIT';
    END IF;
  ELSE
    -- Legacy SQL decision tree (fallback when canonical_evaluation absent or disabled)
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
  END IF;

  v_status := CASE v_decision
    WHEN 'APPROVE' THEN 'APPROVED'
    WHEN 'BLOCK'   THEN 'BLOCKED'
    ELSE                'PENDING_REVIEW'
  END;

  -- 2. ADVISORY LOCK — prevents parallel requests corrupting hash chain
  PERFORM pg_advisory_xact_lock(hashtext('executia_ledger'));

  -- 3–4. LEDGER TRUTH — canonical append (sql/011_ledger_hash_authority.sql)
  v_ledger := executia_ledger_append(v_id, v_status, v_decision, payload);
  v_prev_hash := v_ledger->>'previous_hash';
  v_hash := v_ledger->>'entry_hash';

  -- 5. ATOMIC INSERT — projection + supplemental audit (audit chain unchanged in 3A)
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
