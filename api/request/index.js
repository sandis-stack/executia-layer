import { db } from "../../services/db.js";
import { Resend } from "resend";

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

    const organization = body.organization || "";
    const email = body.email || "";
    const domain = body.domain || "";
    const problem = body.problem || "";
    const outcome = body.outcome || "";
    const stack = body.stack || "";

    const text = [
      domain,
      problem,
      outcome,
      stack
    ].join(" ").toLowerCase();

    const highRisk =
      text.includes("compliance") ||
      text.includes("audit") ||
      text.includes("payment") ||
      text.includes("procurement") ||
      text.includes("government") ||
      text.includes("approval");

    const driftRisk =
      text.includes("delay") ||
      text.includes("drift") ||
      text.includes("manual") ||
      text.includes("uncertainty") ||
      text.includes("error");

    const stackDepth = (stack)
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .length;

    const payload = {
      organization_name: organization,
      email: email,
      execution_domain: domain,
      current_problem: problem,
      desired_outcome: outcome,
      current_stack: stack,
      request_state: "REQUEST_RECEIVED",
      next_state: "EXECUTION_ANALYSIS_PENDING",
      governance_status: "PENDING",
      analysis_status: "AUTO_CLASSIFIED",

      execution_complexity: stackDepth >= 4 ? "HIGH" : stackDepth >= 2 ? "MEDIUM" : "LOW",
      governance_risk: highRisk ? "HIGH" : "MEDIUM",
      drift_risk: driftRisk ? "HIGH" : "MEDIUM",
      compliance_intensity: text.includes("compliance") || text.includes("audit") ? "HIGH" : "STANDARD",
      execution_layer_count: Math.max(stackDepth, 1),
      estimated_savings: highRisk || driftRisk ? "MEASURABLE" : "REQUIRES_ANALYSIS"
    };

    const { data, error } = await db()
      .from("execution_requests")
      .insert(payload)
      .select("id, request_state, next_state, governance_status, analysis_status, execution_complexity, governance_risk, drift_risk, compliance_intensity, execution_layer_count, estimated_savings")
      .single();

    if(error){
      return res.status(500).json({
        ok:false,
        error:"REQUEST_INSERT_FAILED",
        details:error.message
      });
    }

    let governanceReviewId = null;

    try{
      const reviewPayload = {
        execution_id: data.id,
        review_status: "OPEN",
        governance_decision: "PENDING_REVIEW",
        policy_decision: "PENDING_REVIEW",
        risk_score:
          payload.governance_risk === "HIGH" || payload.drift_risk === "HIGH"
            ? 85
            : 55,
        requested_by: email || "system",
        escalation_level:
          payload.governance_risk === "HIGH"
            ? 2
            : 1,
        review_reason: "AUTO GENERATED FROM EXECUTION REQUEST",
        governance_payload: {
          request_id: data.id,
          organization,
          domain,
          problem,
          outcome,
          stack,
          governance_risk: payload.governance_risk,
          drift_risk: payload.drift_risk,
          execution_complexity: payload.execution_complexity,
          estimated_savings: payload.estimated_savings
        },
        policy_payload: {
          source: "execution_request",
          analysis_status: payload.analysis_status,
          compliance_intensity: payload.compliance_intensity,
          execution_layer_count: payload.execution_layer_count
        }
      };

      const reviewInsert = await db()
        .from("governance_reviews")
        .insert(reviewPayload)
        .select("id")
        .single();

      if(!reviewInsert.error && reviewInsert.data){
        governanceReviewId = reviewInsert.data.id;

        const events = [
          {
            review_id: governanceReviewId,
            execution_id: data.id,
            actor: "system",
            event_type: "REQUEST_RECEIVED",
            payload: {
              request_id: data.id,
              organization,
              domain
            }
          },
          {
            review_id: governanceReviewId,
            execution_id: data.id,
            actor: "system",
            event_type: "AUTO_ANALYSIS_COMPLETED",
            payload: {
              execution_complexity: payload.execution_complexity,
              governance_risk: payload.governance_risk,
              drift_risk: payload.drift_risk,
              compliance_intensity: payload.compliance_intensity,
              estimated_savings: payload.estimated_savings
            }
          },
          {
            review_id: governanceReviewId,
            execution_id: data.id,
            actor: "system",
            event_type: payload.governance_risk === "HIGH" || payload.drift_risk === "HIGH"
              ? "HIGH_RISK_DETECTED"
              : "STANDARD_RISK_DETECTED",
            payload: {
              risk_score: reviewPayload.risk_score,
              escalation_level: reviewPayload.escalation_level
            }
          },
          {
            review_id: governanceReviewId,
            execution_id: data.id,
            actor: "system",
            event_type: "GOVERNANCE_REVIEW_OPENED",
            payload: {
              review_status: "OPEN",
              governance_decision: "PENDING_REVIEW"
            }
          }
        ];

        await db()
          .from("governance_review_events")
          .insert(events);
      }

    }catch(governanceError){
      console.error("AUTO_GOVERNANCE_REVIEW_FAILED", governanceError);
    }

    try{
      if(!process.env.RESEND_API_KEY || !process.env.OPERATOR_EMAIL){
        throw new Error("RESEND_ENV_MISSING");
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from:"EXECUTIA <noreply@executia.io>",
        to:process.env.OPERATOR_EMAIL,
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
      analysis_status:data.analysis_status,
      execution_complexity:data.execution_complexity,
      governance_risk:data.governance_risk,
      drift_risk:data.drift_risk,
      compliance_intensity:data.compliance_intensity,
      execution_layer_count:data.execution_layer_count,
      estimated_savings:data.estimated_savings,
      governance_review_id:governanceReviewId
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:error.code || "REQUEST_PIPELINE_FAILED",
      details:error.message
    });
  }
}
