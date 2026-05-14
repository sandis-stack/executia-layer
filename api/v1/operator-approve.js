import { db } from "../../services/db.js";
import { commitCoreLedgerTransaction } from "../../services/core-ledger.js";
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

    const supabase = db();

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

    const { data: execution, error: fetchError } = await supabase
      .from("execution_results")
      .select("*")
      .or(`id.eq.${execution_id},execution_id.eq.${execution_id}`)
      .eq("organization_id", organization_id)
      .single();

    if (fetchError || !execution) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "EXECUTION_NOT_FOUND",
          message: "Execution not found for this organization."
        }
      });
    }

    if (execution.status !== "PENDING_REVIEW") {
      return res.status(409).json({
        ok: false,
        error: {
          code: "INVALID_EXECUTION_STATUS",
          message: `Execution cannot be approved from status ${execution.status}.`
        }
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("execution_results")
      .update({
        status: "APPROVED",
        operator_action: "APPROVED",
        result: reason,
        operator_id: operator.id,
        operator_email: operator.email,
        reviewed_at: new Date().toISOString(),
        reconciliation_state: "VERIFIED",
        hash_verified: true,
        audit_state: "RECORDED",
        ledger_state: "HASH_LINKED"
      })
      .or(`id.eq.${execution_id},execution_id.eq.${execution_id}`)
      .eq("organization_id", organization_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "OPERATOR_APPROVE_FAILED",
          message: updateError.message
        }
      });
    }

    await supabase.from("audit_events").insert({
      execution_id,
      organization_id,
      event_type: "OPERATOR_APPROVED",
      actor_user_id: operator.id,
      actor_email: operator.email,
      actor_role: operator.role,
      details: {
        reason,
        previous_status: execution.status,
        new_status: "APPROVED"
      }
    });

    await supabase.from("audit_events").insert({
      execution_id,
      organization_id,
      event_type: "RECONCILIATION_AUTO_VERIFIED",
      actor_user_id: operator.id,
      actor_email: operator.email,
      actor_role: operator.role,
      payload: {
        truth_state: "VERIFIED",
        hash_verified: true,
        reconciliation_state: "VERIFIED",
        trigger: "OPERATOR_APPROVED"
      },
      created_at: new Date().toISOString()
    });

    let coreLedgerEntry = null;

    const { data: existingCoreLedger } = await supabase
      .from("core_ledger")
      .select("*")
      .eq("execution_id", updated.execution_id || execution_id)
      .limit(1)
      .maybeSingle();

    if (!existingCoreLedger) {
      coreLedgerEntry = await commitCoreLedgerTransaction({
        execution_id: updated.execution_id || execution_id,
        organization_id,
        transaction_type: updated.request_type || updated.payload?.type || "EXECUTION_TRANSACTION",
        actor: updated.actor || operator.email,
        counterparty: updated.payload?.counterparty || null,
        subject: updated.subject || updated.payload?.request || "EXECUTION",
        amount: Number(updated.amount || updated.payload?.amount || 0),
        currency: updated.payload?.currency || "EUR",
        debit_account: updated.payload?.debit_account || "INFRA_EXP",
        credit_account: updated.payload?.credit_account || "BANK",
        tax_type: updated.payload?.tax_type || null,
        tax_rate: Number(updated.payload?.tax_rate || 0),
        status: "APPROVED",
        decision: "APPROVE",
        reconciliation_state: "VERIFIED",
        settlement_status: "PENDING",
        payload: {
          source: "operator_approve_auto_core_ledger",
          execution_hash: updated.hash || null,
          settlement_state: "PENDING",
          reconciliation_state: "VERIFIED"
        }
      });
    } else {
      coreLedgerEntry = existingCoreLedger;
    }

    return res.status(200).json({
      ok: true,
      mode: "ENTERPRISE",
      organization_id,
      operator,
      decision: "APPROVED",
      execution: updated,
      core_ledger: coreLedgerEntry
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message
      }
    });
  }
}