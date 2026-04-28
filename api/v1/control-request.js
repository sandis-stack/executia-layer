function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY_MISSING" };
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (!recipients.length) {
    return { ok: false, skipped: true, error: "NO_RECIPIENTS" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || "EXECUTIA <no-reply@mail.executia.io>",
      to: recipients,
      subject,
      html
    })
  });

  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    console.error("RESEND_EMAIL_FAILED:", data);
    return { ok: false, error: data };
  }

  return { ok: true, data };
}

async function forwardToEngine(payload) {
  const url =
    process.env.ENGINE_CONTROL_REQUEST_URL ||
    "https://execution.executia.io/api/v1/control-request";

  const token = process.env.ENGINE_REQUEST_TOKEN;

  if (!token) {
    console.error("ENGINE_REQUEST_TOKEN_MISSING");
    return {
      ok: false,
      error: "ENGINE_REQUEST_TOKEN_MISSING"
    };
  }

  console.log("FORWARDING_TO_ENGINE:", url);
  console.log("FORWARD_PAYLOAD_REQUEST_ID:", payload.request_id);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  console.log("ENGINE_RESPONSE_STATUS:", response.status);
  console.log("ENGINE_RESPONSE_DATA:", data);

  if (!response.ok || !data.ok) {
    console.error("ENGINE_FORWARD_FAILED:", data);

    return {
      ok: false,
      status: response.status,
      error: data.error || "ENGINE_FORWARD_FAILED",
      data
    };
  }

  return {
    ok: true,
    status: response.status,
    data
  };
}

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const body = req.body || {};

    const organization = clean(body.organization || body.company);
    const operator = clean(body.operator || body.name);
    const email = clean(body.email);
    const sector = clean(body.sector || body.area || "Not specified");
    const context = clean(body.context || body.message);
    const outcome = clean(body.outcome || "Not specified");

    if (!organization || !operator || !email || !context) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_REQUIRED_FIELDS",
        required: ["organization", "operator", "email", "context"]
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_EMAIL"
      });
    }

    const requestId = `REQ-${Date.now()}`;

    const payload = {
      request_id: requestId,
      organization,
      operator,
      email,
      sector,
      context,
      outcome,
      source: "executia.io/request",
      mode: "INTAKE_ONLY",
      received_at: new Date().toISOString()
    };

    const engineForward = await forwardToEngine(payload);

    const operatorEmail = await sendEmail({
      to: [process.env.OPERATOR_EMAIL].filter(Boolean),
      subject: `EXECUTIA Pilot Intake — ${organization}`,
      html: `
        <h2>EXECUTIA Pilot Intake</h2>

        <p><strong>Request ID:</strong> ${escapeHtml(requestId)}</p>
        <p><strong>Organization:</strong> ${escapeHtml(organization)}</p>
        <p><strong>Responsible Operator:</strong> ${escapeHtml(operator)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Sector:</strong> ${escapeHtml(sector)}</p>

        <hr />

        <p><strong>Execution Context:</strong></p>
        <p>${escapeHtml(context)}</p>

        <p><strong>Expected Control Outcome:</strong></p>
        <p>${escapeHtml(outcome)}</p>

        <hr />

        <p><strong>Mode:</strong> INTAKE ONLY</p>
        <p><strong>Forwarded to ENGINE:</strong> ${engineForward.ok ? "YES" : "NO"}</p>
        <p><strong>ENGINE decision:</strong> ${escapeHtml(engineForward.data?.decision || "NOT_AVAILABLE")}</p>
        <p><strong>ENGINE reason:</strong> ${escapeHtml(engineForward.data?.decision_reason || "NOT_AVAILABLE")}</p>
        <p><strong>Received:</strong> ${escapeHtml(payload.received_at)}</p>
      `
    });

    const userEmail = await sendEmail({
      to: [email],
      subject: "EXECUTIA pilot request received",
      html: `
        <h2>Request received</h2>

        <p>Your EXECUTIA pilot intake has been received.</p>

        <p><strong>Request ID:</strong> ${escapeHtml(requestId)}</p>
        <p><strong>Status:</strong> UNDER REVIEW</p>
        <p><strong>Engine forwarded:</strong> ${engineForward.ok ? "YES" : "NO"}</p>

        <hr />

        <p>
          This request does not create an execution decision inside the entry layer.
          Execution decisions are made only by the EXECUTIA Engine.
        </p>
      `
    });

    return res.status(engineForward.ok ? 200 : 502).json({
      ok: engineForward.ok,
      request_id: requestId,
      status: engineForward.ok ? "UNDER_REVIEW" : "ENGINE_FORWARD_FAILED",
      mode: "INTAKE_ONLY",
      engine_forwarded: engineForward.ok,
      engine_status: engineForward.status || null,
      engine_response: engineForward.data || null,
      email_operator_sent: operatorEmail.ok,
      email_user_sent: userEmail.ok,
      message: engineForward.ok ? "REQUEST_RECEIVED" : "REQUEST_NOT_FORWARDED_TO_ENGINE"
    });
  } catch (error) {
    console.error("REQUEST_HANDLER_FAILED:", error);

    return res.status(500).json({
      ok: false,
      error: "REQUEST_FAILED",
      message: error.message
    });
  }
}
