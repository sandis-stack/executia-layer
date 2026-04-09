/**
 * EXECUTIA™ — /api/governance.js
 * Backend for governance.html UI.
 *
 * Routes (Vercel rewrites or query param ?action=):
 *   GET  /api/governance?action=stats        → dashboard stats
 *   GET  /api/governance?action=proposals    → pending proposals
 *   POST /api/governance?action=approve      → approve proposal
 *   POST /api/governance?action=reject       → reject proposal
 *   GET  /api/governance?action=rules        → list active rules
 *   POST /api/governance?action=toggle-rule  → enable/disable rule
 */

import { createClient } from "@supabase/supabase-js";
import { withAuth, scopeToTenant } from "../core/api/middleware.js";
import { monitor } from "../core/monitoring/monitor.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default withAuth(async (req, res, tenant) => {
  const m      = monitor.start("governance");
  const action = req.query.action || req.body?.action;

  try {
    switch (action) {

      // ── DASHBOARD STATS ──────────────────────────────────────
      case "stats": {
        const { data } = await supabase
          .from("governance_dashboard")
          .select("*")
          .single();

        await m.end({ action, status: "ok" });
        return res.status(200).json(data || {});
      }

      // ── PROPOSALS ────────────────────────────────────────────
      case "proposals": {
        let q = supabase
          .from("proposed_rules")
          .select(`
            id, reason, confidence, expected_improvement, new_rule, created_at,
            execution_rules!original_rule_id (rule_key, label, event_type)
          `)
          .eq("approved", false)
          .eq("rejected", false)
          .order("confidence", { ascending: false });

        if (tenant?.orgId) q = q.eq("organization_id", tenant.orgId);

        const { data, error } = await q;
        if (error) throw error;

        const proposals = (data || []).map(p => ({
          id:                   p.id,
          rule_key:             p.execution_rules?.rule_key,
          label:                p.execution_rules?.label,
          event_type:           p.execution_rules?.event_type,
          reason:               p.reason,
          confidence:           p.confidence,
          expected_improvement: p.expected_improvement,
          new_rule:             p.new_rule,
          created_at:           p.created_at,
        }));

        await m.end({ action, status: "ok" });
        return res.status(200).json({ proposals });
      }

      // ── APPROVE PROPOSAL ─────────────────────────────────────
      case "approve": {
        const { proposalId } = req.body;
        if (!proposalId) return res.status(400).json({ error: "proposalId required" });

        // Fetch proposal
        const { data: proposal, error: fetchErr } = await supabase
          .from("proposed_rules")
          .select("*")
          .eq("id", proposalId)
          .single();

        if (fetchErr || !proposal) return res.status(404).json({ error: "Proposal not found" });

        // Apply changes to execution_rules
        const { error: updateErr } = await supabase
          .from("execution_rules")
          .update({ ...proposal.new_rule, updated_at: new Date().toISOString() })
          .eq("id", proposal.original_rule_id);

        if (updateErr) throw updateErr;

        // Mark as approved
        await supabase
          .from("proposed_rules")
          .update({ approved: true, approved_by: tenant?.sessionId || "admin", approved_at: new Date().toISOString() })
          .eq("id", proposalId);

        await m.end({ action, status: "ok" });
        return res.status(200).json({ ok: true, applied: proposalId });
      }

      // ── REJECT PROPOSAL ──────────────────────────────────────
      case "reject": {
        const { proposalId, reason } = req.body;
        if (!proposalId) return res.status(400).json({ error: "proposalId required" });

        await supabase
          .from("proposed_rules")
          .update({ rejected: true, rejection_reason: reason || "Manually rejected" })
          .eq("id", proposalId);

        await m.end({ action, status: "ok" });
        return res.status(200).json({ ok: true, rejected: proposalId });
      }

      // ── LIST RULES ───────────────────────────────────────────
      case "rules": {
        let q = supabase
          .from("execution_rules")
          .select("id, rule_key, label, event_type, priority, active, condition_json, action_json, created_at")
          .order("priority", { ascending: true });

        if (tenant?.orgId) q = q.eq("organization_id", tenant.orgId);

        const { data, error } = await q;
        if (error) throw error;

        await m.end({ action, status: "ok" });
        return res.status(200).json({ rules: data || [] });
      }

      // ── TOGGLE RULE ──────────────────────────────────────────
      case "toggle-rule": {
        const { ruleId, active } = req.body;
        if (ruleId === undefined) return res.status(400).json({ error: "ruleId required" });

        const { error } = await supabase
          .from("execution_rules")
          .update({ active, updated_at: new Date().toISOString() })
          .eq("id", ruleId);

        if (error) throw error;

        await m.end({ action, status: "ok" });
        return res.status(200).json({ ok: true, ruleId, active });
      }

      // ── SAVE GENERATED RULE ──────────────────────────────────
      case "save-rule": {
        const rule = req.body.rule;
        if (!rule) return res.status(400).json({ error: "rule required" });

        const { data, error } = await supabase
          .from("execution_rules")
          .insert({
            ...rule,
            organization_id: tenant?.orgId || null,
            active:          false,          // always inactive until reviewed
            created_by:      "ai_generator",
          })
          .select("id, rule_key")
          .single();

        if (error) throw error;

        await m.end({ action, status: "ok" });
        return res.status(201).json({ ok: true, rule: data });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    await m.error(err, { action });
    console.error("[EXECUTIA] governance error:", err);
    return res.status(err.status || 500).json({ error: err.message });
  }

}, { methods: ["GET", "POST", "PATCH"] });
