async function supabaseRequest(path){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if(!url || !key){
    throw new Error("SUPABASE_ENV_MISSING");
  }

  const response = await fetch(`${url}/rest/v1/${path}`,{
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      "Content-Type":"application/json"
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
    if(req.method !== "GET"){
      return res.status(405).json({
        ok:false,
        error:{code:"METHOD_NOT_ALLOWED"}
      });
    }

    const rows = await supabaseRequest(
      "pilot_requests?select=review_id,organization,domain,risk,current_system,state,created_at&order=created_at.desc&limit=5"
    );

    return res.status(200).json({
      ok:true,
      engine:"EXECUTIA_PILOT_INTAKE_REGISTRY_V1",
      requests:rows
    });
  }catch(error){
    return res.status(500).json({
      ok:false,
      error:{
        code:"PILOT_INTAKE_LIST_FAILED",
        message:error.message || "Pilot intake list failed."
      }
    });
  }
}
