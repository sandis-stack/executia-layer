/**
 * EXECUTIA™ — /core/predict/featureBuilder.js
 * Extracts quantitative features from project state for prediction.
 *
 * Features feed into predictEngine.js for AI outcome forecasting.
 * Pure functions — no side effects, no DB calls.
 */

/**
 * Build feature vector from current project state.
 * @param {object} ctx     - Project context (from buildProjectContext)
 * @param {Array}  tasks   - Current task board
 * @param {Array}  events  - Recent events from DB
 * @returns {object}       - Feature vector for AI prediction
 */
export function buildFeatures(ctx, tasks, events) {
  const now = Date.now();

  // ── TASK FEATURES ───────────────────────────────────────────
  const blockedTasks   = tasks.filter(t => t.status === "blocked").length;
  const criticalTasks  = tasks.filter(t => t.priority === "P1").length;
  const waitingTasks   = tasks.filter(t => t.status === "waiting").length;
  const activeTasks    = tasks.filter(t => t.status === "do_now").length;
  const doneTasks      = tasks.filter(t => t.status === "done").length;
  const totalTasks     = tasks.length || 1;
  const progressPct    = Math.round((doneTasks / totalTasks) * 100);

  // ── EVENT FEATURES ──────────────────────────────────────────
  const recentEvents   = events.slice(0, 20); // last 20 events
  const delayEvents    = events.filter(e => e.event_type === "delay_detected");
  const blockedEvents  = events.filter(e => e.decision?.status === "BLOCKED");
  const highRiskEvents = events.filter(e => e.risk?.level === "HIGH");

  const avgMoneyImpact = avg(events.map(e => e.money?.impact || 0));
  const totalNegImpact = events
    .map(e => e.money?.impact || 0)
    .filter(v => v < 0)
    .reduce((a, b) => a + b, 0);

  // Trend: are things getting better or worse?
  const firstHalf  = events.slice(Math.floor(events.length / 2));
  const secondHalf = events.slice(0, Math.floor(events.length / 2));
  const trend = avg(secondHalf.map(e => e.money?.impact || 0)) -
                avg(firstHalf.map(e => e.money?.impact || 0));

  // Compliance failure rate
  const complianceFailures = events.filter(e => e.compliance?.allowed === false).length;
  const complianceRate     = events.length > 0
    ? Math.round((complianceFailures / events.length) * 100)
    : 0;

  // Velocity: events per day (last 7 days)
  const sevenDaysAgo  = now - 7 * 24 * 60 * 60 * 1000;
  const recentCount   = events.filter(e =>
    new Date(e.created_at).getTime() > sevenDaysAgo
  ).length;
  const eventVelocity = Math.round(recentCount / 7 * 10) / 10; // events/day

  // ── CONTEXT FEATURES ────────────────────────────────────────
  return {
    // Task board
    blockedTasks,
    criticalTasks,
    waitingTasks,
    activeTasks,
    doneTasks,
    totalTasks,
    progressPct,
    blockageRate:   Math.round((blockedTasks / totalTasks) * 100),

    // Workforce
    workersAvailable:   ctx.workersAvailable  ?? 0,
    workHours:          ctx.workHours         ?? 8,
    ppeVerified:        ctx.ppeVerified       ?? true,

    // Financial
    budgetRemaining:    ctx.budgetRemaining   ?? null,
    avgMoneyImpact:     Math.round(avgMoneyImpact),
    totalNegImpact:     Math.round(totalNegImpact),
    moneyTrend:         trend > 0 ? "improving" : trend < 0 ? "deteriorating" : "stable",

    // Time
    daysRemaining:      ctx.daysRemaining     ?? null,
    complexity:         ctx.complexity        ?? 3,

    // Risk history
    delayCount:         delayEvents.length,
    blockCount:         blockedEvents.length,
    highRiskCount:      highRiskEvents.length,
    complianceFailures,
    complianceRate,

    // Velocity
    eventVelocity,
    totalEventsAnalyzed: events.length,

    // Site conditions
    height:             ctx.height            ?? 0,
    safetyBarrier:      ctx.safetyBarrier     ?? true,
  };
}

/**
 * Lightweight rule-based pre-screening before AI call.
 * Returns quick risk signals without AI cost.
 */
export function quickRiskScreen(features) {
  const signals = [];
  let riskScore = 0;

  if (features.blockageRate > 30) { signals.push("High blockage rate"); riskScore += 30; }
  if (features.delayCount > 2)    { signals.push("Repeated delays");    riskScore += 20; }
  if (features.complianceRate > 20){ signals.push("Compliance issues"); riskScore += 25; }
  if (features.highRiskCount > 3) { signals.push("Multiple high-risk events"); riskScore += 15; }
  if (features.workersAvailable === 0) { signals.push("No workforce");  riskScore += 20; }
  if (features.moneyTrend === "deteriorating") { signals.push("Negative money trend"); riskScore += 10; }

  return {
    riskScore: Math.min(riskScore, 100),
    level:     riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW",
    signals,
    requiresAI: riskScore >= 30, // only call AI for meaningful risk
  };
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
