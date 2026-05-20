export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok:false,
      error:{
        code:"METHOD_NOT_ALLOWED",
        message:"Only GET is allowed."
      }
    });
  }

  const reviewId =
    req.query?.review_id ||
    req.query?.id ||
    "";

  if (!reviewId) {
    return res.status(400).json({
      ok:false,
      error:{
        code:"REVIEW_ID_REQUIRED",
        message:"review_id is required."
      }
    });
  }

  const base =
    process.env.APP_URL ||
    "https://execution.executia.io";

  try {
    const response = await fetch(
      `${base}/api/v1/execution/registry?review_id=${encodeURIComponent(reviewId)}`
    );

    const registryData = await response.json();

    if (!response.ok || !registryData.ok) {
      return res.status(404).json({
        ok:false,
        verified:false,
        review_id:reviewId,
        error:{
          code:"PROOF_NOT_FOUND",
          message:"No registry proof receipt found for this review_id."
        }
      });
    }

    const receipt =
      registryData.receipt ||
      registryData.record?.receipt ||
      null;

    if (!receipt) {
      return res.status(409).json({
        ok:false,
        verified:false,
        review_id:reviewId,
        error:{
          code:"RECEIPT_PAYLOAD_MISSING",
          message:"Registry record exists, but receipt payload is missing."
        }
      });
    }

    const proof = receipt.proof_preview || {};
    const analysis = receipt.analysis || {};
    const submission = receipt.submission || {};
    const chain = Array.isArray(receipt.proof_chain)
      ? receipt.proof_chain
      : [];

    const hasHeadHash = Boolean(proof.head_hash);
    const hasChain = chain.length > 0;
    const hasDecision = Boolean(analysis.governance_decision);

    const verified =
      hasHeadHash &&
      hasChain &&
      hasDecision;

    return res.status(200).json({
      ok:true,
      verified,
      review_id:reviewId,
      state:submission.status || null,
      governance_decision:analysis.governance_decision || null,
      risk_level:analysis.risk_level || null,
      proof:{
        head_hash:proof.head_hash || null,
        chain_length:chain.length,
        has_head_hash:hasHeadHash,
        has_chain:hasChain,
        has_governance_decision:hasDecision
      },
      public_receipt_url:`${base}/public-proof/?review_id=${encodeURIComponent(reviewId)}`
    });

  } catch (error) {
    return res.status(500).json({
      ok:false,
      verified:false,
      review_id:reviewId,
      error:{
        code:"VERIFY_FAILED",
        message:error.message || "Proof verification failed."
      }
    });
  }
}
