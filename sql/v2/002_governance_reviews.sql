-- ============================================================
-- EXECUTIA V2 — GOVERNANCE REVIEW LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS governance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  execution_id uuid,
  organization_id uuid,

  governance_decision text NOT NULL DEFAULT 'PENDING_REVIEW',
  policy_decision text NOT NULL DEFAULT 'PENDING_REVIEW',

  review_status text NOT NULL DEFAULT 'OPEN',

  risk_score numeric DEFAULT 0,

  requested_by text,
  assigned_to text,

  escalation_level integer DEFAULT 1,

  review_reason text,

  governance_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  policy_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- ============================================================
-- GOVERNANCE REVIEW EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS governance_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  review_id uuid NOT NULL,
  execution_id uuid,

  actor text NOT NULL DEFAULT 'system',

  event_type text NOT NULL,

  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_governance_reviews_execution_id
ON governance_reviews(execution_id);

CREATE INDEX IF NOT EXISTS idx_governance_reviews_status
ON governance_reviews(review_status);

CREATE INDEX IF NOT EXISTS idx_governance_reviews_created_at
ON governance_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_governance_review_events_review_id
ON governance_review_events(review_id);

CREATE INDEX IF NOT EXISTS idx_governance_review_events_execution_id
ON governance_review_events(execution_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE governance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_review_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SERVICE ROLE POLICIES
-- ============================================================

CREATE POLICY "service_role_all_governance_reviews"
ON governance_reviews
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_all_governance_review_events"
ON governance_review_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
