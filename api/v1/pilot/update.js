async function supabaseRequest(path, options = {}){
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
      Prefer:"return=representation",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  if(!response.ok){
    throw new Error(text || "SUPABASE_REQUEST_FAILED");
  }

  return text ? JSON.parse(text) : [];
}

export default async function handler(req,res){
  try{
    if(req.method !== "POST"){
      return res.status(405).json({
        ok:false,
        error:{code:"METHOD_NOT_ALLOWED"}
      });
    }

    const body = req.body || {};
    const reviewId = String(body.review_id || "").trim();
    const action = String(body.action || "").trim().toUpperCase();

    if(!reviewId){
      return res.status(400).json({
        ok:false,
        error:{code:"REVIEW_ID_REQUIRED"}
      });
    }

    const allowed = {
      APPROVE:"PILOT_APPROVED_FOR_GOVERNANCE_REVIEW",
      REJECT:"PILOT_REJECTED",
      ESCALATE:"PILOT_ESCALATED",
      CLASSIFY:"PILOT_CLASSIFIED"
    };

    const state = allowed[action];

    if(!state){
      return res.status(400).json({
        ok:false,
        error:{code:"INVALID_ACTION"}
      });
    }

    const existingRows = await supabaseRequest(
      `pilot_requests?review_id=eq.${encodeURIComponent(reviewId)}&select=payload&limit=1`
    );

    const existingPayload = Array.isArray(existingRows)
      ? existingRows[0]?.payload || {}
      : {};

    const history = Array.isArray(existingPayload.history)
      ? existingPayload.history
      : [];

    const nextPayload = {
      ...existingPayload,
      last_action:action,
      last_state:state,
      updated_at:new Date().toISOString(),
      history:[
        ...history,
        {
          action,
          state,
          at:new Date().toISOString()
        }
      ]
    };

    const rows = await supabaseRequest(
      `pilot_requests?review_id=eq.${encodeURIComponent(reviewId)}`,
      {
        method:"PATCH",
        body:JSON.stringify({
          state,
          payload:nextPayload
        })
      }
    );

    return res.status(200).json({
      ok:true,
      review_id:reviewId,
      action,
      state,
      row:Array.isArray(rows) ? rows[0] : null
    });
  }catch(error){
    return res.status(500).json({
      ok:false,
      error:{
        code:"PILOT_UPDATE_FAILED",
        message:error.message || "Pilot update failed."
      }
    });
  }
}
