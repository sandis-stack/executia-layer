import { verifyLedgerChain } from "../../services/ledger.js";
import { requireInternalKey } from "../../services/auth.js";
import { requireOperator } from "../../services/operator.js";
import { verifyCoreLedgerChain } from "../../services/core-ledger.js";
import { auditLedgerIntegrity } from "../../services/audit-ledger.js";
import { buildExecutionHash } from "../../services/audit.js";
import { db, hasSupabaseEnv } from "../../services/db.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export const LEDGER_VERIFY_AUTHORITY_MODE = "LEDGER_ENTRIES_PRIMARY";

// Accepts: EXECUTIA_API_KEY (x-api-key) OR Supabase operator JWT (Authorization: Bearer)
async function requireAuth(req) {
  const internalAuth = requireInternalKey(req);
  if (internalAuth.ok) return internalAuth;

  try {
    const operatorAuth = await requireOperator(req);
    if (operatorAuth?.user) return { ok: true, mode: "OPERATOR_JWT", user: operatorAuth.user };
  } catch (_) {}

  return { ok: false, error: "UNAUTHORIZED" };
}

async function verifyExecutionChain() {
  if (!hasSupabaseEnv()) {
    return { verified: true, mode: "DRY_RUN", entries: 0 };
  }

  const { data, error } = await db()
    .from("execution_results")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  for (const row of data || []) {
    if (!row.hash) continue;

    const expected = buildExecutionHash(row, row.prev_hash || "GENESIS");

    if (row.hash !== expected) {
      return {
        verified: false,
        entries: (data || []).length,
        tampered_execution_id: row.execution_id
      };
    }
  }

  return {
    verified: true,
    entries: (data || []).length
  };
}

/**
 * Phase 3A.1: ledger_entries is primary execution truth; execution_results / core_ledger are legacy checks.
 */
export function resolveLedgerVerifyAuthority({ ledger, executions, coreLedger, accountAudit }) {
  const legacy_verified = {
    execution_projection: Boolean(executions.verified),
    core_ledger: Boolean(coreLedger.verified),
    account_audit: Boolean(accountAudit.verified),
    composite_all_chains: Boolean(
      ledger.verified &&
      executions.verified &&
      coreLedger.verified &&
      accountAudit.verified
    )
  };

  const verified = Boolean(ledger.verified);

  const legacy_projection_warning =
    ledger.verified && !executions.verified
      ? {
          code: "LEGACY_PROJECTION_DRIFT",
          message:
            "execution_results projection does not match the canonical hash check; ledger_entries material chain is verified.",
          tampered_execution_id: executions.tampered_execution_id ?? null,
          entries: executions.entries ?? null
        }
      : null;

  const legacy_core_ledger_warning =
    ledger.verified && !coreLedger.verified
      ? {
          code: "LEGACY_CORE_LEDGER_DRIFT",
          message:
            "core_ledger hash chain does not match its verifier; execution material truth authority is ledger_entries.",
          tampered_id: coreLedger.tampered_id ?? null,
          entries: coreLedger.entries ?? null
        }
      : null;

  return {
    verified,
    authority_mode: LEDGER_VERIFY_AUTHORITY_MODE,
    legacy_verified,
    legacy_projection_warning,
    legacy_core_ledger_warning
  };
}

export function buildLedgerVerifyResponse({ ledger, executions, coreLedger, accountAudit, truthAnchors }) {
  const authority = resolveLedgerVerifyAuthority({ ledger, executions, coreLedger, accountAudit });

  return {
    verified: authority.verified,
    authority_mode: authority.authority_mode,
    legacy_verified: authority.legacy_verified,
    ...(authority.legacy_projection_warning
      ? { legacy_projection_warning: authority.legacy_projection_warning }
      : {}),
    ...(authority.legacy_core_ledger_warning
      ? { legacy_core_ledger_warning: authority.legacy_core_ledger_warning }
      : {}),
    ledger_chain: ledger,
    execution_chain: executions,
    core_ledger_chain: coreLedger,
    account_audit: accountAudit,
    truth_anchors: truthAnchors
  };
}

export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid API key or JWT.", 401);
    if (!methodGuard(req, res, ["GET"])) return;

    const safeCall = async (fn, fallback) => {
      try {
        return await fn();
      } catch (e) {
        return e.code === "SUPABASE_ENV_MISSING" ? fallback : (() => { throw e; })();
      }
    };

    const [ledger, executions, coreLedger, accountAudit, anchors] = await Promise.all([
      safeCall(verifyLedgerChain, { verified: true, mode: "DRY_RUN", entries: 0 }),
      safeCall(verifyExecutionChain, { verified: true, mode: "DRY_RUN", entries: 0 }),
      safeCall(verifyCoreLedgerChain, { verified: true, mode: "DRY_RUN", entries: 0 }),
      safeCall(auditLedgerIntegrity, {
        verified: true,
        mode: "DRY_RUN",
        accounts_checked: 0,
        mismatches: []
      }),
      (async () => {
        try {
          const { data } = await db().from("truth_anchors").select("id", { count: "exact", head: true });
          return { verified: true, anchors: data?.length ?? 0 };
        } catch {
          return { verified: false, anchors: 0 };
        }
      })()
    ]);

    return ok(res, buildLedgerVerifyResponse({
      ledger,
      executions,
      coreLedger,
      accountAudit,
      truthAnchors: anchors
    }));
  } catch (error) {
    return fail(res, "LEDGER_VERIFY_FAILED", error.message || "Verification failed.", 500);
  }
}
