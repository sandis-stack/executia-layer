import crypto from "crypto";

const OPERATOR_EVENT_TYPES = new Set(["OPERATOR_APPROVED", "OPERATOR_BLOCKED"]);
const TRUTH_ANCHOR_EVENT_TYPE = "TRUTH_ANCHORED";
const SETTLEMENT_RECONCILIATION_EVENT_TYPE = "SETTLEMENT_RECONCILED";

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function registryHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function supabaseRegistryRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: registryHeaders(key, options.headers || {})
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.hint ||
      data?.details ||
      text ||
      "SUPABASE_REGISTRY_REQUEST_FAILED";

    throw new Error(message);
  }

  return data;
}

function operatorEventType(decision) {
  return decision === "APPROVED" ? "OPERATOR_APPROVED" : "OPERATOR_BLOCKED";
}

function nextChainIndex(proofChain) {
  if (!proofChain.length) {
    return 0;
  }

  const lastEvent = proofChain[proofChain.length - 1];
  const lastIndex = Number.isInteger(lastEvent?.index)
    ? lastEvent.index
    : proofChain.length - 1;

  return lastIndex + 1;
}

function buildOperatorChainEvent({ reviewId, decision, operator, proofChain, createdAt }) {
  const previousHash = proofChain[proofChain.length - 1]?.event_hash || null;
  const eventType = operatorEventType(decision);

  const eventHash = sha256(
    JSON.stringify({
      review_id: reviewId,
      decision,
      operator,
      previous_hash: previousHash,
      created_at: createdAt
    })
  );

  return {
    index: nextChainIndex(proofChain),
    type: eventType,
    created_at: createdAt,
    operator,
    previous_hash: previousHash,
    event_hash: eventHash
  };
}

function buildMaterializedReceipt(record, { decision, operator, createdAt, eventHash, proofChain }) {
  const receipt = record.receipt || {};
  const proofPreview = {
    ...(record.proof_preview || receipt.proof_preview || {}),
    head_hash: eventHash,
    events_materialized: proofChain.length
  };

  const analysis = {
    ...(receipt.analysis || record.analysis || {}),
    governance_decision: decision
  };

  const submission = receipt.submission
    ? {
        ...receipt.submission,
        status: decision
      }
    : receipt.submission;

  return {
    ...receipt,
    submission,
    analysis,
    proof_preview: proofPreview,
    proof_chain: proofChain,
    operator_review: {
      decision,
      operator,
      created_at: createdAt,
      event_hash: eventHash
    }
  };
}

function deriveTruthAnchor({ reviewId, headHash, governanceDecision, chainLength }) {
  const anchorHash = sha256(
    JSON.stringify({
      review_id: reviewId,
      head_hash: headHash,
      governance_decision: governanceDecision,
      chain_length: chainLength
    })
  );

  return {
    anchor_id: `EXECUTIA-TRUTH-${anchorHash.slice(0, 16).toUpperCase()}`,
    anchor_hash: anchorHash
  };
}

function buildTruthAnchoredChainEvent({
  reviewId,
  proofChain,
  anchorId,
  anchorHash,
  anchorTimestamp
}) {
  const previousHash = proofChain[proofChain.length - 1]?.event_hash || null;

  const eventHash = sha256(
    JSON.stringify({
      review_id: reviewId,
      type: TRUTH_ANCHOR_EVENT_TYPE,
      anchor_id: anchorId,
      anchor_hash: anchorHash,
      previous_hash: previousHash,
      created_at: anchorTimestamp
    })
  );

  return {
    index: nextChainIndex(proofChain),
    type: TRUTH_ANCHOR_EVENT_TYPE,
    created_at: anchorTimestamp,
    anchor_id: anchorId,
    anchor_hash: anchorHash,
    previous_hash: previousHash,
    event_hash: eventHash
  };
}

function hasOperatorApproval(proofChain) {
  return proofChain.some((event) => event?.type === "OPERATOR_APPROVED");
}

function hasTruthAnchor(proofChain) {
  return proofChain.some((event) => event?.type === TRUTH_ANCHOR_EVENT_TYPE);
}

function appendTruthAnchorEvent({ reviewId, proofChain, governanceDecision }) {
  const headHash = proofChain[proofChain.length - 1]?.event_hash || null;

  if (!headHash) {
    return null;
  }

  const anchorTimestamp = new Date().toISOString();
  const chainLength = proofChain.length;
  const { anchor_id: anchorId, anchor_hash: anchorHash } = deriveTruthAnchor({
    reviewId,
    headHash,
    governanceDecision,
    chainLength
  });

  const truthEvent = buildTruthAnchoredChainEvent({
    reviewId,
    proofChain,
    anchorId,
    anchorHash,
    anchorTimestamp
  });

  proofChain.push(truthEvent);

  return {
    anchorTimestamp,
    eventHash: truthEvent.event_hash,
    truthAnchor: {
      anchor_id: anchorId,
      anchor_timestamp: anchorTimestamp,
      anchor_hash: anchorHash,
      anchor_status: "ANCHORED"
    }
  };
}

function applyTruthAnchorToReceipt(receipt, { truthAnchor, eventHash, proofChain }) {
  return {
    ...receipt,
    proof_preview: {
      ...(receipt.proof_preview || {}),
      head_hash: eventHash,
      events_materialized: proofChain.length,
      external_truth_anchor: true
    },
    proof_chain: proofChain,
    truth_anchor: truthAnchor
  };
}

function deriveSettlementReconciliation({
  reviewId,
  headHash,
  governanceDecision,
  anchorHash,
  chainLength
}) {
  const reconciliationHash = sha256(
    JSON.stringify({
      review_id: reviewId,
      head_hash: headHash,
      governance_decision: governanceDecision,
      anchor_hash: anchorHash,
      chain_length: chainLength
    })
  );

  return {
    reconciliation_id: `EXECUTIA-RECON-${reconciliationHash.slice(0, 16).toUpperCase()}`,
    reconciliation_hash: reconciliationHash
  };
}

function buildSettlementReconciledChainEvent({
  reviewId,
  proofChain,
  reconciliationId,
  reconciliationHash,
  reconciliationTimestamp
}) {
  const previousHash = proofChain[proofChain.length - 1]?.event_hash || null;

  const eventHash = sha256(
    JSON.stringify({
      review_id: reviewId,
      type: SETTLEMENT_RECONCILIATION_EVENT_TYPE,
      reconciliation_id: reconciliationId,
      reconciliation_hash: reconciliationHash,
      previous_hash: previousHash,
      created_at: reconciliationTimestamp
    })
  );

  return {
    index: nextChainIndex(proofChain),
    type: SETTLEMENT_RECONCILIATION_EVENT_TYPE,
    created_at: reconciliationTimestamp,
    reconciliation_id: reconciliationId,
    reconciliation_hash: reconciliationHash,
    previous_hash: previousHash,
    event_hash: eventHash
  };
}

function hasSettlementReconciliation(proofChain) {
  return proofChain.some(
    (event) => event?.type === SETTLEMENT_RECONCILIATION_EVENT_TYPE
  );
}

function appendSettlementReconciliationEvent({
  reviewId,
  proofChain,
  governanceDecision,
  anchorHash
}) {
  const headHash = proofChain[proofChain.length - 1]?.event_hash || null;

  if (!headHash || !anchorHash) {
    return null;
  }

  const reconciliationTimestamp = new Date().toISOString();
  const chainLength = proofChain.length;
  const {
    reconciliation_id: reconciliationId,
    reconciliation_hash: reconciliationHash
  } = deriveSettlementReconciliation({
    reviewId,
    headHash,
    governanceDecision,
    anchorHash,
    chainLength
  });

  const reconciliationEvent = buildSettlementReconciledChainEvent({
    reviewId,
    proofChain,
    reconciliationId,
    reconciliationHash,
    reconciliationTimestamp
  });

  proofChain.push(reconciliationEvent);

  return {
    reconciliationTimestamp,
    eventHash: reconciliationEvent.event_hash,
    reconciliation: {
      reconciliation_id: reconciliationId,
      reconciliation_timestamp: reconciliationTimestamp,
      reconciliation_hash: reconciliationHash,
      reconciliation_status: "RECONCILED"
    }
  };
}

function applySettlementReconciliationToReceipt(receipt, {
  reconciliation,
  eventHash,
  proofChain
}) {
  return {
    ...receipt,
    proof_preview: {
      ...(receipt.proof_preview || {}),
      head_hash: eventHash,
      events_materialized: proofChain.length,
      execution_reconciliation: true
    },
    proof_chain: proofChain,
    reconciliation
  };
}

function materializeSettlementReconciliationOnChain({
  reviewId,
  proofChain,
  governanceDecision,
  truthAnchor,
  receipt
}) {
  if (
    governanceDecision !== "APPROVED" ||
    truthAnchor?.anchor_status !== "ANCHORED" ||
    !truthAnchor?.anchor_hash
  ) {
    return {
      headHash: proofChain[proofChain.length - 1]?.event_hash || null,
      reconciliation: null,
      receipt
    };
  }

  const reconciliationResult = appendSettlementReconciliationEvent({
    reviewId,
    proofChain,
    governanceDecision,
    anchorHash: truthAnchor.anchor_hash
  });

  if (!reconciliationResult) {
    return {
      headHash: proofChain[proofChain.length - 1]?.event_hash || null,
      reconciliation: null,
      receipt
    };
  }

  return {
    headHash: reconciliationResult.eventHash,
    reconciliation: reconciliationResult.reconciliation,
    receipt: applySettlementReconciliationToReceipt(receipt, {
      reconciliation: reconciliationResult.reconciliation,
      eventHash: reconciliationResult.eventHash,
      proofChain
    })
  };
}

async function patchPublicProofRegistry(reviewId, payload) {
  return supabaseRegistryRequest(
    `execution_public_registry?review_id=eq.${encodeURIComponent(reviewId)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    }
  );
}

export async function insertPublicProofRegistry(record) {
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
    headers: registryHeaders(key, {
      Prefer: "return=representation"
    }),
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

export async function getPublicProofRegistryByReviewId(reviewId) {
  const rows = await supabaseRegistryRequest(
    `execution_public_registry?review_id=eq.${encodeURIComponent(reviewId)}&select=*&limit=1`
  );

  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function materializeOperatorGovernanceDecision({
  reviewId,
  decision,
  operator = "EXECUTIA_OPERATOR",
  appUrl = process.env.APP_URL || "https://execution.executia.io"
}) {
  const normalizedReviewId = String(reviewId || "").trim();
  const normalizedDecision = String(decision || "").trim().toUpperCase();
  const normalizedOperator = String(operator || "EXECUTIA_OPERATOR").trim();

  if (!normalizedReviewId) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "REVIEW_ID_REQUIRED"
      }
    };
  }

  if (normalizedDecision !== "APPROVED" && normalizedDecision !== "BLOCKED") {
    return {
      ok: false,
      status: 400,
      error: {
        code: "INVALID_DECISION",
        message: "Decision must be APPROVED or BLOCKED."
      }
    };
  }

  const record = await getPublicProofRegistryByReviewId(normalizedReviewId);

  if (!record) {
    return {
      ok: false,
      status: 404,
      error: {
        code: "REGISTRY_RECORD_NOT_FOUND"
      }
    };
  }

  const proofChain = Array.isArray(record.proof_chain)
    ? [...record.proof_chain]
    : [];

  if (proofChain.some((event) => OPERATOR_EVENT_TYPES.has(event?.type))) {
    return {
      ok: false,
      status: 409,
      error: {
        code: "OPERATOR_DECISION_ALREADY_MATERIALIZED",
        message: "An operator governance decision is already recorded for this review."
      }
    };
  }

  const createdAt = new Date().toISOString();
  const operatorEvent = buildOperatorChainEvent({
    reviewId: normalizedReviewId,
    decision: normalizedDecision,
    operator: normalizedOperator,
    proofChain,
    createdAt
  });

  proofChain.push(operatorEvent);

  let updatedReceipt = buildMaterializedReceipt(record, {
    decision: normalizedDecision,
    operator: normalizedOperator,
    createdAt,
    eventHash: operatorEvent.event_hash,
    proofChain
  });

  let headHash = operatorEvent.event_hash;
  let truthAnchor = null;
  let reconciliation = null;

  if (
    normalizedDecision === "APPROVED" &&
    operatorEvent.type === "OPERATOR_APPROVED"
  ) {
    const anchorResult = appendTruthAnchorEvent({
      reviewId: normalizedReviewId,
      proofChain,
      governanceDecision: normalizedDecision
    });

    if (anchorResult) {
      headHash = anchorResult.eventHash;
      truthAnchor = anchorResult.truthAnchor;
      updatedReceipt = applyTruthAnchorToReceipt(updatedReceipt, {
        truthAnchor,
        eventHash: headHash,
        proofChain
      });

      const settlementResult = materializeSettlementReconciliationOnChain({
        reviewId: normalizedReviewId,
        proofChain,
        governanceDecision: normalizedDecision,
        truthAnchor,
        receipt: updatedReceipt
      });

      headHash = settlementResult.headHash || headHash;
      reconciliation = settlementResult.reconciliation;
      updatedReceipt = settlementResult.receipt;
    }
  }

  const proofPreview = updatedReceipt.proof_preview;

  await patchPublicProofRegistry(normalizedReviewId, {
    status: normalizedDecision,
    governance_decision: normalizedDecision,
    head_hash: headHash,
    proof_chain: proofChain,
    proof_preview: proofPreview,
    analysis: updatedReceipt.analysis,
    receipt: updatedReceipt
  });

  return {
    ok: true,
    status: 200,
    review_id: normalizedReviewId,
    governance_decision: normalizedDecision,
    head_hash: headHash,
    chain_length: proofChain.length,
    truth_anchor: truthAnchor,
    reconciliation,
    public_receipt_url: `${appUrl}/public-proof/?review_id=${encodeURIComponent(normalizedReviewId)}`
  };
}

export async function materializeTruthAnchor({
  reviewId,
  appUrl = process.env.APP_URL || "https://execution.executia.io"
}) {
  const normalizedReviewId = String(reviewId || "").trim();

  if (!normalizedReviewId) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "REVIEW_ID_REQUIRED"
      }
    };
  }

  const record = await getPublicProofRegistryByReviewId(normalizedReviewId);

  if (!record) {
    return {
      ok: false,
      status: 404,
      error: {
        code: "REGISTRY_RECORD_NOT_FOUND"
      }
    };
  }

  const governanceDecision = String(
    record.governance_decision ||
    record.receipt?.analysis?.governance_decision ||
    ""
  ).trim().toUpperCase();

  if (governanceDecision !== "APPROVED") {
    return {
      ok: false,
      status: 409,
      error: {
        code: "TRUTH_ANCHOR_NOT_ELIGIBLE",
        message: "Truth anchoring requires governance_decision APPROVED."
      }
    };
  }

  const proofChain = Array.isArray(record.proof_chain)
    ? [...record.proof_chain]
    : [];

  if (!hasOperatorApproval(proofChain)) {
    return {
      ok: false,
      status: 409,
      error: {
        code: "OPERATOR_APPROVAL_REQUIRED",
        message: "Truth anchoring requires OPERATOR_APPROVED in the proof chain."
      }
    };
  }

  if (hasTruthAnchor(proofChain)) {
    return {
      ok: false,
      status: 409,
      error: {
        code: "TRUTH_ANCHOR_ALREADY_MATERIALIZED",
        message: "A truth anchor is already recorded for this review."
      }
    };
  }

  const anchorResult = appendTruthAnchorEvent({
    reviewId: normalizedReviewId,
    proofChain,
    governanceDecision
  });

  if (!anchorResult) {
    return {
      ok: false,
      status: 500,
      error: {
        code: "TRUTH_ANCHOR_FAILED",
        message: "Unable to derive truth anchor from proof chain head."
      }
    };
  }

  const updatedReceipt = applyTruthAnchorToReceipt(record.receipt || {}, {
    truthAnchor: anchorResult.truthAnchor,
    eventHash: anchorResult.eventHash,
    proofChain
  });

  const settlementResult = materializeSettlementReconciliationOnChain({
    reviewId: normalizedReviewId,
    proofChain,
    governanceDecision,
    truthAnchor: anchorResult.truthAnchor,
    receipt: updatedReceipt
  });

  const finalReceipt = settlementResult.receipt;
  const proofPreview = finalReceipt.proof_preview;

  await patchPublicProofRegistry(normalizedReviewId, {
    head_hash: settlementResult.headHash || anchorResult.eventHash,
    proof_chain: proofChain,
    proof_preview: proofPreview,
    receipt: finalReceipt
  });

  return {
    ok: true,
    status: 200,
    review_id: normalizedReviewId,
    governance_decision: governanceDecision,
    head_hash: settlementResult.headHash || anchorResult.eventHash,
    chain_length: proofChain.length,
    truth_anchor: anchorResult.truthAnchor,
    reconciliation: settlementResult.reconciliation,
    public_receipt_url: `${appUrl}/public-proof/?review_id=${encodeURIComponent(normalizedReviewId)}`
  };
}

export async function materializeSettlementReconciliation({
  reviewId,
  appUrl = process.env.APP_URL || "https://execution.executia.io"
}) {
  const normalizedReviewId = String(reviewId || "").trim();

  if (!normalizedReviewId) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "REVIEW_ID_REQUIRED"
      }
    };
  }

  const record = await getPublicProofRegistryByReviewId(normalizedReviewId);

  if (!record) {
    return {
      ok: false,
      status: 404,
      error: {
        code: "REGISTRY_RECORD_NOT_FOUND"
      }
    };
  }

  const governanceDecision = String(
    record.governance_decision ||
    record.receipt?.analysis?.governance_decision ||
    ""
  ).trim().toUpperCase();

  if (governanceDecision !== "APPROVED") {
    return {
      ok: false,
      status: 409,
      error: {
        code: "SETTLEMENT_RECONCILIATION_NOT_ELIGIBLE",
        message: "Settlement reconciliation requires governance_decision APPROVED."
      }
    };
  }

  const truthAnchor = record.receipt?.truth_anchor || null;

  if (truthAnchor?.anchor_status !== "ANCHORED" || !truthAnchor?.anchor_hash) {
    return {
      ok: false,
      status: 409,
      error: {
        code: "TRUTH_ANCHOR_REQUIRED",
        message: "Settlement reconciliation requires truth_anchor.anchor_status ANCHORED."
      }
    };
  }

  const proofChain = Array.isArray(record.proof_chain)
    ? [...record.proof_chain]
    : [];

  if (!hasTruthAnchor(proofChain)) {
    return {
      ok: false,
      status: 409,
      error: {
        code: "TRUTH_ANCHOR_EVENT_REQUIRED",
        message: "Settlement reconciliation requires TRUTH_ANCHORED in the proof chain."
      }
    };
  }

  if (hasSettlementReconciliation(proofChain)) {
    return {
      ok: false,
      status: 409,
      error: {
        code: "SETTLEMENT_RECONCILIATION_ALREADY_MATERIALIZED",
        message: "Settlement reconciliation is already recorded for this review."
      }
    };
  }

  const settlementResult = materializeSettlementReconciliationOnChain({
    reviewId: normalizedReviewId,
    proofChain,
    governanceDecision,
    truthAnchor,
    receipt: record.receipt || {}
  });

  if (!settlementResult.reconciliation) {
    return {
      ok: false,
      status: 500,
      error: {
        code: "SETTLEMENT_RECONCILIATION_FAILED",
        message: "Unable to derive settlement reconciliation from anchored proof chain."
      }
    };
  }

  const proofPreview = settlementResult.receipt.proof_preview;

  await patchPublicProofRegistry(normalizedReviewId, {
    head_hash: settlementResult.headHash,
    proof_chain: proofChain,
    proof_preview: proofPreview,
    receipt: settlementResult.receipt
  });

  return {
    ok: true,
    status: 200,
    review_id: normalizedReviewId,
    governance_decision: governanceDecision,
    head_hash: settlementResult.headHash,
    chain_length: proofChain.length,
    reconciliation: settlementResult.reconciliation,
    public_receipt_url: `${appUrl}/public-proof/?review_id=${encodeURIComponent(normalizedReviewId)}`
  };
}
