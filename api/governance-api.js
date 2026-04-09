/**
 * EXECUTIA™ — /api/governance-api.js
 * Enterprise-grade governance API. All security fixes applied.
 */
import { createClient } from "@supabase/supabase-js";
import { requireApiKey } from "../core/api/auth.js";
import { logEvent } from "../core/monitoring/monitor.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function safeLog(event, payload) {
  try { await logEvent(event, payload); }
  catch (e) { console.warn("[EXECUTIA] log failed:", e.message); }
}

async function safeInsert(table, row) {
  try { await supabase.from(table).insert(row); }
  catch (e) { console.warn(`[EXECUTIA] ${table} insert failed:`, e.message); }
}

function sanitizeRuleUpdate(new_rule) {
  return {
    condition_json: new_rule.condition_json ?? null,
    action_json:    new_rule.action_json    ?? null,
    priority:       new_rule.priority       ?? null,
    active:         new_rule.active         ?? false,
    updated_at:     new Date().toISOString(),
  };
}

function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, ...data });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-org-id, x-user-id");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireApiKey(req, res)) return;

  const orgId  = req.headers["x-org-id"]  || null;
  const userId = req.headers["x-user-id"] || "api";
  const action = req.query.action || req.body?.action;

  try {
    switch (action) {

      case "stats": {
        let q = supabase.from("governance_dashboard").select("*");
        if (orgId) q = q.eq("organization_id", orgId);
        const { data, error } = await q.single();
        if (error) throw error;
        return ok(res, { data: data || {} });
      }

      case "proposals": {
        let q = supabase
          .from("proposed_rules")
          .select(`
            id, reason, confidence, expected_improvement, new_rule, created_at,
            execution_rules!inner (rule_key, label, event_type, organization_id)
          `)
          .eq("approved", false)
          .eq("rejected", false)
          .order("confidence", { ascending: false });
        if (orgId) {
          q = q.eq("organization_id", orgId)
               .eq("execution_rules.organization_id", orgId);
        }
        const { data, error } = await q;
        if (error) throw error;
        return ok(res, { proposals: data || [] });
      }

      case "approve": {
        const { proposalId } = req.body;
        if (!proposalId) return res.status(400).json({ error: "proposalId required" });

        let pq = supabase.from("proposed_rules").select("*").eq("id", proposalId);
        if (orgId) pq = pq.eq("organization_id", orgId);
        const { data: proposal, error: fetchErr } = await pq.single();
        if (fetchErr || !proposal) return res.status(404).json({ error: "Proposal not found" });

        const safeUpdate = sanitizeRuleUpdate(proposal.new_rule);
        let uq = supabase.from("execution_rules").update(safeUpdate).eq("id", proposal.original_rule_id);
        if (orgId) uq = uq.eq("organization_id", orgId);
        const { error: updateErr } = await uq;
        if (updateErr) throw updateErr;

        await supabase.from("proposed_rules").update({
          approved: true, approved_by: userId, approved_at: new Date().toISOString(),
        }).eq("id", proposalId);

        await safeInsert("rule_history", {
          rule_id: proposal.original_rule_id, change: proposal.new_rule,
          source: "ai_approved", approved_by: userId, created_at: new Date().toISOString(),
        });

        await safeLog("governance:approve", { proposalId, userId });
        return ok(res, { applied: proposalId });
      }

      case "reject": {
        const { proposalId, reason } = req.body;
        if (!proposalId) return res.status(400).json({ error: "proposalId required" });
        let rq = supabase.from("proposed_rules")
          .update({ rejected: true, rejection_reason: reason || "Manually rejected", rejected_by: userId })
          .eq("id", proposalId);
        if (orgId) rq = rq.eq("organization_id", orgId);
        await rq;
        await safeLog("governance:reject", { proposalId, reason, userId });
        return ok(res, { rejected: proposalId });
      }

      case "rules": {
        let q = supabase
          .from("execution_rules")
          .select("id, rule_key, label, event_type, priority, active, condition_json, action_json, created_at")
          .order("priority", { ascending: true });
        if (orgId) q = q.eq("organization_id", orgId);
        const { data, error } = await q;
        if (error) throw error;
        return ok(res, { rules: data || [] });
      }

      case "toggle-rule": {
        const { ruleId, active } = req.body;
        if (ruleId === undefined) return res.status(400).json({ error: "ruleId required" });
        let q = supabase.from("execution_rules")
          .update({ active, updated_at: new Date().toISOString() }).eq("id", ruleId);
        if (orgId) q = q.eq("organization_id", orgId);
        const { error } = await q;
        if (error) throw error;
        await safeLog("governance:toggle", { ruleId, active, userId });
        return ok(res, { ruleId, active });
      }

      case "save-rule": {
        const rule = req.body.rule;
        if (!rule) return res.status(400).json({ error: "rule required" });
        if (
          !rule.event_type ||
          typeof rule.event_type !== "string" ||
          !rule.action_json ||
          typeof rule.action_json !== "object"
        ) {
          return res.status(400).json({ error: "Invalid rule: event_type (string) and action_json (object) required" });
        }
        const { data, error } = await supabase
          .from("execution_rules")
          .insert({ ...rule, organization_id: orgId || null, active: false, created_by: userId })
          .select("id, rule_key").single();
        if (error) throw error;
        return ok(res, { rule: data }, 201);
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    await safeLog("governance:error", { action, error: err.message });
    console.error("[EXECUTIA] governance error:", err);
    return res.status(500).json({ error: err.message });
  }
}
