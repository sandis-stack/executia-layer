export default async function handler(req, res){
  if(req.method !== "POST"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  try{
    const body = req.body || {};

    console.log("EXECUTIA REQUEST:", {
      timestamp:new Date().toISOString(),
      organization:body.organization || null,
      email:body.email || null,
      domain:body.domain || null,
      problem:body.problem || null,
      outcome:body.outcome || null,
      stack:body.stack || null
    });

    return res.status(200).json({
      ok:true,
      state:"REQUEST_RECEIVED",
      next:"EXECUTION_ANALYSIS_PENDING"
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:error.message
    });
  }
}
