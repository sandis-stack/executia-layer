/**
 * POST /api/v1/lead — Pilot request capture + email confirmation.
 * No auth required — public endpoint for onboarding flow.
 */
import { ok, fail } from "../../shared/response.js";
import { sendEmail, escapeHtml } from "../../services/email.js";

function leadReference() {
  return `EXC-${Date.now().toString(36).toUpperCase()}`;
}

function leadHtml({ title, name, email, project, amount, location, phases, reference, internal }) {
  const safe = {
    title: escapeHtml(title),
    name: escapeHtml(name || "EXECUTIA user"),
    email: escapeHtml(email),
    project: escapeHtml(project),
    amount: escapeHtml(amount),
    location: escapeHtml(location),
    phases: escapeHtml(phases),
    reference: escapeHtml(reference)
  };

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#10233f">
      <h2>${safe.title}</h2>
      ${internal ? `<p><strong>New pilot lead received.</strong></p>` : `<p>Hello ${safe.name},</p><p>Your EXECUTIA pilot request has been received.</p>`}
      <p><strong>Reference:</strong> ${safe.reference}</p>
      <p><strong>Name:</strong> ${safe.name}</p>
      <p><strong>Email:</strong> ${safe.email}</p>
      <p><strong>Project:</strong> ${safe.project}</p>
      <p><strong>Amount:</strong> ${safe.amount || "-"}</p>
      <p><strong>Location:</strong> ${safe.location || "-"}</p>
      <p><strong>Execution phases:</strong> ${safe.phases || "-"}</p>
      ${internal ? "" : `<p>We will review the request and contact you within 24 hours.</p>`}
      <p style="margin-top:24px">EXECUTIA™<br/>Execution Integrity System</p>
    </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const { name, email, project, amount, location, phases } = req.body || {};

  if (!email || !project) {
    return fail(res, "MISSING_FIELDS", "email and project are required.", 400);
  }

  const reference = leadReference();
  const notifyEmail = process.env.LEAD_NOTIFY_EMAIL || "sandisb@gmail.com";

  console.log("[EXECUTIA LEAD]", JSON.stringify({
    name, email, project, amount, location, phases, reference, ts: new Date().toISOString()
  }));

  try {
    await sendEmail({
      to: email,
      subject: `EXECUTIA pilot request received — ${reference}`,
      html: leadHtml({ title: "EXECUTIA pilot request received", name, email, project, amount, location, phases, reference, internal: false })
    });

    await sendEmail({
      to: notifyEmail,
      subject: `New EXECUTIA pilot lead — ${project}`,
      html: leadHtml({ title: "New EXECUTIA pilot lead", name, email, project, amount, location, phases, reference, internal: true })
    });

    return ok(res, {
      received: true,
      email_sent: true,
      notify_sent: true,
      message: "Your EXECUTIA pilot request has been received.",
      next_step: "Confirmation email sent. We will contact you within 24 hours.",
      reference
    });
  } catch (error) {
    console.error("[EXECUTIA LEAD EMAIL FAILED]", error);

    return fail(
      res,
      error.code || "EMAIL_SEND_FAILED",
      error.message || "Pilot request captured, but email delivery failed.",
      500
    );
  }
}
