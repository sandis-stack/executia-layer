import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import { releaseFreeze } from "../../../../services/governance-freeze.js";

import {
  assertFreezeReleaseAllowed,
  assertL4OverrideAllowed
} from "../../../../services/governance-constitution.js";

import { materializeConstitutionEvent } from "../../../../services/governance-constitution-events.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

async function materialize(result, actor) {
  if (!result?.event) return null;

  return materializeConstitutionEvent({
    type: result.event.type,
    rule: result.event.rule,
    reason: result.event.reason || null,
    context: result.event.context || {},
    actor
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "POST required"
        }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.freeze"
    );

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message: permission.reason || "Governance freeze permission required."
        }
      });
    }

    if (context.user?.role !== "SUPERVISOR") {
      return json(res, 403, {
        ok: false,
        error: {
          code: "GOVERNANCE_ROLE_NOT_AUTHORIZED",
          message: "Only SUPERVISOR can release governance freeze"
        }
      });
    }

    const {
      freeze_id,
      quorum_met = false,
      incident_level = null,
      override_requested = true,
      metadata = {}
    } = req.body || {};

    if (!freeze_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "FREEZE_ID_REQUIRED",
          message: "freeze_id is required"
        }
      });
    }

    const releaseRule = assertFreezeReleaseAllowed({
      quorum_met,
      freeze_level: incident_level,
      actor_role: context.user?.role
    });

    await materialize(releaseRule, context.user);

    if (!releaseRule.ok) {
      return json(res, 409, releaseRule);
    }

    const l4Rule = assertL4OverrideAllowed({
      incident_level,
      override_requested,
      actor_role: context.user?.role
    });

    await materialize(l4Rule, context.user);

    if (!l4Rule.ok) {
      return json(res, 409, l4Rule);
    }

    const freeze = await releaseFreeze({
      freeze_id,
      actor: context.user,
      metadata: {
        ...metadata,
        constitution: {
          release_rule: releaseRule.event_hash,
          l4_rule: l4Rule.event_hash
        }
      }
    });

    return json(res, 200, {
      ok: true,
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      constitution: {
        release_rule: releaseRule.event_hash,
        l4_rule: l4Rule.event_hash
      },
      freeze
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: {
        code: error.code || error.message || "FREEZE_RELEASE_ERROR",
        message: error.message || "Freeze release failed"
      }
    });
  }
}
