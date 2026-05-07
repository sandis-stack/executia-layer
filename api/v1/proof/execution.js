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

    const proof = buildExecutionProof(data);

    await supabase.from("audit_events").insert({
      execution_id,
      event_type: "EXECUTION_PROOF_GENERATED",
      payload: proof,
      created_at: new Date().toISOString(),
    });

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
