function normalizeText(value) {
  return String(value || "").trim();
}

function lower(value) {
  return normalizeText(value).toLowerCase();
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function classifyDomain(domain, text) {
  const d = lower(domain);

  if (d.includes("procurement") || includesAny(text, ["supplier", "tender", "contract", "public procurement"])) {
    return "PUBLIC_PROCUREMENT";
  }

  if (d.includes("finance") || includesAny(text, ["payment", "invoice", "tax", "accounting", "settlement"])) {
    return "FINANCE_ACCOUNTING";
  }

  if (d.includes("infrastructure") || includesAny(text, ["construction", "infrastructure", "project delivery", "contractor"])) {
    return "INFRASTRUCTURE_PROJECT";
  }

  if (d.includes("compliance") || includesAny(text, ["compliance", "audit", "regulator", "law", "policy"])) {
    return "COMPLIANCE_CONTROL";
  }

  return "BUSINESS_OPERATIONS";
}

function buildAnalysis(input) {
  const domain = normalizeText(input.domain);
  const outcome = normalizeText(input.outcome);
  const budget = normalizeText(input.budget);
  const timeline = normalizeText(input.timeline);
  const constraints = normalizeText(input.constraints);

  const combined = lower(`${domain} ${outcome} ${budget} ${timeline} ${constraints}`);
  const executionDomain = classifyDomain(domain, combined);

  let score = 50;

  if (outcome.length >= 40) score += 12;
  if (constraints.length >= 40) score += 12;
  if (budget.length >= 2) score += 5;
  if (timeline.length >= 2) score += 5;

  if (includesAny(combined, ["approval", "approve", "authorized", "authorization"])) score += 7;
  if (includesAny(combined, ["audit", "proof", "immutable", "evidence", "verify", "verification"])) score += 9;
  if (includesAny(combined, ["payment", "settlement", "invoice", "reconciliation", "reconciled"])) score += 8;
  if (includesAny(combined, ["supplier", "contract", "tender", "procurement"])) score += 7;
  if (includesAny(combined, ["risk", "compliance", "regulator", "legal", "policy"])) score += 6;
  if (includesAny(combined, ["budget limit", "limit", "cannot exceed", "blocked", "block"])) score += 6;

  if (outcome.length < 25) score -= 16;
  if (constraints.length < 25) score -= 12;

  score = clamp(score, 20, 96);

  const riskLevel =
    score >= 82 ? "CONTROLLED_EXECUTION_RISK" :
    score >= 65 ? "MODERATE_EXECUTION_RISK" :
    "UNDEFINED_EXECUTION_RISK";

  const pilotReadiness =
    score >= 82 ? "HIGH" :
    score >= 65 ? "MEDIUM" :
    "LOW";

  const governanceDecision =
    score >= 82 ? "APPROVED_FOR_PILOT_REVIEW" :
    score >= 65 ? "PENDING_GOVERNANCE_REVIEW" :
    "INSUFFICIENT_EXECUTION_DEFINITION";

  const requiredControls = [
    "OUTCOME_TO_RULE_MAPPING",
    "PRE_COMMITMENT_VALIDATION",
    "APPROVAL_PATH_CONTROL",
    "IMMUTABLE_PROOF_CHAIN",
    "OPERATOR_DECISION_RECORD",
    "REGULATOR_READABLE_AUDIT_TRAIL"
  ];

  if (includesAny(combined, ["payment", "invoice", "settlement", "reconciliation"])) {
    requiredControls.push("SETTLEMENT_RECONCILIATION");
  }

  if (includesAny(combined, ["supplier", "contract", "tender", "procurement"])) {
    requiredControls.push("SUPPLIER_VERIFICATION");
    requiredControls.push("CONTRACT_EXECUTION_CONTROL");
  }

  if (includesAny(combined, ["regulator", "law", "legal", "compliance"])) {
    requiredControls.push("REGULATORY_VERIFICATION_LAYER");
  }

  const proofLayers = [
    "REQUEST_RECEIVED",
    "AUTO_ANALYSIS_COMPLETED",
    "STANDARD_RISK_DETECTED",
    "GOVERNANCE_REVIEW_OPENED",
    "GOVERNANCE_DECISION_READY",
    "PROOF_CHAIN_READY"
  ];

  if (requiredControls.includes("SETTLEMENT_RECONCILIATION")) {
    proofLayers.push("SETTLEMENT_REQUIRED");
    proofLayers.push("RECONCILIATION_REQUIRED");
  }

  proofLayers.push("TIMESTAMP_ANCHOR_READY");
  proofLayers.push("REGULATOR_VERIFICATION_AVAILABLE");

  return {
    ok: true,
    engine: "EXECUTIA_EXECUTION_ANALYSIS_ENGINE_V1",
    mode: "PUBLIC_ANALYSIS",
    input: {
      domain,
      outcome,
      budget,
      timeline,
      constraints
    },
    result: {
      execution_domain: executionDomain,
      governance_decision: governanceDecision,
      execution_score: score,
      risk_level: riskLevel,
      pilot_readiness: pilotReadiness,
      summary:
        score >= 82
          ? "This execution case is structurally suitable for an EXECUTIA pilot. Governance controls and proof chain can be defined."
          : score >= 65
            ? "This execution case has execution-control potential but requires clearer rules, constraints and verification points."
            : "This execution case is not yet specific enough. Define clearer outcome, constraints, approval logic and proof requirements.",
      required_governance_controls: requiredControls,
      required_proof_layers: proofLayers,
      recommended_next_action:
        score >= 82
          ? "REQUEST_PILOT"
          : score >= 65
            ? "CLARIFY_EXECUTION_RULES"
            : "DEFINE_OUTCOME_AND_CONSTRAINTS"
    },
    proof_preview: {
      immutable_chain_required: true,
      operator_signature_required: true,
      timestamp_anchor_required: true,
      regulator_verification_available: true,
      external_notary_ready: false
    }
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Use POST."
        }
      });
    }

    const analysis = buildAnalysis(req.body || {});

    return res.status(200).json(analysis);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "EXECUTION_ANALYSIS_FAILED",
        message: error.message || "Execution analysis failed."
      }
    });
  }
}
