/**
 * EXECUTIA™ — /engine/rule-loader.js
 * Rule loading with deterministic scoping.
 *
 * PRODUCTION PATH:  fetchRulesViaRPC()   — single SQL call, fully auditable
 * DEV FALLBACK:     fetchRulesFromDB()   — three JS queries, no SQL function needed
 *
 * Switch via env: EXECUTIA_RULES_SOURCE=rpc (default) | db
 * Set EXECUTIA_RULES_SOURCE=db only when get_scoped_rules() RPC is not yet deployed.
 */

export function filterScopedRules(rules, { organizationId, projectId, eventType }) {
  return rules.filter(rule => {
    const orgMatch     = rule.organization_id === organizationId || rule.organization_id == null;
    const projectMatch = rule.project_id      === projectId      || rule.project_id      == null;
    const eventMatch   = rule.event_type      === eventType      || rule.event_type      === "*";
    const statusMatch  = rule.status          === "published";
    return orgMatch && projectMatch && eventMatch && statusMatch;
  });
}

function specificityScore(rule) {
  let score = 0;
  if (rule.organization_id != null) score += 4;
  if (rule.project_id      != null) score += 2;
  if (rule.event_type && rule.event_type !== "*") score += 1;
  return score;
}

export function sortRulesDeterministically(rules) {
  return [...rules].sort((a, b) => {
    const specDiff = specificityScore(b) - specificityScore(a);
    if (specDiff !== 0) return specDiff;
    const prioDiff = Number(a.priority ?? 100) - Number(b.priority ?? 100);
    if (prioDiff !== 0) return prioDiff;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Load rules using configured source (RPC default, DB fallback).
 * This is the function both API endpoints call — single entry point.
 *
 * EXECUTIA_RULES_SOURCE=rpc → fetchRulesViaRPC  (production, after schema.sql deployed)
 * EXECUTIA_RULES_SOURCE=db  → fetchRulesFromDB  (dev, or before RPC is available)
 */
export async function loadRules(supabase, eventType, projectId, organizationId) {
  const source = process.env.EXECUTIA_RULES_SOURCE || "rpc";

  if (source === "db") {
    return fetchRulesFromDB(supabase, eventType, projectId, organizationId);
  }

  // Default: RPC
  // In production (NODE_ENV=production): RPC failure = hard fail. No silent fallback.
  // In dev: if RPC function not found, falls back to JS queries automatically.
  try {
    return await fetchRulesViaRPC(supabase, eventType, projectId, organizationId);
  } catch (err) {
    const isRpcMissing = err.message.includes("does not exist") ||
                         err.message.includes("Could not find the function");
    if (isRpcMissing) {
      if (process.env.NODE_ENV === "production") {
        // Production: get_scoped_rules() RPC is required. Run schema.sql first.
        throw new Error(
          "RULE_FETCH_FAILED: get_scoped_rules() RPC not deployed. " +
          "Run schema.sql in Supabase or set EXECUTIA_RULES_SOURCE=db for dev."
        );
      }
      // Dev only: auto-fallback with warning
      console.warn("[EXECUTIA] RPC not found — falling back to JS queries (dev only). " +
        "Run schema.sql or set EXECUTIA_RULES_SOURCE=db to silence this.");
      return fetchRulesFromDB(supabase, eventType, projectId, organizationId);
    }
    throw err; // other errors: propagate fail-closed always
  }
}

/**
 * PRODUCTION: Single SQL call via get_scoped_rules() RPC.
 * Requires schema.sql to be run in Supabase first.
 * All scoping, ordering, org constraints handled in SQL.
 */
export async function fetchRulesViaRPC(supabase, eventType, projectId, organizationId) {
  const { data, error } = await supabase.rpc("get_scoped_rules", {
    p_event_type:       eventType,
    p_organization_id:  organizationId || null,
    p_project_id:       projectId      || null,
  });

  if (error) throw new Error(`RULE_FETCH_FAILED (RPC): ${error.message}`);
  return data || [];
}

/**
 * DEV-ONLY FALLBACK. NOT a production semantics equivalent.
 * Missing: SQL-level specificity ordering, org-scoped audit trail.
 * Use only when get_scoped_rules() RPC is not yet deployed.
 *
 * To activate: EXECUTIA_RULES_SOURCE=db
 * To deploy RPC: run schema.sql in Supabase → switch back to default (rpc)
 */
export async function fetchRulesFromDB(supabase, eventType, projectId, organizationId) {
  const eventFilter = `event_type.eq.${eventType},event_type.eq.*`;

  const [sysRes, orgRes, projRes] = await Promise.all([
    supabase.from("execution_rules").select("*")
      .eq("status", "published")
      .is("organization_id", null).is("project_id", null)
      .or(eventFilter),

    organizationId
      ? supabase.from("execution_rules").select("*")
          .eq("status", "published").eq("organization_id", organizationId).is("project_id", null)
          .or(eventFilter)
      : Promise.resolve({ data: [], error: null }),

    projectId
      ? supabase.from("execution_rules").select("*")
          .eq("status", "published").eq("project_id", projectId)
          .or(organizationId
            ? `organization_id.eq.${organizationId},organization_id.is.null`
            : "organization_id.is.null")
          .or(eventFilter)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (sysRes.error)  throw new Error(`RULE_FETCH_FAILED (system rules): ${sysRes.error.message}`);
  if (orgRes.error)  throw new Error(`RULE_FETCH_FAILED (org rules): ${orgRes.error.message}`);
  if (projRes.error) throw new Error(`RULE_FETCH_FAILED (project rules): ${projRes.error.message}`);

  const raw  = [...sysRes.data, ...orgRes.data, ...projRes.data];
  const seen = new Set();
  return raw.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
}
