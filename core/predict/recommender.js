/**
 * EXECUTIA™ — /core/predict/recommender.js
 * Converts predictions into specific, actionable recommendations.
 *
 * Pure function — no AI calls, no DB. Fast and deterministic.
 * Priority order: LEGAL → SAFETY → CRITICAL_PATH → COST → EFFICIENCY
 */

/**
 * Generate prioritized action list from prediction + context.
 * @param {object} prediction  - Output from predictEngine.js
 * @param {object} features    - Feature vector from featureBuilder.js
 * @param {object} tasks       - Current task board
 * @returns {Array}            - Sorted action recommendations
 */
export function suggestActions(prediction, features, tasks = []) {
  const actions = [];

  // ── 1. SAFETY / LEGAL (highest priority) ───────────────────
  if (prediction.compliance_breach_risk === "HIGH") {
    actions.push({
      priority:  "CRITICAL",
      category:  "COMPLIANCE",
      action:    "Stop work — compliance breach imminent",
      detail:    `${features.complianceRate}% of recent events had compliance failures`,
      urgency:   "immediate",
      impact:    "Prevents fines and legal exposure",
    });
  }

  if (!features.safetyBarrier && features.height > 2) {
    actions.push({
      priority:  "CRITICAL",
      category:  "SAFETY",
      action:    "Install safety barrier before resuming work",
      detail:    `Work at ${features.height}m without protection — TEK17 §12-14 violation`,
      urgency:   "immediate",
      impact:    "Prevents €5,000+ fine and injury risk",
    });
  }

  // ── 2. HIGH DELAY RISK ──────────────────────────────────────
  if (prediction.delay_risk === "HIGH" && prediction.delay_days > 0) {
    actions.push({
      priority:  "HIGH",
      category:  "SCHEDULE",
      action:    `Expect ${prediction.delay_days}-day delay — act now`,
      detail:    `Delay probability: ${Math.round(prediction.delay_probability * 100)}%`,
      urgency:   "today",
      impact:    `Prevents ~€${(prediction.delay_days * 120).toLocaleString()} idle cost`,
    });

    if (features.workersAvailable < 2) {
      actions.push({
        priority:  "HIGH",
        category:  "WORKFORCE",
        action:    "Assign additional crew immediately",
        detail:    `Only ${features.workersAvailable} worker(s) available — critical tasks stalled`,
        urgency:   "today",
        impact:    "Restores execution velocity",
      });
    }
  }

  // ── 3. BLOCKED TASKS ────────────────────────────────────────
  if (features.blockedTasks > 0) {
    const blockedList = tasks
      .filter(t => t.status === "blocked")
      .map(t => t.title)
      .join(", ");

    actions.push({
      priority:  "HIGH",
      category:  "CRITICAL_PATH",
      action:    `Unblock ${features.blockedTasks} task(s): ${blockedList || "see board"}`,
      detail:    "Blocked tasks halt downstream work — every hour costs money",
      urgency:   "today",
      impact:    "Restores workflow",
    });
  }

  // ── 4. COST OVERRUN ─────────────────────────────────────────
  if (prediction.cost_overrun > 1000) {
    actions.push({
      priority:  "MEDIUM",
      category:  "COST",
      action:    "Switch to COST strategy to limit overrun",
      detail:    `Forecast overrun: €${prediction.cost_overrun.toLocaleString()} (range: €${prediction.cost_overrun_range?.low?.toLocaleString()}–€${prediction.cost_overrun_range?.high?.toLocaleString()})`,
      urgency:   "this_week",
      impact:    `Could save €${Math.round(prediction.cost_overrun * 0.3).toLocaleString()}`,
    });
  }

  // ── 5. CRITICAL WINDOW ──────────────────────────────────────
  if (prediction.critical_window !== null && prediction.critical_window <= 5) {
    actions.push({
      priority:  "HIGH",
      category:  "TIMELINE",
      action:    `Critical window in ${prediction.critical_window} day(s) — escalate now`,
      detail:    `${features.criticalTasks} P1 task(s) unresolved`,
      urgency:   "today",
      impact:    "Prevents SLA breach",
    });
  }

  // ── 6. EFFICIENCY ───────────────────────────────────────────
  if (features.waitingTasks > 1 && features.workersAvailable > 0) {
    actions.push({
      priority:  "MEDIUM",
      category:  "EFFICIENCY",
      action:    `Assign workers to ${features.waitingTasks} waiting task(s)`,
      detail:    "Idle workforce detected — resources not utilized",
      urgency:   "this_week",
      impact:    `€${(features.workersAvailable * features.workHours * 45).toLocaleString()} idle cost avoided`,
    });
  }

  // ── 7. POSITIVE SIGNAL ──────────────────────────────────────
  if (actions.length === 0) {
    actions.push({
      priority:  "INFO",
      category:  "STATUS",
      action:    "Execution on track — maintain current pace",
      detail:    prediction.basis || "No critical signals detected",
      urgency:   "monitor",
      impact:    "Continue monitoring for emerging risks",
    });
  }

  // Sort: CRITICAL → HIGH → MEDIUM → INFO
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 };
  return actions.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
}
