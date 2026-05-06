import { db, hasSupabaseEnv } from "../services/db.js";

const FALLBACK_RULES = [
  {
    rule_code: "ACTOR_REQUIRED",
    severity: "BLOCKING",
    description: "Every execution request must define actor."
  },
  {
    rule_code: "SUBJECT_REQUIRED",
    severity: "BLOCKING",
    description: "Every execution request must define subject."
  },
  {
    rule_code: "APPROVAL_LIMIT",
    severity: "BLOCKING",
    description: "Amount cannot exceed authorized approval limit."
  },
  {
    rule_code: "OPERATOR_REQUIRED",
    severity: "REVIEW",
    description: "Unclear execution request moves to operator queue."
  }
];

export async function loadRules({
  jurisdiction = "GLOBAL",
  request_type = "ANY"
} = {}) {

  if (!hasSupabaseEnv()) {
    return FALLBACK_RULES;
  }

  try {
    const { data, error } = await db()
      .from("rule_catalog")
      .select("*")
      .eq("active", true)
      .in("jurisdiction", ["GLOBAL", jurisdiction])
      .in("request_type", ["ANY", request_type])
      .order("rule_code", { ascending: true });

    if (error) throw error;

    return data?.length ? data : FALLBACK_RULES;

  } catch (err) {
    console.error("[EXECUTIA] rule loader fallback:", err.message);
    return FALLBACK_RULES;
  }
}