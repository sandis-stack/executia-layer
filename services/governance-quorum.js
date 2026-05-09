/**
 * EXECUTIA V2 — Governance Quorum Service
 *
 * Purpose:
 * Defines institutional approval requirements per escalation level.
 * This is the foundation for multi-operator governance.
 */

const DEFAULT_RULES = Object.freeze({
  1: {
    escalation_level: 1,
    required_approvals: 1,
    required_role: "OPERATOR",
    supervisor_required: false,
    freeze_required: false,
    override_allowed: true
  },
  2: {
    escalation_level: 2,
    required_approvals: 2,
    required_role: "OPERATOR",
    supervisor_required: false,
    freeze_required: false,
    override_allowed: true
  },
  3: {
    escalation_level: 3,
    required_approvals: 3,
    required_role: "SUPERVISOR",
    supervisor_required: true,
    freeze_required: false,
    override_allowed: true
  },
  4: {
    escalation_level: 4,
    required_approvals: 3,
    required_role: "SUPERVISOR",
    supervisor_required: true,
    freeze_required: true,
    override_allowed: false
  }
});

export function fallbackQuorumRule(escalation_level = 1) {
  const level = Number(escalation_level || 1);
  return DEFAULT_RULES[level] || DEFAULT_RULES[4];
}

export async function getGovernanceQuorumRule({
  supabase,
  organization_id = null,
  escalation_level = 1
}) {
  if (!supabase) {
    throw new Error("SUPABASE_CLIENT_MISSING");
  }

  const level = Number(escalation_level || 1);

  if (organization_id) {
    const { data, error } = await supabase
      .from("governance_quorum_rules")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("escalation_level", level)
      .eq("active", true)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  const { data: defaultRule, error: defaultError } = await supabase
    .from("governance_quorum_rules")
    .select("*")
    .is("organization_id", null)
    .eq("escalation_level", level)
    .eq("active", true)
    .maybeSingle();

  if (defaultError) throw defaultError;

  return defaultRule || fallbackQuorumRule(level);
}

export function roleMeetsQuorumRequirement(actorRole, requiredRole) {
  const role = String(actorRole || "").toUpperCase();
  const required = String(requiredRole || "OPERATOR").toUpperCase();

  if (role === "ADMIN") return true;
  if (required === "OPERATOR") {
    return role === "OPERATOR" || role === "SUPERVISOR";
  }
  if (required === "SUPERVISOR") {
    return role === "SUPERVISOR";
  }

  return role === required;
}

export function evaluateQuorumState({
  review,
  rule,
  approvals = []
}) {
  const requiredApprovals = Number(rule?.required_approvals || 1);
  const requiredRole = rule?.required_role || "OPERATOR";

  const validApprovals = approvals.filter((item) => {
    return (
      item?.event_type === "GOVERNANCE_APPROVAL_RECORDED" &&
      roleMeetsQuorumRequirement(
        item?.payload?.operator_role,
        requiredRole
      )
    );
  });

  const uniqueActors = new Set(
    validApprovals
      .map((item) => item.actor)
      .filter(Boolean)
  );

  const approvalCount = uniqueActors.size;

  return {
    ok: true,
    review_id: review?.id || null,
    escalation_level: Number(review?.escalation_level || rule?.escalation_level || 1),
    required_approvals: requiredApprovals,
    approvals_recorded: approvalCount,
    quorum_met: approvalCount >= requiredApprovals,
    required_role: requiredRole,
    supervisor_required: Boolean(rule?.supervisor_required),
    freeze_required: Boolean(rule?.freeze_required),
    override_allowed: Boolean(rule?.override_allowed),
    actors: Array.from(uniqueActors)
  };
}

export async function getGovernanceQuorumState({
  supabase,
  review_id
}) {
  if (!supabase) {
    throw new Error("SUPABASE_CLIENT_MISSING");
  }

  if (!review_id) {
    throw new Error("REVIEW_ID_REQUIRED");
  }

  const { data: review, error: reviewError } = await supabase
    .from("governance_reviews")
    .select("*")
    .eq("id", review_id)
    .maybeSingle();

  if (reviewError) throw reviewError;

  if (!review) {
    return {
      ok: false,
      error: "GOVERNANCE_REVIEW_NOT_FOUND"
    };
  }

  const rule = await getGovernanceQuorumRule({
    supabase,
    organization_id: review.organization_id || null,
    escalation_level: review.escalation_level || 1
  });

  const { data: approvals, error: approvalsError } = await supabase
    .from("governance_review_events")
    .select("*")
    .eq("review_id", review_id)
    .eq("event_type", "GOVERNANCE_APPROVAL_RECORDED")
    .order("sequence_no", { ascending: true });

  if (approvalsError) throw approvalsError;

  return evaluateQuorumState({
    review,
    rule,
    approvals: approvals || []
  });
}

export default {
  fallbackQuorumRule,
  getGovernanceQuorumRule,
  evaluateQuorumState,
  roleMeetsQuorumRequirement,
  getGovernanceQuorumState
};
