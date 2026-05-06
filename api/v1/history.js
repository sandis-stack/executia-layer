import { db } from "../../services/db.js";
import { ok, fail } from "../../shared/response.js";
import { requireInternalKey } from "../../services/auth.js";

export default async function handler(req, res) {
  try {
    const auth = requireInternalKey(req);
    if (!auth.ok) return fail(res, "UNAUTHORIZED", "Invalid API key.", 401);

    const { data, error } = await db()
      .from("execution_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return ok(res, {
      ok: true,
      executions: data || []
    });
  } catch (e) {
    return fail(res, "HISTORY_FAILED", e.message, 500);
  }
}
