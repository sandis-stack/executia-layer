-- ============================================================
-- EXECUTIA V2 — MULTI-OPERATOR QUORUM GOVERNANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS governance_quorum_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid,

  escalation_level integer NOT NULL DEFAULT 1,

  required_approvals integer NOT NULL DEFAULT 1,
  required_role text NOT NULL DEFAULT 'OPERATOR',

  supervisor_required boolean NOT NULL DEFAULT false,
  freeze_required boolean NOT NULL DEFAULT false,
  override_allowed boolean NOT NULL DEFAULT true,

  active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, escalation_level)
);

CREATE INDEX IF NOT EXISTS idx_governance_quorum_rules_org
ON governance_quorum_rules(organization_id);

CREATE INDEX IF NOT EXISTS idx_governance_quorum_rules_level
ON governance_quorum_rules(escalation_level);

ALTER TABLE governance_quorum_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_governance_quorum_rules"
ON governance_quorum_rules
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Default institutional rule set
INSERT INTO governance_quorum_rules (
  organization_id,
  escalation_level,
  required_approvals,
  required_role,
  supervisor_required,
  freeze_required,
  override_allowed
)
VALUES
  (NULL, 1, 1, 'OPERATOR', false, false, true),
  (NULL, 2, 2, 'OPERATOR', false, false, true),
  (NULL, 3, 3, 'SUPERVISOR', true, false, true),
  (NULL, 4, 3, 'SUPERVISOR', true, true, false)
ON CONFLICT (organization_id, escalation_level) DO NOTHING;
