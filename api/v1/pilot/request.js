import crypto from "crypto";

function uuid(){
  return crypto.randomUUID();
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

  return res.status(200).json({
    ok:true,
    review_id:reviewId,
    state:"PILOT_REVIEW_RECEIVED",
    domain:body.domain || "UNKNOWN",
    received_at:createdAt,
    persistence
  });
}
