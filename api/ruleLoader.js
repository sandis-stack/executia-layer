/**
 * EXECUTIA™ — /core/rules/ruleLoader.js
 * Loads execution rules from Supabase with caching.
 *
 * Rules are cached per eventType for 60s to reduce DB calls.
 * Cache invalidates on deploy (in-memory only).
 */

// ── IN-MEMORY CACHE ──────────────────────────────────────────
const cache     = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Load active execution rules for a given event type.
 * Filters by: eventType (required), projectId + orgId (optional scoping).
 *
 * Rule priority order (ascending = lower number = higher priority):
 *   10  = system-level (always applies)
 *   50  = org-level
 *   100 = project-level (most specific)
 *
 * @param {object} supabase   - Supabase client
 * @param {string} eventType  - e.g. "material_delayed"
 * @param {string} projectId  - optional
 * @param {string} orgId      - optional
 * @returns {Array}           - Sorted rules ready for applyExecutionRules()
 */
export async function loadExecutionRules(supabase, eventType, projectId = null, orgId = null) {
  const cacheKey = `${eventType}:${projectId}:${orgId}`;
  const cached   = cache.get(cacheKey);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.rules;
  }

  try {
    let query = supabase
      .from("execution_rules")
      .select("*")
      .eq("active", true)
      .order("priority", { ascending: true });

    // Build single combined OR filter (multiple .or() calls overwrite each other in Supabase)
    const orParts = [
      `event_type.eq.${eventType}`,
      `event_type.eq.*`,
    ];
    if (orgId)     orParts.push(`organization_id.eq.${orgId}`, `organization_id.is.null`);
    if (projectId) orParts.push(`project_id.eq.${projectId}`, `project_id.is.null`);

    query = query.or(orParts.join(","));

    const { data, error } = await query;

    if (error) {
      console.error("[EXECUTIA] ruleLoader error:", error.message);
      return getFallbackRules(eventType);
    }

    const rules = data || [];

    // Cache result
    cache.set(cacheKey, { rules, ts: Date.now() });
    return rules;

  } catch (err) {
    console.error("[EXECUTIA] ruleLoader exception:", err.message);
    return getFallbackRules(eventType);
  }
}

/**
 * Invalidate cache for a specific eventType (call after rule CRUD).
 */
export function invalidateRuleCache(eventType) {
  for (const key of cache.keys()) {
    if (key.startsWith(eventType + ":")) {
      cache.delete(key);
    }
  }
}

/**
 * Fallback rules — minimal safe defaults if DB is unavailable.
 * These mirror the old hardcoded RULES behavior.
 */
function getFallbackRules(eventType) {
  console.warn(`[EXECUTIA] Using fallback rules for: ${eventType}`);

  const FALLBACK = {
    material_delayed: [{
      id: "fallback_md", rule_key: "material_delayed_fallback",
      event_type: "material_delayed", active: true, priority: 999,
      condition_json: null,
      action_json: {
        updates: [
          { match: { id: 1 }, set: { status: "blocked", reason: "Material delayed", priority: "P1" } },
          { match: { id: 2 }, set: { status: "do_now", reason: "Crew reassigned", priority: "P1", action: "Begin facade prep" } }
        ]
      }
    }],
    worker_unavailable: [{
      id: "fallback_wu", rule_key: "worker_unavailable_fallback",
      event_type: "worker_unavailable", active: true, priority: 999,
      condition_json: null,
      action_json: {
        updates: [{ match: { status: "do_now" }, set: { status: "waiting", reason: "Lead unavailable", action: "Find replacement", priority: "P1" } }]
      }
    }],
    task_completed: [{
      id: "fallback_tc", rule_key: "task_completed_fallback",
      event_type: "task_completed", active: true, priority: 999,
      condition_json: null,
      action_json: {
        updates: [{ match: { id: 1 }, set: { status: "done", reason: "Signed off", priority: "P3" } }],
        create: [{ title: "Next Phase", status: "do_now", reason: "Dependency cleared", action: "Assign lead", priority: "P2" }]
      }
    }],
    delay_detected: [{
      id: "fallback_dd", rule_key: "delay_detected_fallback",
      event_type: "delay_detected", active: true, priority: 999,
      condition_json: null,
      action_json: {
        updates: [{ match: { status: "do_now" }, set: { reason: "Overdue — escalation required", action: "Escalate immediately", priority: "P1" } }],
        create: [{ title: "Manager Intervention", status: "do_now", reason: "SLA clock started", action: "On-site review required", priority: "P1" }]
      }
    }],
    crew_available: [{
      id: "fallback_ca", rule_key: "crew_available_fallback",
      event_type: "crew_available", active: true, priority: 999,
      condition_json: null,
      action_json: {
        updates: [{ match: { status: "waiting" }, set: { status: "do_now", reason: "Crew available", action: "Start now", priority: "P2" } }]
      }
    }]
  };

  return FALLBACK[eventType] || [];
}
