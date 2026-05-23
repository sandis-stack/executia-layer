-- EXECUTIA™ Phase 3B.1 rollback
-- Restores pre-3B.1 RPC audit inserts (unhashed legacy supplemental rows).
-- Does NOT drop ledger Phase 3A functions or alter ledger_entries authority.

DROP TRIGGER IF EXISTS trg_audit_events_append_only ON audit_events;
DROP FUNCTION IF EXISTS executia_audit_events_append_only_guard();

DROP FUNCTION IF EXISTS executia_append_global_audit_event(text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS executia_get_last_audit_hash();
DROP FUNCTION IF EXISTS executia_audit_event_hash(uuid, text, text, jsonb, text);

-- Restore commit_execution audit insert (requires sql/011 ledger append still in place)
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
  IF payload->'canonical_evaluation'->>'version' = '1'
     AND payload->'canonical_evaluation'->>'decision' IN ('APPROVE', 'BLOCK', 'REVIEW')
  THEN
    v_canonical_decision := payload->'canonical_evaluation'->>'decision';
    v_decision := v_canonical_decision;
    v_reason   := COALESCE(payload->'canonical_evaluation'->>'reason', 'CANONICAL_EVALUATION');

    IF payload->>'actor' IS NULL OR payload->>'subject' IS NULL OR payload->>'request_type' IS NULL THEN
      v_decision := 'REVIEW';
      v_reason   := 'VALIDATION_INCOMPLETE';
    ELSIF v_limit > 0 AND v_amount > v_limit THEN
      v_decision := 'BLOCK';
      v_reason   := 'AMOUNT_EXCEEDS_APPROVAL_LIMIT';
    END IF;
  ELSE
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

  PERFORM pg_advisory_xact_lock(hashtext('executia_ledger'));

  v_ledger := executia_ledger_append(v_id, v_status, v_decision, payload);
  v_prev_hash := v_ledger->>'previous_hash';
  v_hash := v_ledger->>'entry_hash';

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

  INSERT INTO audit_events (event_type, execution_id, actor, payload, created_at)
  VALUES (
    'OPERATOR_DECISION_COMMITTED',
    p_execution_id,
    COALESCE(p_actor, 'operator'),
    jsonb_build_object(
      'status', v_status,
      'decision', v_normalized,
      'reason', COALESCE(p_reason, 'OPERATOR_' || v_normalized),
      'hash', v_hash,
      'prev_hash', v_prev_hash
    ),
    now()
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

GRANT EXECUTE ON FUNCTION commit_execution(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION commit_operator_decision(uuid, text, text, text) TO service_role;
