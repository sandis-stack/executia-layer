import { db } from "../../services/db.js";
import {
  commitOperatorTerminalDecision,
  OperatorDecisionError
} from "../../services/execution.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST is allowed."
      }
    });
  }

  try {
    const context = await resolveJwtContext(req);
    const permission = requireJwtPermission(context, "approve");

    if (!permission.ok) {
      return res.status(permission.status || 401).json(permission);
    }

    const {
      execution_id,
      reason = "Approved by operator"
    } = req.body || {};

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "EXECUTION_ID_REQUIRED",
          message: "execution_id is required."
        }
      });
    }

    const organization_id = context.organization_id;
    const operator = context.user;

    const { execution, status, core_ledger } = await commitOperatorTerminalDecision({
      supabase: db(),
      execution_id,
      decision: "APPROVE",
      actor: operator.email,
      reason,
      organization_id,
      operator
    });

    return res.status(200).json({
      ok: true,
      status,
      mode: "ENTERPRISE",
      organization_id,
      operator,
      decision: "APPROVED",
      execution,
      core_ledger
    });
  } catch (error) {
    if (error instanceof OperatorDecisionError) {
      return res.status(error.status).json({
        ok: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    return res.status(500).json({
      ok: false,
      error: {
        code: error.code || "INTERNAL_ERROR",
        message: error.message
      }
    });
  }
}
