import { db } from "../db.js";

export async function analyzeExecutionDrift() {
  const { data: executions } = await db()
    .from("execution_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const stats = {
    approved: 0,
    blocked: 0,
    pending_review: 0,
    failed: 0,
    operator_interventions: 0,
    settlement_pending: 0,
    reconciliation_verified: 0
  };

  const recommendations = [];

  for (const row of executions || []) {
    if (row.status === "APPROVED") stats.approved++;
    if (row.status === "BLOCKED") stats.blocked++;
    if (row.status === "PENDING_REVIEW") stats.pending_review++;
    if (row.status === "FAILED") stats.failed++;

    if (row.operator_action) {
      stats.operator_interventions++;
    }

    if (row.reconciliation_state === "VERIFIED") {
      stats.reconciliation_verified++;
    }

    if (
      row.ledger_state === "HASH_LINKED" &&
      row.reconciliation_state !== "VERIFIED"
    ) {
      stats.settlement_pending++;
    }
  }

  if (stats.pending_review > 10) {
    recommendations.push({
      type: "VALIDATION_DRIFT",
      severity: "HIGH",
      recommendation:
        "Too many executions require operator review. Improve validation precision."
    });
  }

  if (stats.blocked > stats.approved) {
    recommendations.push({
      type: "POLICY_RESTRICTION",
      severity: "MEDIUM",
      recommendation:
        "Blocked executions exceed approved executions."
    });
  }

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    stats,
    recommendations
  };
}
