import { Resend } from "resend";

export async function sendExecutiaMail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    return { sent:false, reason:"RESEND_API_KEY_MISSING" };
  }

  if (!to) {
    return { sent:false, reason:"EMAIL_TO_MISSING" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const from =
    process.env.FROM_EMAIL ||
    "EXECUTIA <noreply@executia.io>";

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html
    });

    return {
      sent:true,
      id:result?.data?.id || null
    };
  } catch (error) {
    console.error("EXECUTIA_MAIL_FAILED", error);

    return {
      sent:false,
      reason:error.message || "EXECUTIA_MAIL_FAILED"
    };
  }
}
