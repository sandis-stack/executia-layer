import { db } from "../../services/db.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res){
  res.setHeader("Content-Type", "application/json");

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

    const { data, error } = await db()
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

    try{
      await resend.emails.send({
        from:"EXECUTIA <onboarding@resend.dev>",
        to:process.env.REQUEST_NOTIFY_EMAIL,
        subject:"New EXECUTIA Execution Request",
        html:`
          <h2>New Execution Intake Request</h2>

          <p><strong>Organization:</strong> ${organization}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Domain:</strong> ${domain}</p>

          <p><strong>Problem:</strong><br>${problem}</p>

          <p><strong>Desired Outcome:</strong><br>${outcome}</p>

          <p><strong>Current Stack:</strong><br>${stack}</p>

          <p><strong>Request ID:</strong><br>${data.id}</p>
        `
      });
    }catch(emailError){
      console.error("REQUEST_EMAIL_FAILED", emailError);
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
      error:error.code || "REQUEST_PIPELINE_FAILED",
      details:error.message
    });
  }
}
