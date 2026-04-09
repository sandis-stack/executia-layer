/**
 * EXECUTIA™ — /core/context/realDataAdapter.js
 * Enriches execution context with real project data.
 *
 * Currently supports:
 *   - Timesheet APIs (hours, workers)
 *   - BIM data (height, safety barriers)
 *   - Sensor feeds (temperature, conditions)
 *   - Supabase project snapshots
 *
 * Each source has a graceful fallback — if unavailable,
 * context defaults are preserved. Engine never blocks on data.
 */

/**
 * Main enrichment function.
 * @param {object} ctx        - Base context from buildProjectContext()
 * @param {string} projectId  - Project identifier
 * @param {object} options    - { supabase, timesheetUrl, sensorUrl, bimUrl }
 * @returns {object}          - Enriched context
 */
export async function enrichContextWithRealData(ctx, projectId, options = {}) {
  const { supabase, timesheetUrl, sensorUrl, bimUrl } = options;

  // Run all enrichments in parallel — fail gracefully
  const [timesheet, sensors, bim, projectSnapshot] = await Promise.allSettled([
    fetchTimesheet(timesheetUrl, projectId),
    fetchSensors(sensorUrl, projectId),
    fetchBIM(bimUrl, projectId),
    fetchProjectSnapshot(supabase, projectId),
  ]);

  const ts  = timesheet.status === "fulfilled"       ? timesheet.value       : null;
  const sen = sensors.status === "fulfilled"         ? sensors.value         : null;
  const b   = bim.status === "fulfilled"             ? bim.value             : null;
  const ps  = projectSnapshot.status === "fulfilled" ? projectSnapshot.value : null;

  return {
    ...ctx,

    // Timesheet overrides
    workHours:          ts?.hoursToday          ?? ctx.workHours,
    workersAvailable:   ts?.workersOnSite        ?? ctx.workersAvailable,
    hoursSinceRest:     ts?.hoursSinceBreak      ?? ctx.hoursSinceRest,

    // BIM overrides
    height:             b?.maxWorkHeight         ?? ctx.height,
    safetyBarrier:      b?.safetyBarrierInstalled ?? ctx.safetyBarrier,

    // Sensor overrides
    temperature:        sen?.temperature         ?? ctx.temperature,
    windSpeed:          sen?.windSpeed           ?? ctx.windSpeed,
    visibility:         sen?.visibility          ?? ctx.visibility,

    // Project snapshot
    budgetRemaining:    ps?.budget_remaining     ?? ctx.budgetRemaining,
    daysRemaining:      ps?.days_remaining       ?? ctx.daysRemaining,

    // Track data sources for audit
    _dataSources: {
      timesheet: ts ? "live" : "default",
      sensors:   sen ? "live" : "default",
      bim:       b ? "live" : "default",
      project:   ps ? "live" : "default",
    }
  };
}

// ── DATA FETCHERS ─────────────────────────────────────────────

async function fetchTimesheet(url, projectId) {
  if (!url) return null;
  const res = await fetch(`${url}/project/${projectId}`, {
    headers: { "Authorization": `Bearer ${process.env.TIMESHEET_API_KEY}` },
    signal: AbortSignal.timeout(2000)
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchSensors(url, projectId) {
  if (!url) return null;
  const res = await fetch(`${url}/site/${projectId}`, {
    headers: { "Authorization": `Bearer ${process.env.SENSOR_API_KEY}` },
    signal: AbortSignal.timeout(2000)
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchBIM(url, projectId) {
  if (!url) return null;
  const res = await fetch(`${url}/model/${projectId}`, {
    headers: { "Authorization": `Bearer ${process.env.BIM_API_KEY}` },
    signal: AbortSignal.timeout(3000)
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchProjectSnapshot(supabase, projectId) {
  if (!supabase || !projectId) return null;
  const { data, error } = await supabase
    .from("projects")
    .select("budget_remaining, days_remaining, status, complexity")
    .eq("id", projectId)
    .single();
  if (error) return null;
  return data;
}
