import crypto from "crypto";
import { applyRules } from "./rules.js";
import { dispatchExecution } from "./dispatcher.js";
import { createLedgerEntry } from "./ledger.js";
import { executeAction } from "../gateway/execute-action.js";

export async function runExecution(input = {}) {
  const ruleResult = applyRules(input);
  const dispatchResult = await dispatchExecution(ruleResult);
  const ledgerEntry = createLedgerEntry(input, ruleResult, dispatchResult);

  // External dispatch — only for APPROVE
  let dispatch = {};
  if (ruleResult.decision === "APPROVE") {
    dispatch = await executeAction(input);
  }

  // Execution proof — hash covers full execution: input + decision + dispatch + time
  const proof = {
    input,
    decision: ruleResult.decision,
    dispatch: Object.keys(dispatch).length ? dispatch : dispatchResult,
    timestamp: Date.now()
  };
  const truth_hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(proof))
    .digest("hex");

  return {
    ok: true,
    decision: ruleResult.decision,
    reason: ruleResult.reason,
    reason_code: ruleResult.reason_code,
    execution_status: dispatchResult.execution_status,
    dispatch: proof.dispatch,
    ledger: { ...ledgerEntry, truth_hash },
    truth_hash
  };
}
