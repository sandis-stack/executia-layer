/**
 * EXECUTIA™ — /api/log-event.js
 * Write ledger entry to Supabase.
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, event, detail, rule, tasksBefore, tasksAfter, scenarioId } = req.body;
  if (!sessionId || !event) return res.status(400).json({ error: "sessionId and event required" });

  try {
    const { data, error } = await supabase
      .from("events")
      .insert({
        session_id:   sessionId,
        event_type:   event,
        detail:       detail || "",
        rule_applied: rule || "",
        scenario_id:  scenarioId || null,
        tasks_before: tasksBefore || [],
        tasks_after:  tasksAfter || [],
        created_at:   new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return res.status(200).json({ ok: true, entryId: data.id });
  } catch (err) {
    console.error("[EXECUTIA] log-event error:", err);
    return res.status(500).json({ error: "Failed to write ledger entry" });
  }
}
