/**
 * EXECUTIA™ — /core/rules/ruleEngine.js
 * Applies DB-driven execution rules to task board.
 *
 * Replaces hardcoded RULES = { ... } in execute-event.js
 * Rules are loaded from Supabase execution_rules table.
 *
 * Action JSON structure:
 * {
 *   "updates": [{ "match": { "id": 1 }, "set": { "status": "blocked" } }],
 *   "create":  [{ "title": "New Task", "status": "do_now", "priority": "P1" }],
 *   "remove":  [{ "match": { "id": 99 } }]
 * }
 */

import { evaluateCondition } from "../lib/executia-condition-engine-v2.js";

/**
 * Apply all active rules to current task board.
 * Rules are already filtered by eventType and sorted by priority.
 *
 * @param {Array}  tasks      - Current task board
 * @param {Array}  rules      - Loaded from DB (execution_rules rows)
 * @param {object} ctx        - Project context
 * @param {string} sessionId  - For deterministic task IDs
 * @returns {{ tasks: Array, rulesApplied: Array }}
 */
// ── DETERMINISTIC HASH (no crypto needed) ────────────────────
function simpleHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(36);
}

export function applyExecutionRules(tasks, rules, ctx, sessionId) {
  let current = [...tasks];
  const rulesApplied = [];

  for (const rule of rules) {
    if (!rule.active) continue;

    // 1. Evaluate condition (skip rule if condition fails)
    if (rule.condition_json) {
      try {
        const conditionMet = evaluateCondition(rule.condition_json, ctx);
        if (!conditionMet) continue;
      } catch (err) {
        console.warn(`[EXECUTIA] Rule ${rule.rule_key} condition error:`, err.message);
        continue;
      }
    }

    const action      = rule.action_json;
    const tasksBefore = [...current];

    // 2. Apply updates
    if (action.updates) {
      current = current.map(task => {
        for (const update of action.updates) {
          const matches = Object.entries(update.match).every(
            ([key, val]) => task[key] === val
          );
          if (matches) {
            return { ...task, ...update.set };
          }
        }
        return task;
      });
    }

    // 3. Create new tasks (deterministic IDs — hash of rule + title, not sessionId)
    if (action.create) {
      for (const spec of action.create) {
        const slug = spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        // Deterministic: same rule + same title = same ID always
        const id   = `task_${simpleHash(rule.rule_key + "_" + slug)}`;

        // Skip if task with this ID already exists (idempotent)
        if (!current.find(t => t.id === id)) {
          current.push({ id, ...spec });
        }
      }
    }

    // 4. Remove tasks
    if (action.remove) {
      for (const spec of action.remove) {
        current = current.filter(task =>
          !Object.entries(spec.match).every(([k, v]) => task[k] === v)
        );
      }
    }

    // 5. Track which rules were applied and what changed
    const diff = buildTaskDiff(tasksBefore, current);
    if (diff.length > 0) {
      // Only pass tasks actually changed by this rule (not entire board)
      // This allows conflictResolver to correctly detect per-task conflicts
      const affectedIds  = new Set([
        ...current.filter((t, i) => {
          const before = tasksBefore.find(b => b.id === t.id);
          return !before || JSON.stringify(before) !== JSON.stringify(t);
        }).map(t => t.id),
        ...current.filter(t => !tasksBefore.find(b => b.id === t.id)).map(t => t.id),
      ]);

      rulesApplied.push({
        ruleId:   rule.rule_key,
        priority: rule.priority,
        tasks:    current.filter(t => affectedIds.has(t.id)),
        diff,
      });
    }
  }

  return { tasks: current, rulesApplied };
}

/**
 * Build human-readable diff between two task boards.
 */
function buildTaskDiff(before, after) {
  const diff = [];

  // Modified tasks
  for (const a of after) {
    const b = before.find(t => t.id === a.id);
    if (!b) {
      diff.push(`+ ${a.title} [${a.status}]`);
    } else if (b.status !== a.status) {
      diff.push(`${a.title}: ${b.status} → ${a.status}`);
    }
  }

  // Removed tasks
  for (const b of before) {
    if (!after.find(t => t.id === b.id)) {
      diff.push(`- ${b.title} [removed]`);
    }
  }

  return diff;
}
