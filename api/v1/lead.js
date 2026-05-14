/**
 * POST /api/v1/lead — Pilot request capture.
 * No auth required — public endpoint for onboarding flow.
 */
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const { name, email, project, amount, location, phases } = req.body || {};

  if (!email || !project) {
    return fail(res, "MISSING_FIELDS", "email and project are required.", 400);
  }

  // Log lead (Vercel function logs visible in dashboard)
  console.log("[EXECUTIA LEAD]", JSON.stringify({ name, email, project, amount, location, phases, ts: new Date().toISOString() }));

  // TODO: Plug in Resend / SendGrid / Supabase here
  // await sendEmail({ to: email, template: "pilot_confirmation", data: { name, project, amount } });

  return ok(res, {
    received:   true,
    message:    "Your EXECUTIA pilot request has been received.",
    next_step:  "A pilot proposal will be sent to your email within 24 hours.",
    reference:  `EXC-${Date.now().toString(36).toUpperCase()}`
  });
}
