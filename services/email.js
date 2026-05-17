import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendRequestEmails(payload = {}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("EMAIL_DISABLED");
    return;
  }

  const {
    organization,
    email,
    domain,
    problem,
    outcome,
    request_id
  } = payload;

  try {
    await resend.emails.send({
      from: "EXECUTIA <noreply@executia.io>",
      to: ["sandisb@gmail.com"],
      subject: `New EXECUTIA Request — ${organization || "Unknown Organization"}`,
      html: `
        <h2>New EXECUTIA Request</h2>
        <p><strong>Organization:</strong> ${organization || "-"}</p>
        <p><strong>Email:</strong> ${email || "-"}</p>
        <p><strong>Domain:</strong> ${domain || "-"}</p>
        <p><strong>Problem:</strong> ${problem || "-"}</p>
        <p><strong>Outcome:</strong> ${outcome || "-"}</p>
        <p><strong>Request ID:</strong> ${request_id || "-"}</p>
      `
    });

    if (email) {
      await resend.emails.send({
        from: "EXECUTIA <noreply@executia.io>",
        to: [email],
        subject: "EXECUTIA Request Received",
        html: `
          <h2>Execution Request Received</h2>
          <p>Your governance intake has been initialized.</p>
          <p>EXECUTIA analysis pipeline has started.</p>
          <p>Request ID: <strong>${request_id || "-"}</strong></p>
        `
      });
    }
  } catch (err) {
    console.error("REQUEST_EMAIL_FAILED", err);
  }
}
