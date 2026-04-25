import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ ok: false, error: "SUPABASE_ENV_MISSING" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = req.body || {};
    const amount = Number(body.amount || 0);

    let status = "APPROVED";
    let reason = "Execution approved";

    if (amount <= 0) {
      status = "BLOCKED";
      reason = "Amount must be greater than zero";
    } else if (amount > 10000) {
      status = "REQUIRES_REVIEW";
      reason = "High-value execution requires review";
    }

    if (body.context?.legalBlock === true) {
      status = "BLOCKED";
      reason = "Legal block detected";
    }

    const execution_id =
      "EX-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const truth_hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ execution_id, amount, status, reason, body }))
      .digest("hex");

    const insertPayload = {
      execution_id,
      status,
      result_status: status,
      authorized: status === "APPROVED",
      hold_pending: status === "REQUIRES_REVIEW",
      budget: amount,
      reason,
      source: body.context?.source || "dashboard",
      payload: {
        ...body,
        currency: body.currency || "EUR",
        truth_hash
      }
    };

    const { data, error } = await supabase
      .from("executions")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return res.status(200).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      decision: status,
      status,
      reason,
      truth_hash,
      execution: data
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: err.message || String(err)
    });
  }
}
