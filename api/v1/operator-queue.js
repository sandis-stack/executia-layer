import { listPendingReview } from "../../services/execution.js";
import { requireInternalKey } from "../../services/auth.js";
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error || "UNAUTHORIZED" });

    const items = await listPendingReview(100);
    return ok(res, {
      items: items.filter((item) => item.status === "PENDING_REVIEW")
    });
  } catch (error) {
    return fail(res, "QUEUE_FAILED", error.message || "Queue failed.", 500);
  }
}
