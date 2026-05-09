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


export async function verifyGovernanceHashChain({ supabase, review_id }) {
  if (!supabase) throw new Error("SUPABASE_CLIENT_MISSING");
  if (!review_id) throw new Error("REVIEW_ID_REQUIRED");

  const { data: events, error } = await supabase
    .from("governance_review_events")
    .select("*")
    .eq("review_id", review_id)
    .order("sequence_no", { ascending: true });

  if (error) throw error;

  let previousHash = null;

  for (let i = 0; i < (events || []).length; i++) {
    const event = events[i];

    if ((event.prev_hash || null) !== previousHash) {
      return {
        ok: true,
        verified: false,
        events_checked: i + 1,
        broken_at: event.id,
        reason: "PREV_HASH_MISMATCH",
        expected_prev_hash: previousHash,
        actual_prev_hash: event.prev_hash || null
      };
    }

    const recalculated = hashGovernanceEvent(event, previousHash);

    if (event.hash !== recalculated) {
      return {
        ok: true,
        verified: false,
        events_checked: i + 1,
        broken_at: event.id,
        reason: "HASH_MISMATCH",
        expected_hash: recalculated,
        actual_hash: event.hash
      };
    }

    previousHash = event.hash;
  }

  return {
    ok: true,
    verified: true,
    review_id,
    events_checked: events?.length || 0,
    head_hash: previousHash,
    broken_at: null
  };
}
