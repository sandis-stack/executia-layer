/**
 * EXECUTIA™ — /api/predict.js
 * Project outcome prediction endpoint.
 *
 * POST /api/predict
 * Body: {
 *   projectId: string,          // required
 *   tasks?: Array,              // current task board (optional, fetched from DB if omitted)
 *   contextOverrides?: object,  // optional context additions
 *   forceAI?: boolean           // force AI even for LOW risk (default: false)
 * }
 *
 * Response: {
 *   prediction: { delay_risk, delay_days, cost_overrun, ... },
 *   actions:    [{ priority, category, action, detail, urgency, impact }],
 *   features:   { ... },  // feature vector used
 *   source:     "ai" | "rule_based"
 * }
 */

import { createClient }      from "@supabase/supabase-js";
import { buildFeatures }     from "../core/predict/featureBuilder.js";
import { predictOutcome }    from "../core/predict/predictEngine.js";
import { suggestActions }    from "../core/predict/recommender.js";
import { requireApiKey, checkRateLimit } from "../core/api/auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireApiKey(req, res))   return;
  if (!checkRateLimit(req, res))  return;

  const {
    projectId,
    tasks:         clientTasks,
    contextOverrides = {},
    forceAI = false,
  } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: "projectId required" });
  }

  try {
    // 1. Load recent events from DB
    const { data: events, error: evErr } = await supabase
      .from("events")
      .select("id, event_type, decision, risk, money, compliance, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (evErr) throw new Error(`Events fetch failed: ${evErr.message}`);

    // 2. Load tasks (client-provided or from DB)
    let tasks = clientTasks;
    if (!tasks) {
      const { data: dbTasks, error: taskErr } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId);

      if (taskErr) throw new Error(`Tasks fetch failed: ${taskErr.message}`);
      tasks = dbTasks || [];
    }

    // 3. Load project context
    const { data: project } = await supabase
      .from("projects")
      .select("budget, budget_remaining, timeline_months, complexity, status")
      .eq("id", projectId)
      .single();

    // 4. Build context
    const ctx = {
      workersAvailable:   contextOverrides.workersAvailable   ?? 3,
      workHours:          contextOverrides.workHours          ?? 8,
      ppeVerified:        contextOverrides.ppeVerified        ?? true,
      safetyBarrier:      contextOverrides.safetyBarrier      ?? true,
      height:             contextOverrides.height             ?? 0,
      daysRemaining:      contextOverrides.daysRemaining      ?? null,
      budgetRemaining:    project?.budget_remaining           ?? contextOverrides.budgetRemaining ?? null,
      complexity:         project?.complexity                 ?? 3,
      ...contextOverrides,
    };

    // 5. Build features
    const features = buildFeatures(ctx, tasks, events || []);

    // 6. Predict
    const prediction = await predictOutcome(features, { forceAI });

    // 7. Recommend actions
    const actions = suggestActions(prediction, features, tasks);

    // 8. Store prediction in DB for learning loop
    await supabase.from("kpi").upsert({
      project_id:         projectId,
      last_prediction:    prediction,
      last_predicted_at:  new Date().toISOString(),
      predicted_delay_days: prediction.delay_days,
      predicted_cost_overrun: prediction.cost_overrun,
    }, { onConflict: "project_id" }).select();

    return res.status(200).json({
      ok: true,
      prediction,
      actions,
      features,
      source: prediction.source,
      eventsAnalyzed: (events || []).length,
      tasksAnalyzed:  tasks.length,
    });

  } catch (err) {
    console.error("[EXECUTIA] predict error:", err);
    return res.status(500).json({ error: err.message });
  }
}
