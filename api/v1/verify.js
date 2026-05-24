import {
  buildDeterministicReplay,
  buildPublicVerifyPayload,
  loadExecutionReplayReadOnly
} from "../execution/replay.js";
import { ok, fail, methodGuard } from "../../../shared/response.js";

function resolveExecutionId(req) {
  return (
    req.query.execution_id ||
    req.query.executionId ||
    null
  );
}

export default async function handler(req, res) {
  try {
    if (!methodGuard(req, res, ["GET"])) return;

    const execution_id = resolveExecutionId(req);
    if (!execution_id) {
      return fail(res, "EXECUTION_ID_REQUIRED", "execution_id is required.", 400);
    }

    const loaded = await loadExecutionReplayReadOnly({ execution_id });

    const replay = buildDeterministicReplay({
      execution_id,
      execution: loaded.execution,
      audit_events_count: loaded.audit_events_count,
      ledger_entries_count: loaded.ledger_entries_count
    });

    return ok(res, {
      mode: loaded.mode || "PUBLIC_READ_ONLY",
      ...buildPublicVerifyPayload(replay)
    });
  } catch (err) {
    return fail(
      res,
      "PUBLIC_VERIFY_FAILED",
      err.message || "Public verification failed.",
      500
    );
  }
}
