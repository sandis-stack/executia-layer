import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  finalizeGovernanceReview
} from "../../../../services/governance-review-actions.js";

import {
  insertGovernanceEvent
} from "../../../../services/governance-hash.js";

import {
  getGovernanceQuorumRule,
  getGovernanceQuorumState,
  roleMeetsQuorumRequirement
} from "../../../../services/governance-quorum.js";

import { resumeGovernedExecution } from "../../../../engine/execution-resume-engine.js";
import { GOVERNANCE_STATES } from "../../../../services/governance-state.js";

function json(res, status, body) {
  return res.status(status).json(body);
}

function db() {
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        transport: ws
      }
    }
  );
}

function resolveActor(context = {}, body = {}) {
  return (
    context?.user?.email ||
    context?.user?.id ||
    body?.actor ||
    "EXECUTIA_OPERATOR"
  );
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return json(res, 200, {
        ok: true,
        endpoint: "/api/v2/governance/review/approve",
        method: "POST",
        purpose: "Record governance approval and finalize only when quorum is met."
      });
    }

    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET and POST are allowed."
        }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.approve"
    );

    if (!permission.ok) {
      return json(res, permission.status || 401, {
        ok: false,
        error: {
          code: permission.error || "UNAUTHORIZED",
          message:
            permission.reason ||
            "Governance review approval permission required."
        }
      });
    }

    const body = req.body || {};
    const review_id = body.review_id || body.reviewId;

    if (!review_id) {
      return json(res, 400, {
        ok: false,
        error: {
          code: "REVIEW_ID_REQUIRED",
          message: "review_id required."
        }
      });
    }

    const supabase = db();
    const actor = resolveActor(context, body);

    const { data: review, error: reviewError } = await supabase
      .from("governance_reviews")
      .select("*")
      .eq("id", review_id)
      .maybeSingle();

    if (reviewError) throw reviewError;

    if (!review) {
      return json(res, 404, {
        ok: false,
        error: {
          code: "GOVERNANCE_REVIEW_NOT_FOUND"
        }
      });
    }

    if (review.review_status && review.review_status !== "OPEN") {
      return json(res, 400, {
        ok: false,
        error: "GOVERNANCE_REVIEW_ALREADY_CLOSED",
        review_status: review.review_status
      });
    }

    const quorumRule = await getGovernanceQuorumRule({
      supabase,
      organization_id: review.organization_id || null,
      escalation_level: review.escalation_level || 1
    });

    const actorRole =
      context?.user?.role ||
      context?.role ||
      "OPERATOR";

    if (!roleMeetsQuorumRequirement(actorRole, quorumRule.required_role)) {
      return json(res, 403, {
        ok: false,
        error: {
          code: "GOVERNANCE_ROLE_NOT_AUTHORIZED",
          message:
            "This governance level requires " +
            quorumRule.required_role +
            " approval."
        },
        required_role: quorumRule.required_role,
        actor_role: actorRole,
        escalation_level: review.escalation_level || 1
      });
    }

    const { data: existingApproval, error: existingApprovalError } = await supabase
      .from("governance_review_events")
      .select("id, actor, event_type")
      .eq("review_id", review_id)
      .eq("event_type", "GOVERNANCE_APPROVAL_RECORDED")
      .eq("actor", actor)
      .maybeSingle();

    if (existingApprovalError) throw existingApprovalError;

    let approvalEvent = existingApproval || null;

    if (!approvalEvent) {
      approvalEvent = await insertGovernanceEvent({
        supabase,
        event: {
          review_id,
          execution_id: review.execution_id || null,
          actor,
          event_type: "GOVERNANCE_APPROVAL_RECORDED",
          payload: {
            action: "APPROVE",
            reason: body.reason || body.review_reason || null,
            review_status: review.review_status,
            governance_decision: review.governance_decision,
            policy_decision: review.policy_decision,
            escalation_level: review.escalation_level || 1,
            operator_user_id: context?.user?.id || null,
            operator_email: context?.user?.email || null,
            operator_role: context?.user?.role || context?.role || null
          },
          created_at: new Date().toISOString()
        }
      });
    }

    const quorum = await getGovernanceQuorumState({
      supabase,
      review_id
    });

    if (!quorum.quorum_met) {
      await supabase
        .from("governance_reviews")
        .update({
          governance_state: GOVERNANCE_STATES.QUORUM_PENDING,
          updated_at: new Date().toISOString()
        })
        .eq("id", review_id);

      return json(res, 200, {
        ok: true,
        status: GOVERNANCE_STATES.QUORUM_PENDING,
        approval_recorded: true,
        duplicate_actor: Boolean(existingApproval),
        approval_event: approvalEvent,
        quorum,
        governance: null,
        resume: null
      });
    }

    await supabase
      .from("governance_reviews")
      .update({
        governance_state: GOVERNANCE_STATES.QUORUM_MET,
        updated_at: new Date().toISOString()
      })
      .eq("id", review_id);

    const result = await finalizeGovernanceReview({
      supabase,
      review_id,
      action: "APPROVE",
      context,
      body
    });

    if (!result.ok) {
      return json(res, 400, result);
    }

    const resumeResult = await resumeGovernedExecution({
      review_id,
      operator_id: context.user?.id,
      operator_email: context.user?.email,
      organization_id: context.organization_id
    });

    return json(res, 200, {
      ok: true,
      status: "QUORUM_MET_APPROVED",
      approval_recorded: true,
      duplicate_actor: Boolean(existingApproval),
      approval_event: approvalEvent,
      quorum,
      governance: result,
      resume: resumeResult
    });

  } catch (error) {
    console.error(
      "[EXECUTIA GOVERNANCE APPROVE ERROR]",
      error
    );

    return json(res, 500, {
      ok: false,
      error: {
        code:
          error.code ||
          "GOVERNANCE_APPROVAL_FAILED",
        message:
          error.message ||
          "Governance approval failed."
      }
    });
  }
}
