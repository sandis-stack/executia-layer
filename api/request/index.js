import { createClient } from "@supabase/supabase-js";

function getSupabase(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if(!url || !key){
    return {
      ok:false,
      error:"SUPABASE_ENV_MISSING"
    };
  }

  return {
    ok:true,
    client:createClient(url, key)
  };
}

export default async function handler(req, res){
  res.setHeader("Content-Type", "application/json");

  if(req.method !== "POST"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  const db = getSupabase();

  if(!db.ok){
    return res.status(500).json({
      ok:false,
      error:db.error
    });
  }

  try{
    const body = req.body || {};

    const payload = {
      organization_name: body.organization || "",
      email: body.email || "",
      execution_domain: body.domain || "",
      current_problem: body.problem || "",
      desired_outcome: body.outcome || "",
      current_stack: body.stack || "",
      request_state: "REQUEST_RECEIVED",
      next_state: "EXECUTION_ANALYSIS_PENDING",
      governance_status: "PENDING",
      analysis_status: "QUEUED"
    };

    const { data, error } = await db.client
      .from("execution_requests")
      .insert(payload)
      .select("id, request_state, next_state, governance_status, analysis_status")
      .single();

    if(error){
      return res.status(500).json({
        ok:false,
        error:"REQUEST_INSERT_FAILED",
        details:error.message
      });
    }

    return res.status(200).json({
      ok:true,
      request_id:data.id,
      state:data.request_state,
      next_state:data.next_state,
      governance_status:data.governance_status,
      analysis_status:data.analysis_status
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:"REQUEST_PIPELINE_FAILED",
      details:error.message
    });
  }
}
