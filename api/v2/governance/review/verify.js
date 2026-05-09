import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  verifyGovernanceHashChain
} from "../../../../services/governance-hash.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

function db() {
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        transport: ws
      }
    }
  );
}

export default async function handler(req, res) {

  try {

    if(req.method !== "GET") {
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
            "Governance verification permission required."
        }
      });
    }

    const review_id =
      req.query.review_id;

    const result =
      await verifyGovernanceHashChain({
        supabase: db(),
        review_id
      });

    return json(res, 200, result);

  } catch(error){

    console.error(
      "[EXECUTIA GOVERNANCE VERIFY ERROR]",
      error
    );

    return json(res, 500, {
      ok:false,
      error:{
        code:
          error.code ||
          "GOVERNANCE_VERIFY_FAILED",
        message:
          error.message ||
          "Governance verify failed."
      }
    });

  }

}
