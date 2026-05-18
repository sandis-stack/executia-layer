import crypto from "crypto";

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

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function uuid() {
  return crypto.randomUUID();
}

async function supabaseInsertPublicRegistry(record) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return {
      persisted: false,
      reason: "SUPABASE_ENV_MISSING"
    };
  }

  const response = await fetch(`${url}/rest/v1/execution_public_registry`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(record)
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      persisted: false,
      reason: text || "SUPABASE_INSERT_FAILED"
    };
  }

  try {
    return {
      persisted: true,
      row: text ? JSON.parse(text)?.[0] : null
    };
  } catch {
    return {
      persisted: true,
      row: null
    };
  }
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

  const blockingReasons = [];

  if (includesAny(combined, ["payment before approval", "pay before approval", "release payment before approval"])) {
    blockingReasons.push("PAYMENT_BEFORE_APPROVAL");
    score -= 30;
  }

  if (includesAny(combined, ["supplier not verified", "unverified supplier", "unknown supplier"])) {
    blockingReasons.push("SUPPLIER_NOT_VERIFIED");
    score -= 24;
  }

  if (includesAny(combined, ["budget exceeded", "exceed budget", "over budget"])) {
    blockingReasons.push("BUDGET_LIMIT_EXCEEDED");
    score -= 22;
  }

  if (includesAny(combined, ["no audit", "without audit", "no proof", "without proof"])) {
    blockingReasons.push("MISSING_PROOF_REQUIREMENT");
    score -= 20;
  }

  score = clamp(score, 20, 96);

  const isBlocked = blockingReasons.length > 0;

  const riskLevel =
    isBlocked ? "BLOCKED_EXECUTION_RISK" :
    score >= 82 ? "CONTROLLED_EXECUTION_RISK" :
    score >= 65 ? "MODERATE_EXECUTION_RISK" :
    "UNDEFINED_EXECUTION_RISK";

  const pilotReadiness =
    isBlocked ? "BLOCKED" :
    score >= 82 ? "HIGH" :
    score >= 65 ? "MEDIUM" :
    "LOW";

  const governanceDecision =
    isBlocked ? "BLOCKED_EXECUTION" :
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
    execution_domain: executionDomain,
    governance_decision: governanceDecision,
    execution_score: score,
    risk_level: riskLevel,
    pilot_readiness: pilotReadiness,
    blocking_reasons: blockingReasons,
    failure_prevention_active: blockingReasons.length > 0,
    required_governance_controls: requiredControls,
    required_proof_layers: proofLayers,
    recommended_next_action:
      blockingReasons.length > 0
        ? "FIX_BLOCKED_EXECUTION"
        : score >= 82
          ? "REQUEST_PILOT"
          : score >= 65
            ? "CLARIFY_EXECUTION_RULES"
            : "DEFINE_OUTCOME_AND_CONSTRAINTS"
  };
}

function buildProofChain({ submissionId, reviewId, input, analysis, createdAt }) {
  const events = analysis.governance_decision === "BLOCKED_EXECUTION"
    ? [
        "REQUEST_RECEIVED",
        "OUTCOME_DEFINED",
        "AUTO_ANALYSIS_COMPLETED",
        "STANDARD_RISK_DETECTED",
        "EXECUTION_FAILURE_PREVENTED",
        "GOVERNANCE_BLOCK_RECORDED",
        "PROOF_CHAIN_PREPARED",
        "TIMESTAMP_ANCHOR_READY",
        "REGULATOR_VERIFICATION_AVAILABLE"
      ]
    : [
        "REQUEST_RECEIVED",
        "OUTCOME_DEFINED",
        "AUTO_ANALYSIS_COMPLETED",
        "STANDARD_RISK_DETECTED",
        "GOVERNANCE_REVIEW_OPENED",
        "GOVERNANCE_DECISION_READY",
        "PROOF_CHAIN_PREPARED",
        "TIMESTAMP_ANCHOR_READY",
        "REGULATOR_VERIFICATION_AVAILABLE"
      ];

  let previousHash = null;

  return events.map((type, index) => {
    const payload = {
      index,
      type,
      submission_id: submissionId,
      review_id: reviewId,
      created_at: createdAt,
      execution_domain: analysis.execution_domain,
      governance_decision: analysis.governance_decision,
      execution_score: analysis.execution_score,
      input_hash: sha256(JSON.stringify(input))
    };

    const eventHash = sha256(JSON.stringify({
      previous_hash: previousHash,
      payload
    }));

    const event = {
      index,
      type,
      payload,
      previous_hash: previousHash,
      event_hash: eventHash
    };

    previousHash = eventHash;
    return event;
  });
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

    const input = {
      domain: normalizeText(req.body?.domain),
      outcome: normalizeText(req.body?.outcome),
      budget: normalizeText(req.body?.budget),
      timeline: normalizeText(req.body?.timeline),
      constraints: normalizeText(req.body?.constraints),
      contact_name: normalizeText(req.body?.contact_name),
      contact_email: normalizeText(req.body?.contact_email),
      organization: normalizeText(req.body?.organization)
    };

    if (!input.outcome || input.outcome.length < 20) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "OUTCOME_REQUIRED",
          message: "A defined outcome is required."
        }
      });
    }

    const createdAt = new Date().toISOString();
    const submissionId = uuid();
    const reviewId = uuid();
    const analysis = buildAnalysis(input);
    const proofChain = buildProofChain({ submissionId, reviewId, input, analysis, createdAt });
    const headHash = proofChain[proofChain.length - 1]?.event_hash || null;

    const verificationUrl = `https://execution.executia.io/public-proof/?review_id=${reviewId}`;

    const submission = {
      submission_id: submissionId,
      review_id: reviewId,
      created_at: createdAt,
      status: analysis.governance_decision,
      verification_url: verificationUrl,
      qr_verification_payload: `EXECUTIA_VERIFY:${reviewId}`
    };

    const proofPreview = {
      immutable_chain_prepared: true,
      events_materialized: proofChain.length,
      head_hash: headHash,
      operator_signature_required: true,
      timestamp_anchor_required: true,
      regulator_verification_available: true,
      external_notary_ready: false
    };

    const receipt = {
      ok: true,
      engine: "EXECUTIA_EXECUTION_SUBMISSION_ENGINE_V1",
      mode: "PUBLIC_SUBMISSION",
      submission,
      analysis,
      proof_preview: proofPreview,
      proof_chain: proofChain,
      next_action: {
        type: analysis.recommended_next_action,
        request_pilot_url: `https://execution.executia.io/request/?review_id=${reviewId}&submission_id=${submissionId}`
      }
    };

    const registry = await supabaseInsertPublicRegistry({
      review_id: reviewId,
      submission_id: submissionId,
      status: analysis.governance_decision,
      execution_domain: analysis.execution_domain,
      governance_decision: analysis.governance_decision,
      execution_score: analysis.execution_score,
      risk_level: analysis.risk_level,
      pilot_readiness: analysis.pilot_readiness,
      head_hash: headHash,
      input,
      analysis,
      proof_preview: proofPreview,
      proof_chain: proofChain,
      receipt
    });

    return res.status(200).json({
      ...receipt,
      registry
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "EXECUTION_SUBMISSION_FAILED",
        message: error.message || "Execution submission failed."
      }
    });
  }
}
