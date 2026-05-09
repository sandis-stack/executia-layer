import { json } from "../../../lib/http.js";
import { db } from "../../../services/db.js";
import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../services/jwt-auth.js";

import { resumeGovernedExecution }
from "../../../engine/execution-resume-engine.js";

export default async function handler(req, res){

  if(req.method !== "POST"){
    return json(res, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "POST required."
      }
    });
  }

  try{

    const context = await resolveJwtContext(req);

    const permission =
      requireJwtPermission(
        context,
        "governance.review.approve"
      );

    if(!permission.ok){
      return json(res, permission.status || 403, {
        ok: false,
        error: {
          code: permission.error || "FORBIDDEN",
          message:
            permission.reason ||
            "Governance resume permission required."
        }
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const review_id = body.review_id;

    if(!review_id){
      return json(res, 400, {
        ok: false,
        error: {
          code: "REVIEW_ID_REQUIRED",
          message: "review_id required."
        }
      });
    }

    const result =
      await resumeGovernedExecution({
        review_id,
        operator_id: context.user.id,
        organization_id: context.organization_id
      });

    return json(res, 200, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      result
    });

  }catch(error){

    console.error(
      "[EXECUTIA GOVERNANCE RESUME ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_RESUME_FAILED",
        message:
          error.message ||
          "Governance resume failed."
      }
    });
  }
}
