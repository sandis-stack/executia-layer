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

  if (internal) {
    return `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0b2346;background:#f3f6fa;padding:32px">
        <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #d7e0ea;padding:38px">
          <div style="font-size:12px;letter-spacing:7px;color:#667085;font-weight:700;text-transform:uppercase">EXECUTIA · NEW LEAD</div>
          <h2 style="font-size:28px;line-height:1.2;margin:26px 0 16px;color:#08204a">New execution request received.</h2>
          <div style="background:#f2f5f9;border-left:5px solid #0b2d5c;padding:20px 24px;margin:26px 0;font-family:Menlo,Consolas,monospace;color:#111827">
            <div><strong>EXECUTION ID:</strong> ${safe.reference}</div>
            <div><strong>STATUS:</strong> UNDER REVIEW</div>
            <div><strong>NAME:</strong> ${safe.name}</div>
            <div><strong>EMAIL:</strong> ${safe.email}</div>
            <div><strong>PROJECT:</strong> ${safe.project}</div>
            <div><strong>AMOUNT:</strong> ${safe.amount || "-"}</div>
            <div><strong>LOCATION:</strong> ${safe.location || "-"}</div>
            <div><strong>PHASES:</strong> ${safe.phases || "-"}</div>
          </div>
          <p style="font-size:14px;color:#667085;border-top:1px solid #d7e0ea;padding-top:22px">EXECUTIA™<br/>Execution Control Infrastructure<br/>control@executia.io</p>
        </div>
      </div>
    `;
  }

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0b2346;background:#f3f6fa;padding:32px">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #d7e0ea;padding:42px">
        <div style="font-size:12px;letter-spacing:7px;color:#667085;font-weight:700;text-transform:uppercase">EXECUTIA · REQUEST RECEIVED</div>

        <h1 style="font-size:32px;line-height:1.18;margin:28px 0 18px;color:#08204a;font-weight:800">Your request has entered the system.</h1>

        <p style="font-size:17px;color:#344054;margin:0 0 28px">We received your request and linked it to the EXECUTIA control flow.</p>

        <div style="background:#f2f5f9;border-left:5px solid #0b2d5c;padding:22px 26px;margin:28px 0;font-family:Menlo,Consolas,monospace;color:#111827;font-size:14px;line-height:1.8">
          <div><strong>EXECUTION ID:</strong>&nbsp;&nbsp; ${safe.reference}</div>
          <div><strong>STATUS:</strong>&nbsp;&nbsp; UNDER REVIEW</div>
          <div><strong>PRIORITY:</strong>&nbsp;&nbsp; STANDARD</div>
          <div><strong>RESPONSE WINDOW:</strong>&nbsp;&nbsp; 24–48H</div>
        </div>

        <div style="font-family:Menlo,Consolas,monospace;color:#111827;font-size:15px;line-height:1.9;margin-top:28px">
          <div style="letter-spacing:5px;color:#667085;font-size:12px;font-family:Arial,sans-serif;font-weight:700;text-transform:uppercase;margin-bottom:10px">NEXT:</div>
          <div>– initial validation</div>
          <div>– risk screening</div>
          <div>– operator review</div>
        </div>

        <a href="https://execution.executia.io/demo" style="display:inline-block;background:#08204a;color:#ffffff;text-decoration:none;font-weight:800;letter-spacing:4px;text-transform:uppercase;padding:16px 28px;margin:34px 0 22px;font-size:13px">→ Track your request</a>

        <div style="border-top:1px solid #d7e0ea;margin-top:18px;padding-top:24px;color:#667085;font-size:14px;line-height:1.6">
          <strong>EXECUTIA</strong><br/>
          Execution Control Infrastructure<br/>
          <a href="mailto:control@executia.io" style="color:#0b4eb3">control@executia.io</a>
        </div>
      </div>
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
