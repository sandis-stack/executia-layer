import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { buildExecutionProof } from "../../../services/proof/build-proof.js";
import { verifyAuditChain } from "../../../services/audit.js";
import { verifyCoreLedgerChain } from "../../../services/core-ledger.js";
import { ok, fail, methodGuard } from "../../../shared/response.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

function resolveDecision(execution, latestOperatorEvent) {
  if (latestOperatorEvent?.action === "APPROVE") return "APPROVE";
  if (latestOperatorEvent?.action === "REJECT") return "BLOCK";
  if (latestOperatorEvent?.action === "FREEZE") return "FREEZE";
  if (latestOperatorEvent?.action === "ESCALATE") return "REVIEW";
  return execution.decision || "REVIEW";
}

function buildReplay(proof, auditEvents = [], coreLedgerEntries = []) {
  const trace = proof.unified_execution_object.trace || [];

  const autonomousEvents = auditEvents.filter(
    (event) => event.event_type === "GOVERNANCE_AUTONOMOUS_RUNTIME_CYCLE"
  );

  const auditReplay = auditEvents
    .filter((event) => event.event_type !== "GOVERNANCE_AUTONOMOUS_RUNTIME_CYCLE")
    .map((event, index) => ({
      index: trace.length + index,
      source: "AUDIT",
      event_type: event.event_type || event.action || "AUDIT_EVENT",
      state: event.event_state || event.next_state || event.status || "RECORDED",
      actor: event.actor || event.actor_email || "audit",
      timestamp: event.created_at || new Date().toISOString()
    }));

  const autonomousReplay = autonomousEvents.map((event, index) => ({
    index: trace.length + auditReplay.length + index,
    source: "AUTONOMOUS_GOVERNANCE",
    event_type: event.event_type,
    state: event.event_state || event.payload?.autonomous?.autonomous_state || "AUTONOMOUS_RECORDED",
    actor: event.actor || event.actor_email || "autonomous",
    timestamp: event.created_at || new Date().toISOString(),
    watchdog: event.payload?.watchdog?.next_action || null,
    orchestrator: event.payload?.orchestrator?.priority || null,
    containment: event.payload?.containment?.mode || null,
    recovery: event.payload?.recovery?.mode || null
  }));

  const ledgerReplay = coreLedgerEntries.map((entry, index) => ({
    index: trace.length + auditReplay.length + autonomousReplay.length + index,
    source: "CORE_LEDGER",
    event_type: "CORE_LEDGER_LINKED",
    state: entry.settlement_status || entry.payload?.settlement_state || "LINKED",
    actor: entry.actor || "ledger",
    timestamp: entry.created_at || new Date().toISOString(),
    hash: entry.hash || null,
    prev_hash: entry.prev_hash || null
  }));

  return {
    type: "EXECUTIA_EXECUTION_REPLAY",
    event_count: trace.length + auditReplay.length + autonomousReplay.length + ledgerReplay.length,
    autonomous_event_count: autonomousReplay.length,
    path: [
      ...trace.map((event) => ({
        source: "PROOF_TRACE",
        event_type: event.event_type,
        state: event.status || "RECORDED",
        actor: event.actor || "system",
        timestamp: event.timestamp
      })),
      ...auditReplay,
      ...autonomousReplay,
      ...ledgerReplay
    ]
  };
}

async function buildExecutionProofPackage(execution_id) {
  const supabase = db();

  const { data: execution, error: executionError } = await supabase
    .from("execution_results")
    .select("*")
    .eq("execution_id", execution_id)
    .single();

  if (executionError || !execution) {
    const error = new Error(executionError?.message || "Execution not found.");
    error.code = "EXECUTION_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  const { data: coreLedgerEntries } = await supabase
    .from("core_ledger")
    .select("*")
    .eq("execution_id", execution_id)
    .order("created_at", { ascending: true });

  const { data: auditEvents } = await supabase
    .from("audit_events")
    .select("*")
    .eq("execution_id", execution_id)
    .order("created_at", { ascending: true });

  const latestOperatorEvent =
    (auditEvents || [])
      .filter((event) => event.event_type === "OPERATOR_ACTION")
      .at(-1) || null;

  const proof = buildExecutionProof({
    ...execution,
    status: latestOperatorEvent?.next_state || execution.status,
    decision: resolveDecision(execution, latestOperatorEvent),
    reason: latestOperatorEvent?.reason || execution.reason,
    actor: latestOperatorEvent?.actor_email || execution.actor,
    operator_email: latestOperatorEvent?.actor_email || execution.operator_email,
    operator_role: latestOperatorEvent?.actor_role || execution.operator_role,
    core_ledger_entries: coreLedgerEntries || []
  });

  const audit = await verifyAuditChain(execution_id);

  let coreLedgerVerification = { verified: false, mode: "UNAVAILABLE" };

  try {
    coreLedgerVerification = await verifyCoreLedgerChain();
  } catch (err) {
    coreLedgerVerification = { verified: false, mode: "ERROR", error: err.message };
  }

  const autonomousEvents = (auditEvents || []).filter(
    (event) => event.event_type === "GOVERNANCE_AUTONOMOUS_RUNTIME_CYCLE"
  );

  const replay = buildReplay(proof, auditEvents || [], coreLedgerEntries || []);

  const packageVerified =
    Boolean(proof.verified) &&
    Boolean(audit.verified) &&
    Boolean(coreLedgerVerification.verified);

  return {
    ok: true,
    type: "EXECUTIA_EXECUTION_PROOF_EXPORT",
    mode: "EXECUTIA_EXECUTION_PROOF_PACKAGE_V1",
    execution_id,
    exported_at: new Date().toISOString(),
    package_state: packageVerified ? "PACKAGE_VERIFIED" : "PACKAGE_PARTIAL",
    verified: packageVerified,
    proof: {
      proof_state: proof.proof_state,
      proof_version: proof.proof_version,
      proof_hash: proof.proof_hash,
      verified: proof.verified
    },
    decision: proof.unified_execution_object.decision,
    actor: proof.unified_execution_object.actor,
    ledger: {
      linked: proof.unified_execution_object.ledger.linked,
      core_ledger_entries: coreLedgerEntries?.length || 0,
      core_ledger_verified: coreLedgerVerification.verified,
      settlement_state: proof.unified_execution_object.ledger.settlement_state,
      reconciliation_state: proof.unified_execution_object.ledger.reconciliation_state
    },
    audit: {
      verified: audit.verified,
      entries: audit.entries || auditEvents?.length || 0
    },
    autonomous_governance: {
      events: autonomousEvents.length,
      latest_state:
        autonomousEvents.at(-1)?.event_state ||
        autonomousEvents.at(-1)?.payload?.autonomous?.autonomous_state ||
        null,
      latest_watchdog:
        autonomousEvents.at(-1)?.payload?.watchdog?.next_action ||
        null,
      latest_orchestrator:
        autonomousEvents.at(-1)?.payload?.orchestrator?.priority ||
        null,
      latest_containment:
        autonomousEvents.at(-1)?.payload?.containment?.mode ||
        null,
      latest_recovery:
        autonomousEvents.at(-1)?.payload?.recovery?.mode ||
        null
    },
    replay,
    unified_execution_object: proof.unified_execution_object
  };
}

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["GET"])) return;

    const execution_id = req.query.execution_id;

    if (!execution_id) {
      return fail(res, "EXECUTION_ID_REQUIRED", "execution_id is required.", 400);
    }

    const proofPackage = await buildExecutionProofPackage(execution_id);

    return ok(res, proofPackage);
  } catch (err) {
    return fail(
      res,
      err.code || "PROOF_EXPORT_FAILED",
      err.message || "Execution proof export failed.",
      err.status || 500
    );
  }
}
