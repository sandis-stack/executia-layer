import { mailTemplate } from "./mail-template.js";
import { sendExecutiaMail } from "./executia-mail.js";

export async function sendPilotReceivedNotification(record) {
  const base =
    process.env.APP_URL ||
    "https://execution.executia.io";

  const pilotUrl =
    `${base}/request-pilot/`;

  const clientHtml = mailTemplate(
    "Pilot review request received.",
    [
      ["REVIEW ID", record.review_id],
      ["ORGANIZATION", record.organization || "-"],
      ["DOMAIN", record.domain || "-"],
      ["STATE", record.state || "PILOT_REVIEW_RECEIVED"],
      ["RESPONSE WINDOW", "24-48H"]
    ],
    "Your EXECUTIA pilot review request has been registered for institutional governance evaluation.",
    { url: pilotUrl, label: "OPEN REQUEST PILOT" }
  );

  const operatorHtml = mailTemplate(
    "New EXECUTIA pilot request received.",
    [
      ["REVIEW ID", record.review_id],
      ["ORGANIZATION", record.organization || "-"],
      ["CONTACT", record.contact || "-"],
      ["EMAIL", record.email || "-"],
      ["DOMAIN", record.domain || "-"],
      ["RISK", record.risk || "-"],
      ["CURRENT SYSTEM", record.current_system || "-"],
      ["CONTEXT", record.problem || "-"],
      ["RECEIVED", record.payload?.created_at || "-"]
    ],
    "Review the requested execution point and define the controlled pilot scope.",
    { url: pilotUrl, label: "OPEN REQUEST PILOT" }
  );

  const results = [];

  if (record.email) {
    results.push(await sendExecutiaMail({
      to: record.email,
      subject: `EXECUTIA - Pilot review received (${record.review_id})`,
      html: clientHtml
    }));
  }

  results.push(await sendExecutiaMail({
    to: process.env.OPERATOR_EMAIL,
    subject: `EXECUTIA - New pilot request (${record.review_id})`,
    html: operatorHtml
  }));

  const failed = results.find(result => !result?.sent);

  return {
    sent: !failed,
    results
  };
}
