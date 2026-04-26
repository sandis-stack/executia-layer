import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false }
    }
  );

  try {
    const { execution_id, action, operator, reason } = req.body;

    if (!execution_id || !action) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_INPUT"
      });
    }

    // 🔹 1. Atrodam execution
    const { data: existing, error: fetchError } = await supabase
      .from("executions")
      .select("*")
      .eq("execution_id", execution_id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        ok: false,
        error: "EXECUTION_NOT_FOUND"
      });
    }

    const previous_status = existing.status;

    // 🔹 2. Jaunais statuss
    let new_status = "REQUIRES_REVIEW";

    if (action === "APPROVE") new_status = "APPROVED";
    if (action === "BLOCK") new_status = "BLOCKED";
    if (action === "REVIEW") new_status = "REQUIRES_REVIEW";

    // 🔹 3. Update execution (PRIMARY TRUTH)
    const { error: updateError } = await supabase
      .from("executions")
      .update({
        status: new_status,
        authorized: action === "APPROVE",
        updated_at: new Date().toISOString(),
        reason: reason || null
      })
      .eq("execution_id", execution_id);

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: "EXECUTION_UPDATE_FAILED",
        detail: updateError.message
      });
    }

    // 🔹 4. AUDIT (NEKAD NEBLOĶĒ EXECUTION)
    try {
      await supabase.from("audit_logs").insert({
        organization_id: existing.organization_id,
        actor_type: "system",
        actor_id: operator || "unknown",
        actor_label: operator || "EXECUTIA",
        action: "EXECUTION_OVERRIDE",
        entity: "execution",
        entity_id: execution_id,
        previous_status,
        new_status,
        reason: reason || null,
        created_at: new Date().toISOString()
      });
    } catch (auditError) {
      console.error("AUDIT FAILED (NON-BLOCKING):", auditError.message);
    }

    // 🔹 5. FINAL RESPONSE (vienmēr OK)
    return res.status(200).json({
      ok: true,
      action,
      previous_status,
      new_status,
      execution_id
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      detail: err.message
    });
  }
}
