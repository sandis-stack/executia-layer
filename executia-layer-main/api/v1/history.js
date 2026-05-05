import { listExecutions } from "../../services/execution.js";
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const items = await listExecutions(100);
    return ok(res, { items });
  } catch (error) {
    return fail(res, "HISTORY_FAILED", error.message || "History failed.", 500);
  }
}
