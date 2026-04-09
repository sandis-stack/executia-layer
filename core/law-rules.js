/**
 * EXECUTIA™ — /api/law-rules
 * Serves active law rules from Supabase for a given country.
 * Frontend caches per session — no LAW_DB hardcode needed.
 *
 * GET /api/law-rules?country=NO
 *
 * Response: { NO: [ { rule_key, law_name, message, action, severity, fine_eur, blocks_task } ] }
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=300"); // 5min cache — rules don't change often

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")     return res.status(405).json({ error: "Method not allowed" });

  const country = req.query.country || "NO";
  const today   = new Date().toISOString().slice(0, 10);

  try {
    const { data, error } = await supabase
      .from("law_rules")
      .select(`
        id, rule_key, condition_json, action, severity, message, fine_eur, blocks_task,
        laws ( name, country_code, valid_to )
      `)
      .eq("laws.country_code", country)
      .or(`laws.valid_to.is.null,laws.valid_to.gte.${today}`);

    if (error) throw error;

    const rules = (data || []).map(r => ({
      rule_key:   r.rule_key,
      law_name:   r.laws?.name,
      country_code: r.laws?.country_code,
      condition_json: r.condition_json,
      action:     r.action,
      severity:   r.severity,
      message:    r.message,
      fine_eur:   r.fine_eur,
      blocks_task: r.blocks_task,
    }));

    return res.status(200).json({ [country]: rules });

  } catch (err) {
    console.error("[EXECUTIA] law-rules error:", err);
    return res.status(500).json({ error: "Failed to fetch law rules" });
  }
}
