import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { buildExecutionProof } from "../../../services/proof/build-proof.js";
// Legacy projection check only. Canonical verification authority is /api/v1/audit/verify.
import { verifyAuditChain } from "../../../services/audit.js";
import { ok, fail, methodGuard } from "../../../shared/response.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["GET"])) return;

    const execution_id = req.query.execution_id;

    if (!execution_id) {
      return fail(res, "EXECUTION_ID_REQUIRED", "execution_id is required.", 400);
    }

    const supabase = db();

    const { data: execution, error: executionError } = await supabase
      .from("execution_results")
      .select("*")
      .eq("execution_id", execution_id)
      .single();

    if (executionError || !execution) {
      return fail(res, "EXECUTION_NOT_FOUND", executionError?.message || "Execution not found.", 404);
    }

    const { data: coreLedgerEntries } = await supabase
      .from("core_ledger")
      .select("*")
      .eq("execution_id", execution_id)
      .order("created_at", { ascending: true });

    const { data: latestOperatorEvent } = await supabase
      .from("audit_events")
      .select("*")
      .eq("execution_id", execution_id)
      .eq("event_type", "OPERATOR_ACTION")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const resolvedStatus = latestOperatorEvent?.next_state || execution.status;

    const resolvedDecision =
      latestOperatorEvent?.action === "APPROVE" ? "APPROVE" :
      latestOperatorEvent?.action === "REJECT" ? "BLOCK" :
      execution.decision || "REVIEW";

    const proof = buildExecutionProof({
      ...execution,
      status: resolvedStatus,
      decision: resolvedDecision,
      reason: latestOperatorEvent?.reason || execution.reason,
      actor: latestOperatorEvent?.actor_email || execution.actor,
      operator_email: latestOperatorEvent?.actor_email || execution.operator_email,
      operator_role: latestOperatorEvent?.actor_role || execution.operator_role,
      core_ledger_entries: coreLedgerEntries || []
    });

    const audit = await verifyAuditChain(execution_id); // legacy projection check only

    const ledger = coreLedgerEntries?.[0] || null;

    return ok(res, {
      mode: "EXECUTIA_PROOF_SUMMARY_V1",
      execution_id,
      status: proof.unified_execution_object.decision.status,
      decision: proof.unified_execution_object.decision.decision,
      proof_state: proof.proof_state,
      proof_version: proof.proof_version,
      proof_hash: proof.proof_hash,
      verified: proof.verified && audit.verified,
      actor: proof.unified_execution_object.actor,
      request_type: proof.unified_execution_object.request_type,
      ledger: {
        linked: proof.unified_execution_object.ledger.linked,
        core_ledger_id: ledger?.id || null,
        debit_account: ledger?.debit_account || null,
        credit_account: ledger?.credit_account || null,
        amount: ledger?.amount || null,
        currency: ledger?.currency || null,
        settlement_status: ledger?.settlement_status || "NONE",
        settlement_state: proof.unified_execution_object.ledger.settlement_state || "PENDING",
        reconciliation_state: proof.unified_execution_object.ledger.reconciliation_state || "PENDING",
        hash: ledger?.hash || null,
        prev_hash: ledger?.prev_hash || null
      },
      audit: {
        verified: audit.verified,
        entries: audit.entries || 0
      },
      trace: {
        events: proof.unified_execution_object.trace?.length || 0,
        final_event: proof.unified_execution_object.trace?.at(-1)?.event_type || null
      },
      summary: {
        execution_committed: true,
        operator_decision_materialized: Boolean(latestOperatorEvent),
        ledger_linked: proof.unified_execution_object.ledger.linked,
        settlement_completed: proof.unified_execution_object.ledger.settlement_state === "SETTLED",
        reconciliation_verified: proof.unified_execution_object.ledger.reconciliation_state === "VERIFIED",
        audit_chain_verified: audit.verified,
        proof_verified: proof.verified && audit.verified
      }
    });
  } catch (err) {
    return fail(res, "PROOF_SUMMARY_FAILED", err.message || "Proof summary failed.", 500);
  }
}
