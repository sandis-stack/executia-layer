/**
 * EXECUTIA™ — /core/engine/conflictResolver.js
 * Resolves conflicts when multiple rules modify the same task.
 *
 * Priority order:
 *   1. LAW (compliance blocks — highest authority)
 *   2. RISK (highest risk score wins)
 *   3. STRATEGY (TIME / COST / RISK / LEGAL / CASHFLOW)
 */

export function resolveConflicts(tasks, rulesApplied, ctx, strategy = "TIME") {
  // Group task versions by task ID
  const conflicts = {};

  for (const rule of rulesApplied) {
    for (const task of (rule.tasks || [])) {
      if (!conflicts[task.id]) conflicts[task.id] = [];
      conflicts[task.id].push({ ...task, _ruleId: rule.ruleId });
    }
  }

  const resolved = [];

  for (const taskId in conflicts) {
    const versions = conflicts[taskId];

    // No conflict — single version wins
    if (versions.length === 1) {
      resolved.push(versions[0]);
      continue;
    }

    let selected = null;

    // PRIORITY 1: LAW — compliance block always wins
    const legalBlock = versions.find(v => v.compliance?.blocksTask === true);
    if (legalBlock) {
      selected = legalBlock;
    }

    // PRIORITY 2: RISK — highest risk score
    if (!selected) {
      const byRisk = [...versions].sort((a, b) =>
        (b.riskScore || 0) - (a.riskScore || 0)
      );
      if (byRisk[0].riskScore > 0) {
        selected = byRisk[0];
      }
    }

    // PRIORITY 3: STRATEGY
    if (!selected) {
      switch (strategy) {
        case "TIME":
          // Prefer do_now — maximize throughput
          selected = versions.find(v => v.status === "do_now") || versions[0];
          break;

        case "COST":
          // Prefer lowest cost impact
          selected = [...versions].sort((a, b) => (a.cost || 0) - (b.cost || 0))[0];
          break;

        case "RISK":
          // Prefer blocked — conservative
          selected = versions.find(v => v.status === "blocked") ||
                     [...versions].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0];
          break;

        case "LEGAL":
          // Always go with most restrictive
          selected = versions.find(v => v.status === "blocked") || versions[0];
          break;

        case "CASHFLOW":
          // Prefer tasks with highest money impact
          selected = [...versions].sort((a, b) => (b.moneyImpact || 0) - (a.moneyImpact || 0))[0];
          break;

        default:
          selected = versions[0];
      }
    }

    resolved.push(selected);
  }

  // Include tasks not touched by any rule conflict
  const resolvedIds = new Set(resolved.map(t => t.id));
  const untouched = tasks.filter(t => !resolvedIds.has(t.id));

  return [...untouched, ...resolved];
}
