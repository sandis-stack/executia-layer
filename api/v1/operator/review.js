import crypto from "crypto";

function sha256(value){
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

async function supabaseRequest(path, options = {}) {

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if(!url || !key){
    throw new Error("SUPABASE_ENV_MISSING");
  }

  const response = await fetch(`${url}/rest/v1/${path}`,{
    ...options,
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      "Content-Type":"application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data = null;

  try{
    data = text ? JSON.parse(text) : null;
  }catch{
    data = text;
  }

  if(!response.ok){

    const message =
      data?.message ||
      data?.hint ||
      data?.details ||
      text ||
      "SUPABASE_REQUEST_FAILED";

    throw new Error(message);
  }

  return data;
}

export default async function handler(req,res){

  res.setHeader("Content-Type","application/json");

  try{

    if(req.method !== "POST"){

      return res.status(405).json({
        ok:false,
        error:{
          code:"METHOD_NOT_ALLOWED"
        }
      });

    }

    const body = req.body || {};

    const reviewId =
      String(body.review_id || "").trim();

    const decision =
      String(body.decision || "").trim().toUpperCase();

    const operator =
      String(body.operator || "EXECUTIA_OPERATOR");

    if(!reviewId){

      return res.status(400).json({
        ok:false,
        error:{
          code:"REVIEW_ID_REQUIRED"
        }
      });

    }

    if(
      decision !== "APPROVED" &&
      decision !== "BLOCKED"
    ){

      return res.status(400).json({
        ok:false,
        error:{
          code:"INVALID_DECISION",
          message:"Decision must be APPROVED or BLOCKED."
        }
      });

    }

    const rows = await supabaseRequest(
      `execution_public_registry?review_id=eq.${encodeURIComponent(reviewId)}&select=*&limit=1`
    );

    const record =
      Array.isArray(rows)
        ? rows[0]
        : null;

    if(!record){

      return res.status(404).json({
        ok:false,
        error:{
          code:"REGISTRY_RECORD_NOT_FOUND"
        }
      });

    }

    const proofChain =
      Array.isArray(record.proof_chain)
        ? [...record.proof_chain]
        : [];

    const previousHash =
      proofChain[proofChain.length - 1]?.event_hash ||
      null;

    const createdAt =
      new Date().toISOString();

    const decisionHash =
      sha256(
        JSON.stringify({
          review_id:reviewId,
          decision,
          operator,
          previous_hash:previousHash,
          created_at:createdAt
        })
      );

    proofChain.push({
      index:proofChain.length + 1,
      type:`OPERATOR_${decision}`,
      created_at:createdAt,
      operator,
      previous_hash:previousHash,
      event_hash:decisionHash
    });

    const updatedReceipt = {
      ...(record.receipt || {}),
      operator_review:{
        decision,
        operator,
        created_at:createdAt,
        event_hash:decisionHash
      },
      proof_chain:proofChain
    };

    const update = await supabaseRequest(
      `execution_public_registry?review_id=eq.${encodeURIComponent(reviewId)}`,
      {
        method:"PATCH",
        headers:{
          Prefer:"return=representation"
        },
        body:JSON.stringify({
          status:decision,
          governance_decision:decision,
          head_hash:decisionHash,
          proof_chain:proofChain,
          receipt:updatedReceipt
        })
      }
    );

    return res.status(200).json({
      ok:true,
      review_id:reviewId,
      governance_decision:decision,
      head_hash:decisionHash,
      chain_length:proofChain.length,
      operator,
      updated:update?.[0] || null
    });

  }catch(error){

    return res.status(500).json({
      ok:false,
      error:{
        code:"OPERATOR_REVIEW_FAILED",
        message:error.message || "Operator review failed."
      }
    });

  }

}
