import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { requireOperator } from "../../../services/operator.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

function evaluateRules(execution) {
  const amount = Number(execution.amount || execution.payload?.amount || 0);

  return [
    {
      rule: "AML_CHECK",
      status: amount > 100000000 ? "REVIEW" : "PASSED",
      confidence: amount > 100000000 ? 0.74 : 0.98,
      impact: "financial_control"
    },
    {
      rule: "DOUBLE_ENTRY",
      status: execution.audit_state === "RECORDED" ? "VERIFIED" : "PENDING",
      confidence: execution.audit_state === "RECORDED" ? 0.97 : 0.61,
      impact: "ledger_integrity"
    },
    {
      rule: "EXECUTION_POLICY",
      status: execution.status === "BLOCKED" ? "BLOCKED" : "PASSED",
      confidence: execution.status === "BLOCKED" ? 0.91 : 0.96,
      impact: "operator_governance"
    },
    {
      rule: "RISK_THRESHOLD",
      status: execution.validation_result === "UNCLEAR" ? "REVIEW" : "PASSED",
      confidence: execution.validation_result === "UNCLEAR" ? 0.72 : 0.95,
      impact: "risk_control"
    },
    {
      rule: "HASH_CHAIN",
      status: execution.hash ? "LINKED" : "MISSING",
      confidence: execution.hash ? 0.99 : 0.40,
      impact: "proof_integrity"
    }
  ];
}

export default async function handler(req, res) {
  try {
    await requireOperator(req);

    const execution_id = req.query.execution_id || req.body?.execution_id;

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: { code: "EXECUTION_ID_REQUIRED" }
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

    const rules = evaluateRules(data);

    return res.status(200).json({
      ok: true,
      mode: "RULE_DECISION_ENGINE",
      execution_id,
      decision_surface: {
        status: data.status,
        validation_result: data.validation_result,
        reconciliation_state: data.reconciliation_state,
        hash_verified: data.hash_verified
      },
      rules
    });

  } catch (e) {
    return res.status(401).json({
      ok: false,
      error: {
        code: "RULE_EVALUATION_FAILED",
        message: e.message
      }
    });
  }
}
