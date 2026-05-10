import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

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

function sha256(input) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export async function materializeConstitutionEvent({
  type,
  rule,
  reason = null,
  context = {},
  actor = null
}) {
  const supabase = getSupabaseAdmin();

  const payload = {
    type,
    rule,
    reason,
    context,
    actor,
    created_at: new Date().toISOString()
  };

  const hash = sha256(payload);

  const { data, error } = await supabase
    .from("governance_events")
    .insert({
      event_type: type,
      event_payload: payload,
      hash
    })
    .select()
    .single();

  if (error) {
    console.error("[CONSTITUTION_EVENT_ERROR]", error);
    return {
      ok: false,
      error
    };
  }

  return {
    ok: true,
    hash,
    event: data
  };
}
