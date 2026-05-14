function respond(res, status, body) {
  return res.status(status).json(body);
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return respond(res, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST."
      }
    });
  }

  const body = req.body || {};

  const processName =
    body.process_name ||
    body.processName ||
    "Unnamed execution process";

  const industry = body.industry || "Unspecified";

  const source = [
    body.workflow,
    body.payments,
    body.approvals,
    body.compliance,
    body.problems
  ].map(normalize).join(" ");

  const risks = [];
  const governanceGaps = [];
  const recommendedControls = [];

  let score = 86;

  if (hasAny(source, ["manual", "email", "spreadsheet", "excel"])) {
    score -= 12;
    risks.push("Manual dependency detected");
    governanceGaps.push("Execution depends on confirmation outside controlled validation.");
    recommendedControls.push("Introduce deterministic execution-time validation.");
  }

  if (hasAny(source, ["delayed", "later audit", "post", "after execution", "report after"])) {
    score -= 14;
    risks.push("Delayed truth detected");
    governanceGaps.push("Audit or verification appears after execution instead of during execution.");
    recommendedControls.push("Move audit proof generation into the execution moment.");
  }

  if (hasAny(source, ["payment", "invoice", "finance", "transfer"])) {
    score -= 8;
    risks.push("Payment execution exposure detected");
    governanceGaps.push("Payment approval is not atomically linked to ledger verification.");
    recommendedControls.push("Link decision, payment and ledger proof into one execution object.");
  }

  if (hasAny(source, ["unclear", "fragmented", "accountability", "responsibility"])) {
    score -= 10;
    risks.push("Fragmented accountability detected");
    governanceGaps.push("Decision ownership is not structurally enforced.");
    recommendedControls.push("Add governed decision authority and review escalation.");
  }

  if (hasAny(source, ["missing approval", "approval_status", "before full validation", "no validation", "missing validation"])) {
    score -= 16;
    risks.push("Validation gap detected");
    governanceGaps.push("Execution may happen before required validation is complete.");
    recommendedControls.push("Block execution until validation state is approved.");
  }

  score = Math.max(12, Math.min(100, score));

  const riskLevel =
    score >= 80 ? "LOW" :
    score >= 60 ? "MODERATE" :
    score >= 40 ? "HIGH" :
    "CRITICAL";

  const decision =
    riskLevel === "LOW" ? "APPROVED" :
    riskLevel === "MODERATE" ? "PENDING_REVIEW" :
    "BLOCKED";

  return respond(res, 200, {
    ok: true,
    mode: "EXECUTIA_EXECUTION_ANALYSIS_ENGINE_V1",
    generated_at: new Date().toISOString(),
    process_name: processName,
    industry,
    execution_status:
      decision === "APPROVED" ? "CONTROLLED" :
      decision === "PENDING_REVIEW" ? "REVIEW_REQUIRED" :
      "EXECUTION_BLOCKED",
    integrity_score: score,
    risk_level: riskLevel,
    decision,
    risks: risks.length ? risks : [
      "No major execution risk detected from provided input."
    ],
    governance_gaps: governanceGaps.length ? governanceGaps : [
      "No critical governance gap detected from provided input."
    ],
    recommended_controls: recommendedControls.length ? recommendedControls : [
      "Maintain execution-time validation.",
      "Maintain ledger continuity.",
      "Maintain audit proof chain."
    ],
    execution_flow: [
      { step: "REQUEST", state: "RECEIVED" },
      { step: "VALIDATION", state: score >= 70 ? "PASSED" : "GAP_DETECTED" },
      { step: "DECISION", state: decision },
      { step: "REGISTRY", state: "CLASSIFIED" },
      { step: "LEDGER", state: "PROOF_REQUIRED" },
      { step: "AUDIT", state: "TRACE_GENERATED" }
    ],
    recommendation:
      decision === "APPROVED"
        ? "Process shows basic execution control. Pilot can focus on proof-chain verification and institutional rollout."
        : "Process should be tested through an EXECUTIA execution integrity pilot to reduce delayed truth, fragmented accountability and execution drift."
  });
}
