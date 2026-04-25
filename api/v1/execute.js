import crypto from "crypto";
import { db } from "../services/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const {
      session_id = "demo_session",
      organization_id = "org_norsteel",
      project_id = "prj_alpha",
      event_type = "payment",
      amount = 0,
      currency = "EUR",
      context = {}
    } = req.body || {};

    let decision = "APPROVE";
    let reason = "Execution approved";

    if (Number(amount) <= 0) {
      decision = "BLOCK";
      reason = "Amount must be greater than zero";
    }

    if (Number(amount) > 10000) {
      decision = "ESCALATE";
      reason = "High-value payment requires review";
    }

    if (context.legalBlock === true) {
      decision = "BLOCK";
      reason = "Legal block detected";
    }

    const truth_hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({
        session_id,
        organization_id,
        project_id,
        event_type,
        amount,
        currency,
        decision,
        reason,
        context
      }))
      .digest("hex");

    const { data, error } = await db
      .from("executions")
      .insert({
        session_id,
        organization_id,
        project_id,
        event_type,
        amount,
        currency,
        decision,
        reason,
        truth_hash
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      decision,
      reason,
      truth_hash,
      execution: data
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
