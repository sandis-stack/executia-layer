import { runExecution } from "../core/engine.js";
import { db } from "../services/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const result = await runExecution(req.body || {});

    const { data, error } = await db
      .from("executions")
      .insert({
        ticket_id: `exec_${Date.now()}`,
        organization_id: result.ledger.organization_id,
        session_id: result.ledger.session_id,
        project_id: result.ledger.project_id,
        event_type: result.ledger.event_type,
        provider_name: result.dispatch.provider || "safe-mode",
        provider_transaction_id: result.dispatch.provider_transaction_id || null,
        authoritative_status: result.execution_status,
        ticket_status_cache: result.execution_status,
        ledger_decision: result.decision,
        truth_hash: result.truth_hash,
        payload: result
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    return res.status(200).json({
      ...result,
      execution: data
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
