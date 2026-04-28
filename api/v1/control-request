export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    // 🔐 AUTH (ENTRY → ENGINE)
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || token !== process.env.ENGINE_REQUEST_TOKEN) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const payload = req.body || {};

    const {
      request_id,
      organization,
      operator,
      email,
      sector,
      context,
      outcome,
      source,
      received_at
    } = payload;

    // ❗ NAV execution validation
    // ❗ NAV decision
    // ❗ NAV ledger commit

    // ✅ tikai intake + registry + review

    const record = {
      id: `cr_${Date.now()}`,
      request_id,
      organization,
      operator,
      email,
      sector,
      context,
      outcome,
      source,
      status: "RECEIVED",
      created_at: new Date().toISOString(),
      received_at
    };

    // 👉 ieraksts DB (Supabase)
    await saveControlRequest(record);

    // 👉 audit (optional)
    await logAudit({
      type: "CONTROL_REQUEST_RECEIVED",
      request_id: record.request_id,
      at: record.created_at
    });

    return res.status(200).json({
      ok: true,
      status: "RECEIVED",
      id: record.id
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "CONTROL_REQUEST_FAILED",
      message: err.message
    });
  }
}

/* =========================
   DB WRITE
========================= */

async function saveControlRequest(record) {
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase
    .from("control_requests")
    .insert([record]);

  if (error) {
    console.error("DB insert failed:", error);
    throw new Error("DB_INSERT_FAILED");
  }
}

/* =========================
   AUDIT (optional)
========================= */

async function logAudit(entry) {
  if (!process.env.SUPABASE_URL) return;

  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  await supabase.from("audit_logs").insert([entry]);
}
