-- SUPERSEDED: view and RPC are now in schema.sql.
-- Kept for migration history only.

-- EXECUTIA™ — /gateway/rules-view.sql
-- Auditable SQL view for rule loading.
-- Replaces multi-.or() Supabase JS queries with a single, auditable view.
--
-- Run in Supabase SQL Editor.
-- After creating this view, rule-loader.js can use fetchRulesViaRPC() instead of fetchRulesFromDB().

-- ── SCOPED PUBLISHED RULES VIEW ──────────────────────────────────
-- Returns all published rules with their scope level.
-- Consumers filter by eventType, orgId, projectId after fetching.
CREATE OR REPLACE VIEW scoped_published_rules AS
SELECT
  r.*,
  CASE
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NOT NULL
      AND r.event_type != '*'                             THEN 'PROJECT_EVENT'
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NOT NULL
                                                          THEN 'PROJECT_WILDCARD'
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NULL
      AND r.event_type != '*'                             THEN 'ORG_EVENT'
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NULL
                                                          THEN 'ORG_WILDCARD'
    WHEN r.organization_id IS NULL AND r.project_id IS NULL
      AND r.event_type != '*'                             THEN 'GLOBAL_EVENT'
    ELSE                                                       'GLOBAL_WILDCARD'
  END AS scope_level,

  CASE
    WHEN r.organization_id IS NOT NULL AND r.project_id IS NOT NULL THEN 6
    WHEN r.organization_id IS NOT NULL AND r.event_type != '*'      THEN 5
    WHEN r.organization_id IS NOT NULL                              THEN 4
    WHEN r.project_id IS NOT NULL AND r.event_type != '*'           THEN 3
    WHEN r.event_type != '*'                                         THEN 2
    ELSE                                                              1
  END AS specificity_score

FROM execution_rules r
WHERE r.status = 'published';

-- ── RPC: FETCH SCOPED RULES ──────────────────────────────────────
-- Single parameterized function. Handles all scoping logic in SQL.
-- Guaranteed: no rules from other orgs, even if project_id matches.
CREATE OR REPLACE FUNCTION get_scoped_rules(
  p_event_type      TEXT,
  p_organization_id TEXT DEFAULT NULL,
  p_project_id      TEXT DEFAULT NULL
)
RETURNS SETOF scoped_published_rules
LANGUAGE sql STABLE AS $$
  SELECT *
  FROM scoped_published_rules r
  WHERE
    -- Event type: exact match or wildcard
    (r.event_type = p_event_type OR r.event_type = '*')
    AND
    -- Org scope: must match org OR be system-level (null org)
    (r.organization_id = p_organization_id OR r.organization_id IS NULL)
    AND
    -- Project scope: must match project OR be non-project-specific
    (
      r.project_id IS NULL
      OR (
        r.project_id = p_project_id
        -- Project rules must belong to same org (or be system-level)
        AND (r.organization_id = p_organization_id OR r.organization_id IS NULL)
      )
    )
  ORDER BY
    specificity_score DESC,   -- most specific first
    r.priority ASC,           -- lower priority number = higher priority
    r.id ASC                  -- deterministic tie-break
$$;

-- ── EXAMPLE USAGE ────────────────────────────────────────────────
-- SELECT * FROM get_scoped_rules('payment', 'org_1', 'prj_42');
-- SELECT * FROM get_scoped_rules('payment', 'org_1', NULL);
-- SELECT * FROM get_scoped_rules('payment', NULL, NULL);  -- system rules only
