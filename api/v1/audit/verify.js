import { resolveJwtContext, requireJwtPermission } from "../../../services/jwt-auth.js";
import {
  verifyAuditChain,
  AUDIT_VERIFY_AUTHORITY_MODE,
  AUDIT_HASH_FORMULA_ID
} from "../../../services/audit.js";
import { verifyLedgerChain } from "../../../services/ledger.js";
import { verifyCoreLedgerChain } from "../../../services/core-ledger.js";
import { auditLedgerIntegrity } from "../../../services/audit-ledger.js";
import { ok, fail, methodGuard } from "../../../shared/response.js";

export const PHASE_3B2_VERIFY_CONTRACT = "executia/verification/v3b2";

async function safeVerify(fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    if (error?.code === "SUPABASE_ENV_MISSING") return fallback;
    return {
      verified: false,
      error: error?.message || "Verification call failed."
    };
  }
}

function normalizeStatus({ audit, ledger, coreLedger, accountAudit }) {
  if (!audit?.verified) return "BROKEN_AUDIT_CHAIN";
  if (!ledger?.verified) return "BROKEN_LEDGER_CHAIN";

  if (!coreLedger?.verified || !accountAudit?.verified) {
    return "VALID_WITH_LEGACY_DRIFT";
  }

  return "VALID";
}

function buildUnifiedVerificationResponse({
  context,
  audit,
  ledger,
  coreLedger,
  accountAudit,
  execution_id
}) {
  const status = normalizeStatus({ audit, ledger, coreLedger, accountAudit });

  return {
    verified: status === "VALID" || status === "VALID_WITH_LEGACY_DRIFT",
    status,
    contract: PHASE_3B2_VERIFY_CONTRACT,

    authority: {
      primary: "SUPPLEMENTAL_AUDIT_GLOBAL_CHAIN",
      material_truth: "LEDGER_ENTRIES",
      legacy_projection: "READ_ONLY_LEGACY_CHECKS"
    },

    audit: {
      authority_mode: AUDIT_VERIFY_AUTHORITY_MODE,
      formula: AUDIT_HASH_FORMULA_ID,
      ...audit
    },

    ledger: {
      authority_mode: "LEDGER_ENTRIES_PRIMARY",
      ...ledger
    },

    legacy: {
      core_ledger: coreLedger,
      account_audit: accountAudit,
      warning:
        status === "VALID_WITH_LEGACY_DRIFT"
          ? "Legacy verification drift detected. Canonical truth remains supplemental audit chain + ledger_entries."
          : null
    },

    request: {
      mode: context.mode,
      organization_id: context.organization_id,
      user: context.user,
      execution_id: execution_id || null
    }
  };
}

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["GET"])) return;

    const context = await resolveJwtContext(req);
    const permission =
      requireJwtPermission(context, "audit").ok
        ? requireJwtPermission(context, "audit")
        : requireJwtPermission(context, "execute");

    if (!permission.ok) {
      return fail(
        res,
        permission.error || "UNAUTHORIZED",
        permission.reason || "JWT authentication or audit permission required.",
        permission.status || 401
      );
    }

    const execution_id = req.query.execution_id || null;

    const [audit, ledger, coreLedger, accountAudit] = await Promise.all([
      safeVerify(
        () => verifyAuditChain(execution_id),
        {
          verified: true,
          mode: "DRY_RUN",
          entries: 0,
          authority_mode: AUDIT_VERIFY_AUTHORITY_MODE,
          formula: AUDIT_HASH_FORMULA_ID,
          chain_scope: "GLOBAL"
        }
      ),
      safeVerify(
        () => verifyLedgerChain(),
        {
          verified: true,
          mode: "DRY_RUN",
          entries: 0
        }
      ),
      safeVerify(
        () => verifyCoreLedgerChain(),
        {
          verified: true,
          mode: "DRY_RUN",
          entries: 0
        }
      ),
      safeVerify(
        () => auditLedgerIntegrity(),
        {
          verified: true,
          mode: "DRY_RUN",
          accounts_checked: 0,
          mismatches: []
        }
      )
    ]);

    return ok(
      res,
      buildUnifiedVerificationResponse({
        context,
        audit,
        ledger,
        coreLedger,
        accountAudit,
        execution_id
      })
    );
  } catch (err) {
    return fail(res, "AUDIT_VERIFY_FAILED", err.message || "Audit verification failed.", 500);
  }
}
