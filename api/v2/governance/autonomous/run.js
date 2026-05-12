import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  buildGovernanceRuntime
} from "../../../../services/governance-runtime.js";

import {
  runAutonomousGovernanceLoop
} from "../../../../services/governance-autonomous-loop.js";

function json(res, status, body){
  return res.status(status).json(body);
}

export default async function handler(req, res){
  try{
    if(req.method !== "POST"){
      return json(res, 405, {
        ok:false,
        error:{
          code:"METHOD_NOT_ALLOWED"
        }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.write"
    );

    if(!permission.ok && context?.user?.role !== "OPERATOR"){
      return json(res, 401, {
        ok:false,
        error:{
          code:"INVALID_JWT",
          message:"Governance autonomous runtime permission required."
        }
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const review_id =
      body.review_id ||
      body.reviewId ||
      null;

    const execution_id =
      body.execution_id ||
      body.executionId ||
      null;

    if(!review_id && !execution_id){
      return json(res, 400, {
        ok:false,
        error:{
          code:"REVIEW_OR_EXECUTION_REQUIRED"
        }
      });
    }

    const runtime = await buildGovernanceRuntime({
      review_id,
      execution_id
    });

    const cycle = await runAutonomousGovernanceLoop({
      runtime,
      review_id,
      execution_id
    });

    const supabase = db();

    const autonomousEvent = {
      review_id: review_id || null,
      execution_id: execution_id || null,
      event_type: "GOVERNANCE_AUTONOMOUS_RUNTIME_CYCLE",
      event_state:
        cycle?.autonomous?.autonomous_state ||
        "AUTONOMOUS_UNKNOWN",
      actor:
        context?.user?.email ||
        "autonomous@executia.io",
      payload:{
        autonomous: cycle.autonomous,
        watchdog: cycle.watchdog,
        orchestrator: cycle.orchestrator,
        containment: cycle.containment,
        recovery: cycle.recovery
      },
      metadata:{
        source:"autonomous_runtime_loop",
        organization_id:
          context?.organization_id || null,
        generated_at:
          cycle.generated_at || new Date().toISOString()
      },
      created_at:new Date().toISOString()
    };

    await supabase
      .from("audit_events")
      .insert(autonomousEvent);

    return json(res, 200, {
      ok:true,
      mode:"EXECUTIA_AUTONOMOUS_GOVERNANCE_LOOP",
      cycle,
      persisted:true,
      autonomous_event:autonomousEvent
    });

  }catch(error){
    return json(res, 500, {
      ok:false,
      error:{
        code:"AUTONOMOUS_RUNTIME_FAILED",
        message:error.message
      }
    });
  }
}
