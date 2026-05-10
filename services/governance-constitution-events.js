import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import { insertGovernanceEvent } from "./governance-hash.js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    realtime: {
      transport: ws
    }
  });
}

export async function materializeConstitutionEvent({
  type,
  rule,
  reason = null,
  context = {},
  actor = null
}) {
  const supabase = getSupabaseAdmin();

  const event = {
    review_id:
      context.review_id ||
      context.reviewId ||
      "00000000-0000-0000-0000-000000000000",

    execution_id:
      context.execution_id ||
      context.executionId ||
      null,

    actor:
      actor?.email ||
      actor?.id ||
      context.actor ||
      "constitution@executia.io",

    event_type: type,

    payload: {
      rule,
      reason,
      context,
      actor
    }
  };

  try {
    const data = await insertGovernanceEvent({
      supabase,
      event
    });

    return {
      ok: true,
      hash: data.hash,
      event: data
    };
  } catch (error) {
    console.error("[CONSTITUTION_EVENT_ERROR]", error);

    return {
      ok: false,
      error: {
        code: error.code || "CONSTITUTION_EVENT_INSERT_FAILED",
        message: error.message || "Failed to materialize constitution event."
      }
    };
  }
}
