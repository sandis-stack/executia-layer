import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  getGovernanceQuorumState
} from "../../../../services/governance-quorum.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  try {

    if(req.method !== "GET"){
      return json(res, 405, {
        ok:false,
        error:{
          code:"METHOD_NOT_ALLOWED"
        }
      });
    }

    const context =
      await resolveJwtContext(req);

    const permission =
      requireJwtPermission(
        context,
        "governance.review.read"
      );

    if(!permission.ok){
      return json(res, 401, {
        ok:false,
        error:{
          code:"INVALID_JWT",
          message:
            permission.reason ||
            "Governance quorum permission required."
        }
      });
    }

    const review_id =
      req.query.review_id;

    if(!review_id){
      return json(res, 400, {
        ok:false,
        error:{
          code:"REVIEW_ID_REQUIRED"
        }
      });
    }

    const result =
      await getGovernanceQuorumState({
        supabase: db(),
        review_id
      });

    return json(res, 200, {
      ok:true,
      scope:"EXECUTIA_GOVERNANCE_QUORUM",
      ...result
    });

  } catch(error){

    console.error(
      "[EXECUTIA GOVERNANCE QUORUM ERROR]",
      error
    );

    return json(res, 500, {
      ok:false,
      error:{
        code:
          error.code ||
          "GOVERNANCE_QUORUM_FAILED",
        message:
          error.message ||
          "Governance quorum failed."
      }
    });

  }
}
