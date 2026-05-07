import { requireOperator, recordOperatorAction } from "../../../services/operator.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED" } });
  }

  try {
    const { supabase, user } = await requireOperator(req);
    const result = await recordOperatorAction(supabase, user, req.body);

    return res.status(200).json({
      ok: true,
      mode: "ENTERPRISE",
      result
    });
  } catch (e) {
    return res.status(400).json({
      ok: false,
      error: { code: "OPERATOR_ACTION_FAILED", message: e.message }
    });
  }
}
