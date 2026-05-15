/**
 * POST /api/v1/lead — Pilot request bridge.
 * Public endpoint for execution.executia.io/demo.
 * Forwards pilot request to the live EXECUTIA entry request system.
 */
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const { name, email, project, amount, location, phases } = req.body || {};

  if (!email || !project) {
    return fail(res, "MISSING_FIELDS", "email and project are required.", 400);
  }

  const payload = {
    organization: project,
    operator: name || "EXECUTIA demo user",
    email,
    sector: location || "Execution pilot",
    context: [
      `Project: ${project}`,
      `Location: ${location || "-"}`,
      `Execution phases: ${phases || "-"}`,
      "Source: execution.executia.io/demo"
    ].join("\n"),
    outcome: `Contract value EUR: ${amount || "-"}`
  };

  try {
    const upstream = await fetch("https://executia.io/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok || !data.ok) {
      console.error("[EXECUTIA LEAD BRIDGE FAILED]", upstream.status, data);
      return fail(
        res,
        data.error || "REQUEST_BRIDGE_FAILED",
        "Pilot request was not confirmed by the entry request system.",
        upstream.status || 500
      );
    }

    return ok(res, {
      received: true,
      bridged: true,
      request_id: data.request_id,
      reference: data.request_id,
      message: "Your EXECUTIA pilot request has been received.",
      next_step: "Confirmation email sent. EXECUTIA operator copy sent."
    });
  } catch (error) {
    console.error("[EXECUTIA LEAD BRIDGE ERROR]", error);
    return fail(
      res,
      "REQUEST_BRIDGE_ERROR",
      error.message || "Could not forward pilot request.",
      500
    );
  }
}
