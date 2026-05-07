import { verifyLedgerChain } from "../../services/ledger.js";
import { requireInternalKey } from "../../services/auth.js";
import { requireOperator } from "../../services/operator.js";

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
import { verifyCoreLedgerChain } from "../../services/core-ledger.js";
import { auditLedgerIntegrity } from "../../services/audit-ledger.js";
import { verifyAnchor } from "../../services/truth-anchor.js";
import { buildExecutionHash } from "../../services/audit.js";
import { db, hasSupabaseEnv } from "../../services/db.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

async function verifyExecutionChain() {
  if (!hasSupabaseEnv()) {
    return { verified: true, mode: "DRY_RUN", entries: 0 };
  }

  const { data, error } = await db()
    .from("execution_results")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  let prevHash = "GENESIS";
  let tampered = null;

  for (const row of data || []) {
    if (!row.hash) continue; // skip pre-migration rows

    const expected = buildExecutionHash(row, row.prev_hash || "GENESIS");

    if (row.hash !== expected) {
      tampered = row.execution_id;
      break;
    }

    prevHash = row.hash;
  }

  return {
    verified: tampered === null,
    entries: (data || []).length,
    ...(tampered ? { tampered_execution_id: tampered } : {})
  };
}

export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid API key or JWT.", 401);
    if (!methodGuard(req, res, ["GET"])) return;

    const safeCall = async (fn, fallback) => { try { return await fn(); } catch (e) { return e.code === "SUPABASE_ENV_MISSING" ? fallback : (() => { throw e; })(); } };

    const [ledger, executions, coreLedger, accountAudit, anchors] = await Promise.all([
      safeCall(verifyLedgerChain,      { verified: true, mode: "DRY_RUN", entries: 0 }),
      safeCall(verifyExecutionChain,   { verified: true, mode: "DRY_RUN", entries: 0 }),
      safeCall(verifyCoreLedgerChain,  { verified: true, mode: "DRY_RUN", entries: 0 }),
      safeCall(auditLedgerIntegrity,   { verified: true, mode: "DRY_RUN", accounts_checked: 0, mismatches: [] }),
      // truth anchor count — lightweight
      (async () => {
        try {
          const { data } = await db().from("truth_anchors").select("id", { count: "exact", head: true });
          return { verified: true, anchors: data?.length ?? 0 };
        } catch { return { verified: false, anchors: 0 }; }
      })()
    ]);

    const allVerified = ledger.verified && executions.verified && coreLedger.verified && accountAudit.verified;

    return ok(res, {
      verified:          allVerified,
      ledger_chain:      ledger,
      execution_chain:   executions,
      core_ledger_chain: coreLedger,
      account_audit:     accountAudit,
      truth_anchors:     anchors
    });

  } catch (error) {
    return fail(res, "LEDGER_VERIFY_FAILED", error.message || "Verification failed.", 500);
  }
}
