/**
 * EXECUTIA™ — /api/get-ledger.js
 * Fetch ledger entries for a session from Supabase.
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, limit = "50" } = req.query;
  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit, 10));

    if (error) throw error;
    return res.status(200).json({ entries: data || [], count: data?.length || 0 });
  } catch (err) {
    console.error("[EXECUTIA] get-ledger error:", err);
    return res.status(500).json({ error: "Failed to fetch ledger" });
  }
}
