/**
 * EXECUTIA V2 — Governance Resolution Engine
 *
 * Purpose:
 * Resolve institutional authority before execution commit.
 *
 * V1 remains frozen.
 * This module is isolated for EXECUTIA_V2_GOVERNANCE branch.
 */

const GOVERNANCE_DECISIONS = Object.freeze({
  ALLOW_COMMIT: "ALLOW_COMMIT",
  BLOCK_COMMIT: "BLOCK_COMMIT",
  PENDING_REVIEW: "PENDING_REVIEW"
});

const GOVERNANCE_ERRORS = Object.freeze({
  MISSING_REQUEST: "MISSING_REQUEST",
  MISSING_ORGANIZATION: "MISSING_ORGANIZATION",
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  AUTHORITY_NOT_FOUND: "AUTHORITY_NOT_FOUND",
  POLICY_SCOPE_NOT_FOUND: "POLICY_SCOPE_NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  GOVERNANCE_RESOLUTION_FAILED: "GOVERNANCE_RESOLUTION_FAILED"
});

function normalizeValue(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getRequestField(request, keys) {
  for (const key of keys) {
    if (request && Object.prototype.hasOwnProperty.call(request, key)) {
      const value = normalizeValue(request[key]);
      if (value) return value;
    }
  }
  return null;
}

export async function resolveGovernanceDecision({ supabase, request }) {
  try {
    if (!request || typeof request !== "object") {
      return block(GOVERNANCE_ERRORS.MISSING_REQUEST);
    }

    if (!supabase) {
      return block(GOVERNANCE_ERRORS.GOVERNANCE_RESOLUTION_FAILED);
    }

    const organizationId = getRequestField(request, [
      "organization_id",
      "organizationId",
      "org_id",
      "orgId"
    ]);

    const authorityId = getRequestField(request, [
      "authority_id",
      "authorityId"
    ]);

    const jurisdictionCode = getRequestField(request, [
      "jurisdiction",
      "jurisdiction_code",
      "jurisdictionCode"
    ]);

    const policyScope = getRequestField(request, [
      "policy_scope",
      "policyScope",
      "scope",
      "execution_scope",
      "executionScope"
    ]);

    const executionType = getRequestField(request, [
      "execution_type",
      "executionType",
      "type",
      "action"
    ]);

    if (!organizationId) {
      return block(GOVERNANCE_ERRORS.MISSING_ORGANIZATION);
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("id", organizationId)
      .maybeSingle();

    if (organizationError || !organization) {
      return block(GOVERNANCE_ERRORS.ORGANIZATION_NOT_FOUND, {
        organization_id: organizationId
      });
    }

    if (organization.status && organization.status !== "ACTIVE") {
      return block(GOVERNANCE_ERRORS.PERMISSION_DENIED, {
        organization_id: organizationId,
        organization_status: organization.status
      });
    }

    let authorityQuery = supabase
      .from("authorities")
      .select("id, name, status, organization_id")
      .eq("organization_id", organizationId);

    if (authorityId) {
      authorityQuery = authorityQuery.eq("id", authorityId);
    }

    const { data: authorities, error: authorityError } = await authorityQuery.limit(10);

    if (authorityError || !authorities || authorities.length === 0) {
      return block(GOVERNANCE_ERRORS.AUTHORITY_NOT_FOUND, {
        organization_id: organizationId,
        authority_id: authorityId
      });
    }

    const activeAuthority =
      authorities.find((item) => !item.status || item.status === "ACTIVE") || null;

    if (!activeAuthority) {
      return block(GOVERNANCE_ERRORS.AUTHORITY_NOT_FOUND, {
        organization_id: organizationId,
        authority_status: "NOT_ACTIVE"
      });
    }

    let scopeQuery = supabase
      .from("authority_scopes")
      .select("id, authority_id, scope, jurisdiction_code, status")
      .eq("authority_id", activeAuthority.id);

    if (policyScope) {
      scopeQuery = scopeQuery.eq("scope", policyScope);
    }

    if (jurisdictionCode) {
      scopeQuery = scopeQuery.eq("jurisdiction_code", jurisdictionCode);
    }

    const { data: scopes, error: scopeError } = await scopeQuery.limit(20);

    if (scopeError || !scopes || scopes.length === 0) {
      return block(GOVERNANCE_ERRORS.POLICY_SCOPE_NOT_FOUND, {
        organization_id: organizationId,
        authority_id: activeAuthority.id,
        policy_scope: policyScope,
        jurisdiction: jurisdictionCode
      });
    }

    const activeScope =
      scopes.find((item) => !item.status || item.status === "ACTIVE") || scopes[0];

    let permissionQuery = supabase
      .from("execution_permissions")
      .select("id, organization_id, authority_id, scope, execution_type, decision, status")
      .eq("organization_id", organizationId)
      .eq("authority_id", activeAuthority.id);

    if (activeScope.scope) {
      permissionQuery = permissionQuery.eq("scope", activeScope.scope);
    }

    if (executionType) {
      permissionQuery = permissionQuery.eq("execution_type", executionType);
    }

    const { data: permissions, error: permissionError } = await permissionQuery.limit(20);

    if (permissionError || !permissions || permissions.length === 0) {
      return block(GOVERNANCE_ERRORS.PERMISSION_DENIED, {
        organization_id: organizationId,
        authority_id: activeAuthority.id,
        policy_scope: activeScope.scope || policyScope,
        execution_type: executionType
      });
    }

    const permission = permissions.find((item) => {
      const active = !item.status || item.status === "ACTIVE";
      const allowed =
        item.decision === "ALLOW" ||
        item.decision === "ALLOW_COMMIT" ||
        item.decision === GOVERNANCE_DECISIONS.ALLOW_COMMIT;
      return active && allowed;
    });

    if (!permission) {
      return block(GOVERNANCE_ERRORS.PERMISSION_DENIED, {
        organization_id: organizationId,
        authority_id: activeAuthority.id,
        policy_scope: activeScope.scope || policyScope,
        execution_type: executionType
      });
    }

    return {
      ok: true,
      organization_id: organization.id,
      organization_name: organization.name || null,
      authority_id: activeAuthority.id,
      authority_name: activeAuthority.name || null,
      jurisdiction: activeScope.jurisdiction_code || jurisdictionCode || null,
      policy_scope: activeScope.scope || policyScope || null,
      execution_type: executionType || null,
      permission_id: permission.id,
      permission_verified: true,
      governance_decision: GOVERNANCE_DECISIONS.ALLOW_COMMIT
    };
  } catch (error) {
    return block(GOVERNANCE_ERRORS.GOVERNANCE_RESOLUTION_FAILED, {
      message: error?.message || "Unknown governance resolution error"
    });
  }
}

function block(reason, details = {}) {
  return {
    ok: false,
    permission_verified: false,
    governance_decision: GOVERNANCE_DECISIONS.BLOCK_COMMIT,
    reason,
    ...details
  };
}

export default resolveGovernanceDecision;
