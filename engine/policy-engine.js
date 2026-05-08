/**
 * EXECUTIA V2 — Policy Engine
 *
 * Purpose:
 * Evaluate execution-time policy rules before commit.
 *
 * Output:
 * ALLOW_COMMIT / BLOCK_COMMIT / PENDING_REVIEW
 */

const POLICY_DECISIONS = Object.freeze({
  ALLOW_COMMIT: "ALLOW_COMMIT",
  BLOCK_COMMIT: "BLOCK_COMMIT",
  PENDING_REVIEW: "PENDING_REVIEW"
});

function normalize(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getAmount(request) {
  return numberOrZero(
    request.amount ??
    request.value ??
    request.transaction_amount ??
    request.execution_amount
  );
}

function matchesRule(rule, request = {}) {
  const conditions = rule.conditions || rule.condition || {};

  if (!conditions || typeof conditions !== "object") {
    return true;
  }

  const amount = getAmount(request);

  if (conditions.min_amount !== undefined && amount < Number(conditions.min_amount)) {
    return false;
  }

  if (conditions.max_amount !== undefined && amount > Number(conditions.max_amount)) {
    return false;
  }

  if (conditions.execution_type) {
    const requestType = normalize(request.execution_type || request.executionType || request.type || request.action);
    if (requestType !== normalize(conditions.execution_type)) return false;
  }

  if (conditions.jurisdiction) {
    const requestJurisdiction = normalize(request.jurisdiction || request.jurisdiction_code || request.jurisdictionCode);
    if (requestJurisdiction !== normalize(conditions.jurisdiction)) return false;
  }

  if (conditions.scope) {
    const requestScope = normalize(request.policy_scope || request.policyScope || request.scope || request.execution_scope);
    if (requestScope !== normalize(conditions.scope)) return false;
  }

  return true;
}

function ruleDecision(rule) {
  const decision = normalize(rule.decision || rule.action || rule.effect);

  if (decision === "BLOCK" || decision === "DENY" || decision === "BLOCK_COMMIT") {
    return POLICY_DECISIONS.BLOCK_COMMIT;
  }

  if (decision === "REVIEW" || decision === "PENDING_REVIEW" || decision === "ESCALATE") {
    return POLICY_DECISIONS.PENDING_REVIEW;
  }

  return POLICY_DECISIONS.ALLOW_COMMIT;
}

function ruleRisk(rule) {
  return numberOrZero(rule.risk_score ?? rule.risk ?? rule.weight);
}

export async function evaluatePolicyDecision({ supabase, request, governance }) {
  if (!request || typeof request !== "object") {
    return {
      ok: false,
      decision: POLICY_DECISIONS.BLOCK_COMMIT,
      reason: "MISSING_REQUEST",
      risk_score: 100,
      matched_rules: []
    };
  }

  if (!supabase) {
    return {
      ok: false,
      decision: POLICY_DECISIONS.BLOCK_COMMIT,
      reason: "SUPABASE_CLIENT_MISSING",
      risk_score: 100,
      matched_rules: []
    };
  }

  const organizationId =
    governance?.organization_id ||
    request.organization_id ||
    request.organizationId ||
    request.org_id ||
    null;

  const jurisdiction =
    governance?.jurisdiction ||
    request.jurisdiction ||
    request.jurisdiction_code ||
    null;

  const scope =
    governance?.policy_scope ||
    request.policy_scope ||
    request.policyScope ||
    request.scope ||
    request.execution_scope ||
    null;

  let query = supabase
    .from("policy_rules")
    .select("id, name, code, organization_id, jurisdiction_code, scope, decision, action, effect, risk_score, weight, conditions, status, version, priority")
    .order("priority", { ascending: true });

  if (organizationId) {
    query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
  }

  const { data: rules, error } = await query.limit(100);

  if (error) {
    return {
      ok: false,
      decision: POLICY_DECISIONS.BLOCK_COMMIT,
      reason: "POLICY_RULE_LOAD_FAILED",
      message: error.message,
      risk_score: 100,
      matched_rules: []
    };
  }

  const activeRules = (rules || []).filter((rule) => {
    if (rule.status && rule.status !== "ACTIVE") return false;
    if (rule.jurisdiction_code && jurisdiction && rule.jurisdiction_code !== jurisdiction) return false;
    if (rule.scope && scope && rule.scope !== scope) return false;
    return true;
  });

  const matchedRules = activeRules.filter((rule) => matchesRule(rule, request));

  let finalDecision = POLICY_DECISIONS.ALLOW_COMMIT;
  let riskScore = 0;

  for (const rule of matchedRules) {
    const decision = ruleDecision(rule);
    const risk = ruleRisk(rule);
    riskScore = Math.max(riskScore, risk);

    if (decision === POLICY_DECISIONS.BLOCK_COMMIT) {
      finalDecision = POLICY_DECISIONS.BLOCK_COMMIT;
      break;
    }

    if (decision === POLICY_DECISIONS.PENDING_REVIEW) {
      finalDecision = POLICY_DECISIONS.PENDING_REVIEW;
    }
  }

  return {
    ok: finalDecision !== POLICY_DECISIONS.BLOCK_COMMIT,
    decision: finalDecision,
    risk_score: riskScore,
    matched_rules: matchedRules.map((rule) => ({
      id: rule.id,
      code: rule.code || null,
      name: rule.name || null,
      decision: ruleDecision(rule),
      risk_score: ruleRisk(rule),
      version: rule.version || null
    })),
    policy_version: "v2",
    organization_id: organizationId,
    jurisdiction,
    policy_scope: scope
  };
}

export default evaluatePolicyDecision;
