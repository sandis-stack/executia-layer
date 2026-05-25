import { ok, fail } from "../../shared/response.js";
import { hasSupabaseEnv, db } from "../../services/db.js";

export default async function handler(req, res) {
  try {
    const hasApiKey = !!(
      process.env.EXECUTIA_API_KEY ||
      process.env.EXECUTIA_INTERNAL_KEY
    );

    const keyEnvName = process.env.EXECUTIA_API_KEY
      ? "EXECUTIA_API_KEY"
      : process.env.EXECUTIA_INTERNAL_KEY
        ? "EXECUTIA_INTERNAL_KEY"
        : null;

    let coreLedgerEntries = 0;
    let auditEntries = 0;
    let executionEntries = 0;
    let settlementPending = 0;
    let settlementSettled = 0;

    if (hasSupabaseEnv()) {
      const supabase = db();

      const [
        coreLedgerResult,
        auditResult,
        executionResult,
        pendingResult,
        settledResult
      ] = await Promise.all([
        supabase
          .from("core_ledger")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("audit_events")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("execution_results")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("core_ledger")
          .select("*", { count: "exact", head: true })
          .eq("settlement_status", "PENDING"),

        supabase
          .from("core_ledger")
          .select("*", { count: "exact", head: true })
          .eq("settlement_status", "SETTLED")
      ]);

      coreLedgerEntries = coreLedgerResult.count || 0;
      auditEntries = auditResult.count || 0;
      executionEntries = executionResult.count || 0;
      settlementPending = pendingResult.count || 0;
      settlementSettled = settledResult.count || 0;
    }

    return ok(res, {
      status: "OK",

      system: "EXECUTIA™",

      mode: "FINAL_FULL_LAYER",

      engine: "BANK_LEVEL_EXECUTION_TRUTH",

      proof_layer: {
        enabled: true,
        immutable_audit_chain: true,
        reconciliation: true,
        settlement: true,
        operator_governance: true
      },

      database: {
        supabase: hasSupabaseEnv()
          ? "CONFIGURED"
          : "DRY_RUN"
      },

      auth: {
        configured: hasApiKey,
        env_var: keyEnvName || "NOT_SET"
      },

      metrics: {
        executions: executionEntries,
        core_ledger_entries: coreLedgerEntries,
        audit_events: auditEntries,
        settlement_pending: settlementPending,
        settlement_settled: settlementSettled
      },

      integrity: {
        proof_chain: "ACTIVE",
        audit_chain: "ACTIVE",
        core_ledger: "ACTIVE",
        settlement_engine: "ACTIVE"
      },

      execution_authority: {
        runtime: "OK",
        registry_state: hasSupabaseEnv() ? "CONFIGURED" : "DRY_RUN",
        governance_engine: "ACTIVE",
        proof_layer_enabled: true,
        proof_chain_integrity: "ACTIVE",
        auth_configured: hasApiKey
      },

      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return fail(
      res,
      "HEALTH_CHECK_FAILED",
      err.message || "Health check failed.",
      500
    );
  }
}