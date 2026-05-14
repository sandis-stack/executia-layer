export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EXECUTIA_FROM_EMAIL || "EXECUTIA <onboarding@resend.dev>";

  if (!apiKey) {
    const error = new Error("RESEND_API_KEY_MISSING");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || "EMAIL_SEND_FAILED");
    error.code = "EMAIL_SEND_FAILED";
    error.details = data;
    throw error;
  }

  return data;
}
