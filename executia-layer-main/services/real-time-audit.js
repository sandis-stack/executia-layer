import { db } from "./db.js";
import { createExecutionId } from "../shared/crypto.js";
import { auditLedgerIntegrity } from "./audit-ledger.js";

export async function runRealTimeAudit({ source = "REAL_TIME_AUDIT", actor = "system" } = {}) {
  // Guard: prevent re-entrant audit loops
  if (source === "AUDIT") {
    return {
      ok:      true,
      skipped: true,
      reason:  "AUDIT_LOOP_PREVENTED"
    };
  }

  const audit = await auditLedgerIntegrity();

  if (audit.verified) {
    return {
      ok:       true,
      verified: true,
      action:   "NO_ACTION_REQUIRED",
      audit
    };
  }

  const { data, error } = await db()
    .from("execution_results")
    .insert({
      execution_id:  createExecutionId(),
      request_type: "AUDIT_INTEGRITY_FAILURE",
      actor,
      subject:      "AUDIT",  // fixed — prevents re-entrant loop on this insert
      status:       "BLOCKED",
      decision:     "BLOCK",
      reason:       "Ledger/account balance integrity mismatch detected",
      payload: {
        source,
        audit
      }
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ok:       true,
    verified: false,
    action:   "SYSTEM_BLOCKED_INTEGRITY_FAILURE",
    incident: data,
    audit
  };
}
