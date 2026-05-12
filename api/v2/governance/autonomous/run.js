import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  buildGovernanceRuntimeState
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
          message:"Autonomous governance permission required."
        }
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const review_id =
      body.review_id ||
      body.reviewId ||
      null;

    const execution_id =
      body.execution_id ||
      body.executionId ||
      null;

    const supabase = db();

    const runtime = await buildGovernanceRuntimeState({
      supabase,
      review_id,
      execution_id
    });

    const autonomous =
      await runAutonomousGovernanceLoop({
        runtime,
        review_id,
        execution_id
      });

    return json(res, 200, autonomous);

  }catch(error){

    console.error(
      "[EXECUTIA AUTONOMOUS GOVERNANCE LOOP ERROR]",
      error
    );

    return json(res, 500, {
      ok:false,
      error:{
        code:
          error.code ||
          "AUTONOMOUS_GOVERNANCE_FAILED",

        message:
          error.message ||
          "Autonomous governance loop failed."
      }
    });
  }
}
