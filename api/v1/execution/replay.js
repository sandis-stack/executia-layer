import { db, hasSupabaseEnv } from "../../../services/db.js";
import { requireInternalKey } from "../../../services/auth.js";
import { resolveJwtContext, requireJwtPermission } from "../../../services/jwt-auth.js";
import { ok, fail, methodGuard } from "../../../shared/response.js";

export const REPLAY_MODE = "READ_ONLY_DETERMINISTIC_REVALIDATION";

export const REPLAY_CANONICAL_NOTE =
  "Replay is read-only. Canonical truth remains Phase 3B3 audit verification + ledger_entries.";

export function buildDeterministicReplay({
  execution_id,
  execution = null,
  audit_events_count = 0,
  ledger_entries_count = 0
}) {
  const execution_found = Boolean(execution);
  const hash = execution?.hash || null;
  const previous_hash = execution?.prev_hash || execution?.previous_hash || null;

  const deterministic_checks = {
    execution_hash_present: Boolean(hash),
    previous_hash_present: Boolean(previous_hash),
    audit_events_present: audit_events_count > 0,
    ledger_entries_present: ledger_entries_count > 0,
    canonical_replay_safe: false
  };

  deterministic_checks.canonical_replay_safe =
    execution_found &&
    deterministic_checks.execution_hash_present &&
    deterministic_checks.previous_hash_present &&
    deterministic_checks.audit_events_present &&
    deterministic_checks.ledger_entries_present;

  return {
    replay_mode: REPLAY_MODE,
    execution_id,
    execution_found,
    status: execution?.status ?? null,
    decision: execution?.decision ?? null,
    actor: execution?.actor ?? null,
    subject: execution?.subject ?? null,
    hash,
    previous_hash,
    audit_events_count,
    ledger_entries_count,
    deterministic_checks,
    canonical_note: REPLAY_CANONICAL_NOTE
  };
}

async function loadLedgerEntryCount(execution_id) {
  try {
    const { count, error } = await db()
      .from("ledger_entries")
      .select("*", { count: "exact", head: true })
      .eq("execution_id", execution_id);

    if (error) return 0;
    return count || 0;
  } catch (_) {
    return 0;
  }
}

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["GET"])) return;

    const execution_id = req.query.execution_id;
    if (!execution_id) {
      return fail(res, "EXECUTION_ID_REQUIRED", "execution_id query parameter is required.", 400);
    }

    const internalAuth = requireInternalKey(req);

    let auth = {
      ok: true,
      mode: "INTERNAL_KEY",
      organization_id: null,
      user: "system"
    };

    if (!internalAuth.ok) {
      auth = await resolveJwtContext(req);

      if (!auth.ok) {
        return fail(
          res,
          auth.error || "UNAUTHORIZED",
          auth.error || "JWT auth failed.",
          auth.status || 401
        );
      }

      const permission = requireJwtPermission(auth, "view");

      if (!permission.ok) {
        return fail(
          res,
          permission.error || "FORBIDDEN",
          permission.reason || "Forbidden.",
          permission.status || 403
        );
      }
    }

    if (!hasSupabaseEnv()) {
      return ok(res, {
        mode: "DRY_RUN",
        ...buildDeterministicReplay({ execution_id })
      });
    }

    let executionQuery = db()
      .from("execution_results")
      .select("*")
      .eq("execution_id", execution_id);

    if (auth.organization_id) {
      executionQuery = executionQuery.eq("organization_id", auth.organization_id);
    }

    const { data: execution, error: executionError } = await executionQuery.maybeSingle();

    if (executionError) throw executionError;

    if (!execution) {
      return ok(res, {
        mode: auth.mode,
        organization_id: auth.organization_id,
        user: auth.user,
        ...buildDeterministicReplay({ execution_id })
      });
    }

    const { data: auditEvents, error: auditError } = await db()
      .from("audit_events")
      .select("id")
      .eq("execution_id", execution_id);

    if (auditError) throw auditError;

    const ledger_entries_count = await loadLedgerEntryCount(execution_id);

    return ok(res, {
      mode: auth.mode,
      organization_id: auth.organization_id,
      user: auth.user,
      ...buildDeterministicReplay({
        execution_id,
        execution,
        audit_events_count: (auditEvents || []).length,
        ledger_entries_count
      })
    });
  } catch (err) {
    return fail(
      res,
      "EXECUTION_REPLAY_FAILED",
      err.message || "Execution replay failed.",
      500
    );
  }
}
