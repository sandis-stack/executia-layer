import { db } from "../../../services/db.js";

export default async function handler(req, res){
  res.setHeader("Content-Type", "application/json");

  if(req.method !== "GET"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  try{
    const { data, error } = await db()
      .from("execution_requests")
      .select("*")
      .order("created_at", { ascending:false })
      .limit(50);

    if(error){
      return res.status(500).json({
        ok:false,
        error:"REQUEST_LIST_FAILED",
        details:error.message
      });
    }

    return res.status(200).json({
      ok:true,
      count:data.length,
      requests:data
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:error.code || "REQUEST_LIST_PIPELINE_FAILED",
      details:error.message
    });
  }
}
