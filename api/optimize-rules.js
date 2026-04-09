/**
 * EXECUTIA™ — /api/optimize-rules.js
 * Triggers AI rule analysis for a project.
 *
 * POST /api/optimize-rules
 * Body: { projectId: "P-001" }
 *
 * POST /api/optimize-rules/apply
 * Body: { proposalId: 5 }  // apply a human-approved proposal
 */

import { createClient }        from "@supabase/supabase-js";
import { analyzeAndPropose, applyApprovedProposal } from "../core/learning/ruleOptimizer.js";
import { requireApiKey }        from "../core/api/auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireApiKey(req, res)) return;

  const { projectId, action, proposalId } = req.body;

  // Apply an approved proposal
  if (action === "apply") {
    if (!proposalId) {
      return res.status(400).json({ error: "proposalId required" });
    }
    try {
      const result = await applyApprovedProposal(supabase, proposalId);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Analyze and propose improvements
  try {
    const result = await analyzeAndPropose(supabase, projectId || null);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error("[EXECUTIA] optimize-rules error:", err);
    return res.status(500).json({ error: err.message });
  }
}
