import { anchorTruth } from "../../services/truth-anchor.js";
import { requireInternalKey } from "../../services/auth.js";
import { ok, fail, methodGuard } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error || "UNAUTHORIZED" });

    if (!methodGuard(req, res, ["POST"])) return;

    const anchor = await anchorTruth(req.body || {});

    return ok(res, {
      message: "TRUTH_ANCHORED",
      anchor
    });

  } catch (err) {
    return fail(res, err.code || "TRUTH_ANCHOR_FAILED", err.message || "Truth anchoring failed.", 500);
  }
}
