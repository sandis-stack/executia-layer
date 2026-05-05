import { listExecutions } from "../../services/execution.js";
import { requireInternalKey } from "../../services/auth.js";
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid API key.", 401);
    const items = await listExecutions(100);
    return ok(res, { items });
  } catch (error) {
    return fail(res, "HISTORY_FAILED", error.message || "History failed.", 500);
  }
}
