import crypto from "crypto";
import { sendPilotReceivedNotification } from "../../../services/executia-notifications.js";
import { insertPublicProofRegistry } from "../../../services/public-proof-registry.js";

function uuid(){
  return crypto.randomUUID();
}

function sha256(value){
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function buildPilotProofChain({ reviewId, record, createdAt }){
  const seed = JSON.stringify({
    review_id:reviewId,
    organization:record.organization,
    domain:record.domain,
    state:record.state,
    created_at:createdAt
  });

  const receivedHash = sha256("PILOT_REQUEST_RECEIVED:" + seed);
  const registeredHash = sha256("PILOT_REVIEW_REGISTERED:" + receivedHash);
  const notificationHash = sha256("PILOT_NOTIFICATION_PREPARED:" + registeredHash);

  return [
    {
      index:1,
      type:"PILOT_REQUEST_RECEIVED",
      created_at:createdAt,
      event_hash:receivedHash
    },
    {
      index:2,
      type:"PILOT_REVIEW_REGISTERED",
      created_at:createdAt,
      event_hash:registeredHash,
      previous_hash:receivedHash
    },
    {
      index:3,
      type:"PILOT_NOTIFICATION_PREPARED",
      created_at:createdAt,
      event_hash:notificationHash,
      previous_hash:registeredHash
    }
  ];
}



async function insertPilotRequest(record){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if(!url || !key){
    return {
      persisted:false,
      reason:"SUPABASE_ENV_MISSING"
    };
  }

  const response = await fetch(`${url}/rest/v1/pilot_requests`,{
    method:"POST",
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      "Content-Type":"application/json",
      Prefer:"return=representation"
    },
    body:JSON.stringify(record)
  });

  const text = await response.text();

  if(!response.ok){
    return {
      persisted:false,
      reason:text || "SUPABASE_INSERT_FAILED"
    };
  }

  try{
    return {
      persisted:true,
      row:text ? JSON.parse(text)?.[0] : null
    };
  }catch{
    return {
      persisted:true,
      row:null
    };
  }
}

export default async function handler(req,res){

  if(req.method !== "POST"){
    return res.status(405).json({
      ok:false,
      error:{
        code:"METHOD_NOT_ALLOWED"
      }
    });
  }

  const body = req.body || {};
  const reviewId = uuid();
  const createdAt = new Date().toISOString();

  const record = {
    review_id:reviewId,
    organization:body.organization || null,
    domain:body.domain || null,
    risk:body.risk || null,
    current_system:body.system || null,
    problem:body.problem || null,
    contact:body.contact || null,
    email:body.email || null,
    state:"PILOT_REVIEW_RECEIVED",
    payload:{
      ...body,
      source:"EXECUTIA_REQUEST_PILOT_FLOW",
      created_at:createdAt
    }
  };

  const persistence = await insertPilotRequest(record);
  const proofChain = buildPilotProofChain({ reviewId, record, createdAt });
  const headHash = proofChain[proofChain.length - 1]?.event_hash || null;

  const submission = {
    submission_id:persistence?.row?.id || reviewId,
    review_id:reviewId,
    created_at:createdAt,
    status:"PILOT_REVIEW_RECEIVED",
    verification_url:`https://execution.executia.io/public-proof/?review_id=${reviewId}`,
    qr_verification_payload:`EXECUTIA_VERIFY:${reviewId}`
  };

  const analysis = {
    execution_domain:record.domain || "PILOT_REQUEST",
    governance_decision:"PENDING_REVIEW",
    execution_score:70,
    risk_level:record.risk || "PILOT_REVIEW",
    pilot_readiness:"READY_FOR_OPERATOR_REVIEW",
    required_governance_controls:[
      "Operator review required.",
      "Pilot scope must be defined before execution commitment.",
      "Governance constraints must be validated before materialization."
    ]
  };

  const proofPreview = {
    immutable_chain_prepared:true,
    events_materialized:proofChain.length,
    head_hash:headHash,
    operator_signature_required:true,
    timestamp_anchor_required:true,
    regulator_verification_available:true,
    external_notary_ready:false
  };

  const receipt = {
    ok:true,
    engine:"EXECUTIA_PILOT_REQUEST_ENGINE_V1",
    mode:"PUBLIC_PILOT_REQUEST",
    submission,
    analysis,
    proof_preview:proofPreview,
    proof_chain:proofChain,
    next_action:{
      type:"OPERATOR_REVIEW",
      request_pilot_url:`https://execution.executia.io/request-pilot/?review_id=${reviewId}`
    }
  };

  const registry = await insertPublicProofRegistry({
    review_id:reviewId,
    submission_id:submission.submission_id,
    status:analysis.governance_decision,
    execution_domain:analysis.execution_domain,
    governance_decision:analysis.governance_decision,
    execution_score:analysis.execution_score,
    risk_level:analysis.risk_level,
    pilot_readiness:analysis.pilot_readiness,
    head_hash:headHash,
    input:record.payload,
    analysis,
    proof_preview:proofPreview,
    proof_chain:proofChain,
    receipt
  });

  const emailDelivery = await sendPilotReceivedNotification(record);

  return res.status(200).json({
    ok:true,
    review_id:reviewId,
    state:"PILOT_REVIEW_RECEIVED",
    domain:body.domain || "UNKNOWN",
    received_at:createdAt,
    persistence,
    registry,
    public_receipt_url:`https://execution.executia.io/public-proof/?review_id=${reviewId}`,
    verification_url:`https://execution.executia.io/api/v1/proof/verify?review_id=${reviewId}`,
    email_delivery:emailDelivery
  });
}
