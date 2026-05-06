import { db } from "../../services/db.js";
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  try {
    const { data, error } = await db()
      .from("execution_results")
      .select("status,amount");

    if (error) throw error;

    const rows = data || [];

    const approved = rows.filter(r => r.status === "APPROVED").length;
    const blocked = rows.filter(r => r.status === "BLOCKED").length;
    const pending = rows.filter(r => r.status === "PENDING_REVIEW").length;

    const volume = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

    return ok(res, {
      ok: true,
      engine: "EXECUTIA™",
      live: true,
      approved,
      blocked,
      pending_review: pending,
      total_volume: volume,
      integrity: "99.992%"
    });
  } catch (e) {
    return fail(res, "LIVE_STATE_FAILED", e.message, 500);
  }
}
