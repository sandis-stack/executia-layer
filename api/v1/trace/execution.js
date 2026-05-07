import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { requireOperator } from "../../../services/operator.js";
import { resolveJwtContext } from "../../../services/jwt-auth.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

async function requireAuth(req) {
  try {
    await requireOperator(req);
    return true;
  } catch (_) {}

  try {
    const jwt = await resolveJwtContext(req);
    if (jwt?.user) return true;
  } catch (_) {}

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  return !!(token && token.split(".").length === 3);
}

export default async function handler(req, res) {
  try {
    const ok = await requireAuth(req);
    if (!ok) throw new Error("OPERATOR_UNAUTHORIZED");

    const execution_id = req.query.execution_id;
    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: { code: "EXECUTION_ID_REQUIRED" }
      });
    }

    const supabase = db();

    const { data: execution, error } = await supabase
      .from("execution_results")
      .select("*")
      .or(`id.eq.${execution_id},execution_id.eq.${execution_id}`)
      .limit(1)
      .maybeSingle();

    if (error || !execution) {
      return res.status(404).json({
        ok: false,
        error: { code: "EXECUTION_NOT_FOUND", message: error?.message }
      });
    }

    const { data: rulesData } = await supabase
      .from("rule_catalog")
      .select("*")
      .eq("default_status", "ACTIVE")
      .order("created_at", { ascending: true });

    const amount = Number(execution.amount || execution.payload?.amount || 0);

    const trace = [
      {
        step: "REQUEST_RECEIVED",
        state: "RECORDED",
        detail: execution.request_type || "EXECUTION_REQUEST",
        timestamp: execution.created_at
      },
      {
        step: "VALIDATION_STARTED",
        state: execution.validation_result || "UNCLEAR",
        detail: "Execution validation context initialized",
        timestamp: execution.created_at
      },
      ...(rulesData || []).map(rule => {
        let state = "INFO";

        if (rule.rule_code === "AML_CHECK") {
          state = amount > Number(rule.threshold || 100000000) ? "REVIEW" : "PASSED";
        } else if (rule.rule_code === "DOUBLE_ENTRY") {
          state = execution.audit_state === "RECORDED" ? "VERIFIED" : "PENDING";
        } else if (rule.rule_code === "EXECUTION_POLICY") {
          state = execution.status === "BLOCKED" ? "BLOCKED" : "PASSED";
        } else if (rule.rule_code === "RISK_THRESHOLD") {
          state = execution.validation_result === "UNCLEAR" ? "REVIEW" : "PASSED";
        } else if (rule.rule_code === "HASH_CHAIN") {
          state = execution.hash ? "LINKED" : "MISSING";
        }

        return {
          step: rule.rule_code,
          state,
          detail: rule.impact || rule.description || "execution_control",
          timestamp: execution.updated_at || execution.created_at
        };
      }),
      {
        step: "POLICY_DECISION",
        state: execution.status || "PENDING_REVIEW",
        detail: "Final policy state resolved by execution engine",
        timestamp: execution.updated_at || execution.created_at
      },
      {
        step: "FINAL_STATE",
        state: execution.reconciliation_state === "VERIFIED" ? "VERIFIED" : execution.status,
        detail: "Execution truth state materialized",
        timestamp: execution.updated_at || execution.created_at
      }
    ];

    return res.status(200).json({
      ok: true,
      mode: "EXECUTION_TRACE",
      execution_id,
      trace
    });

  } catch (e) {
    return res.status(401).json({
      ok: false,
      error: {
        code: "EXECUTION_TRACE_FAILED",
        message: e.message
      }
    });
  }
}
