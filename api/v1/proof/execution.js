import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { buildExecutionProof } from "../../../services/proof/build-proof.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

export default async function handler(req, res) {
  try {
    const execution_id = req.query.execution_id || req.body?.execution_id;

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: { code: "EXECUTION_ID_REQUIRED" },
      });
    }

    const supabase = db();

    const { data, error } = await supabase
      .from("execution_results")
      .select("*")
      .eq("execution_id", execution_id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "EXECUTION_NOT_FOUND",
          message: error?.message || "Missing execution",
        },
      });
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

    const resolvedStatus =
      latestOperatorEvent?.next_state ||
      data.status;

    const resolvedDecision =
      latestOperatorEvent?.action === "APPROVE" ? "APPROVE" :
      latestOperatorEvent?.action === "REJECT" ? "BLOCK" :
      data.decision || "REVIEW";

    const proof = buildExecutionProof({
      ...data,
      status: resolvedStatus,
      decision: resolvedDecision,
      reason: latestOperatorEvent?.reason || data.reason,
      actor: latestOperatorEvent?.actor_email || data.actor,
      operator_email: latestOperatorEvent?.actor_email || data.operator_email,
      operator_role: latestOperatorEvent?.actor_role || data.operator_role,
      core_ledger_entries: coreLedgerEntries || []
    });

    const { data: existingProofEvent } = await supabase
      .from("audit_events")
      .select("id")
      .eq("execution_id", execution_id)
      .eq("event_type", "EXECUTION_PROOF_GENERATED")
      .limit(1)
      .maybeSingle();

    if (!existingProofEvent) {
      await supabase.from("audit_events").insert({
        execution_id,
        event_type: "EXECUTION_PROOF_GENERATED",
        event_state: proof.proof_state,
        actor: "proof_engine",
        details: proof,
        created_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      ok: true,
      mode: "EXECUTION_PROOF",
      execution_id,
      ...proof,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "EXECUTION_PROOF_FAILED",
        message: e.message,
      },
    });
  }
}
