import { requireInternalKey } from "../../../services/auth.js";
import { resolveJwtContext, requireJwtPermission } from "../../../services/jwt-auth.js";
import {
  buildDeterministicReplay,
  buildPublicVerifyPayload,
  loadExecutionReplayReadOnly,
  PUBLIC_VERIFY_CANONICAL_NOTE,
  REPLAY_CANONICAL_NOTE,
  REPLAY_MODE,
  resolveCanonicalReplayResult,
  buildReplayTimeline
} from "../../../services/execution-replay.js";
import { ok, fail, methodGuard } from "../../../shared/response.js";

export {
  REPLAY_MODE,
  REPLAY_CANONICAL_NOTE,
  PUBLIC_VERIFY_CANONICAL_NOTE,
  resolveCanonicalReplayResult,
  buildReplayTimeline,
  buildDeterministicReplay,
  buildPublicVerifyPayload,
  loadExecutionReplayReadOnly
};

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

    const loaded = await loadExecutionReplayReadOnly({
      execution_id,
      organization_id: auth.organization_id
    });

    const replay = buildDeterministicReplay({
      execution_id,
      execution: loaded.execution,
      audit_events_count: loaded.audit_events_count,
      ledger_entries_count: loaded.ledger_entries_count
    });

    return ok(res, {
      mode: loaded.mode || auth.mode,
      organization_id: auth.organization_id,
      user: auth.user,
      ...replay
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
