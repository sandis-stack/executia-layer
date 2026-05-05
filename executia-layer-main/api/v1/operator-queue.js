import { listExecutions } from "../../services/execution.js";
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const items = await listExecutions(100);
    return ok(res, {
      items: items.filter((item) => item.status === "PENDING_REVIEW")
    });
  } catch (error) {
    return fail(res, "QUEUE_FAILED", error.message || "Queue failed.", 500);
  }
}
