import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { verifyExecutionTruth } from "../../../services/reconciliation/verify.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

export default async function handler(req, res) {
  try {
    const execution_id =
      req.query.execution_id ||
      req.body?.execution_id;

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "EXECUTION_ID_REQUIRED"
        }
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
          message: error?.message || "Missing execution"
        }
      });
    }

    const normalized = {
      ...data,
      ledger_state: data.ledger_state || "HASH_LINKED",
      audit_state: data.audit_state || "RECORDED",
      reconciliation_state: data.reconciliation_state || "PENDING",
      hash_verified: Boolean(data.hash)
    };

    const verification = verifyExecutionTruth(normalized);

    await supabase
      .from("audit_events")
      .insert({
        execution_id,
        event_type: "RECONCILIATION_VERIFY",
        payload: verification,
        created_at: new Date().toISOString()
      });

    
    if (verification?.verified && execution_id) {
      await supabase
        .from("execution_results")
        .update({
          reconciliation_state: "VERIFIED",
          hash_verified: true,
          audit_state: "RECORDED",
          ledger_state: "HASH_LINKED"
        })
        .eq("execution_id", execution_id);
    }

    return res.status(200).json({
      ok: true,
      mode: "EXECUTION_TRUTH",
      execution_id,
      verification
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "RECONCILIATION_FAILED",
        message: e.message
      }
    });
  }
}
