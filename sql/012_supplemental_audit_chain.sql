-- EXECUTIA™ Phase 3B.1 — Supplemental audit chain (global, append-only)
-- Run AFTER sql/011_ledger_hash_authority.sql
-- Deploy BEFORE re-applying sql/009b / sql/010 bodies that call executia_append_global_audit_event.
--
-- Formula (must match services/audit.js buildAuditHash — executia/audit/v1):
--   event_hash = sha256(execution_id::text || event_type || actor || payload::text || prev_hash)

-- ---------------------------------------------------------------------------
-- Schema: supplemental hash columns (append-only chain)
-- ---------------------------------------------------------------------------
ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS event_hash text;

-- Legacy app columns (optional coexistence)
ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS hash text,
  ADD COLUMN IF NOT EXISTS previous_hash text,
  ADD COLUMN IF NOT EXISTS previous_event_hash text;

CREATE INDEX IF NOT EXISTS idx_audit_events_global_chain_head
  ON audit_events (created_at DESC, id DESC)
  WHERE event_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Append-only enforcement (no UPDATE/DELETE on chained rows)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION executia_audit_events_append_only_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.event_hash IS NOT NULL OR OLD.hash IS NOT NULL THEN
      RAISE EXCEPTION 'AUDIT_APPEND_ONLY_VIOLATION';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.event_hash IS NOT NULL OR OLD.hash IS NOT NULL THEN
      RAISE EXCEPTION 'AUDIT_APPEND_ONLY_VIOLATION';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_events_append_only ON audit_events;

CREATE TRIGGER trg_audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION executia_audit_events_append_only_guard();

-- ---------------------------------------------------------------------------
-- Hash authority
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION executia_audit_event_hash(
  p_execution_id uuid,
  p_event_type text,
  p_actor text,
  p_payload jsonb,
  p_prev_hash text DEFAULT 'GENESIS'
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT encode(
    sha256(
      (
        coalesce(p_execution_id::text, '')
        || coalesce(nullif(p_event_type, ''), 'UNKNOWN')
        || coalesce(nullif(p_actor, ''), 'system')
        || coalesce(p_payload::text, '{}')
        || coalesce(nullif(p_prev_hash, ''), 'GENESIS')
      )::bytea
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION executia_get_last_audit_hash()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_prev text;
BEGIN
  SELECT coalesce(event_hash, hash)
    INTO v_prev
    FROM audit_events
   WHERE coalesce(event_hash, hash) IS NOT NULL
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  RETURN coalesce(v_prev, 'GENESIS');
END;
$$;

-- Caller must run inside a transaction that holds pg_advisory_xact_lock(hashtext('executia_ledger'))
-- (same lock as material RPC — re-entrant within transaction).
CREATE OR REPLACE FUNCTION executia_append_global_audit_event(
  p_event_type text,
  p_execution_id uuid,
  p_actor text DEFAULT 'system',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev text;
  v_hash text;
  v_payload jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('executia_ledger'));

  v_prev := executia_get_last_audit_hash();
  v_payload := coalesce(p_payload, '{}'::jsonb);

  v_hash := executia_audit_event_hash(
    p_execution_id,
    p_event_type,
    p_actor,
    v_payload,
    v_prev
  );

  INSERT INTO audit_events (
    event_type,
    execution_id,
    actor,
    payload,
    prev_hash,
    event_hash,
    previous_hash,
    previous_event_hash,
    hash,
    created_at
  )
  VALUES (
    p_event_type,
    p_execution_id,
    coalesce(nullif(p_actor, ''), 'system'),
    v_payload,
    v_prev,
    v_hash,
    v_prev,
    v_prev,
    v_hash,
    now()
  );

  RETURN jsonb_build_object(
    'prev_hash', v_prev,
    'event_hash', v_hash,
    'event_type', p_event_type,
    'execution_id', p_execution_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION executia_audit_event_hash(uuid, text, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION executia_get_last_audit_hash() TO service_role;
GRANT EXECUTE ON FUNCTION executia_append_global_audit_event(text, uuid, text, jsonb) TO service_role;
