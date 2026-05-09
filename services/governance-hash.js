import crypto from "crypto";

function stableJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }

  return "{" + Object.keys(value).sort().map((key) => {
    return JSON.stringify(key) + ":" + stableJson(value[key]);
  }).join(",") + "}";
}

export function hashGovernanceEvent(event, prev_hash = null) {
  const payload = {
    review_id: event.review_id || null,
    execution_id: event.execution_id || null,
    actor: event.actor || null,
    event_type: event.event_type || null,
    payload: event.payload || {},
    created_at: event.created_at || null,
    prev_hash
  };

  return crypto
    .createHash("sha256")
    .update(stableJson(payload))
    .digest("hex");
}

export async function attachGovernanceHash({ supabase, event }) {
  if (!supabase) throw new Error("SUPABASE_CLIENT_MISSING");
  if (!event?.review_id) throw new Error("REVIEW_ID_REQUIRED");

  const { data: previousEvents, error } = await supabase
    .from("governance_review_events")
    .select("hash, sequence_no, created_at")
    .eq("review_id", event.review_id)
    .not("hash", "is", null)
    .order("sequence_no", { ascending: false })
    .limit(1);

  if (error) throw error;

  const prev_hash = previousEvents?.[0]?.hash || null;
  const hash = hashGovernanceEvent(event, prev_hash);

  return {
    ...event,
    prev_hash,
    hash
  };
}

export async function insertGovernanceEvent({ supabase, event }) {
  const hashedEvent = await attachGovernanceHash({ supabase, event });

  const { data, error } = await supabase
    .from("governance_review_events")
    .insert(hashedEvent)
    .select()
    .single();

  if (error) throw error;

  return data;
}
