import crypto from "crypto";
import { supabaseAdmin } from "./supabase.js";

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
  const payload = {
    type,
    rule,
    reason,
    context,
    actor,
    created_at: new Date().toISOString()
  };

  const hash = sha256(payload);

  const { data, error } = await supabaseAdmin
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
