import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res){
  if(req.method !== "POST"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
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

    const { data, error } = await supabase
      .from("execution_requests")
      .insert(payload)
      .select()
      .single();

    if(error){
      console.error(error);

      return res.status(500).json({
        ok:false,
        error:"REQUEST_INSERT_FAILED"
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
    console.error(error);

    return res.status(500).json({
      ok:false,
      error:"REQUEST_PIPELINE_FAILED"
    });
  }
}
