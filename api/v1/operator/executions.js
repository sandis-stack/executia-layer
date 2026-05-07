import { requireOperator, listExecutions } from "../../../services/operator.js";

export default async function handler(req, res) {
  try {
    const { supabase, user } = await requireOperator(req);
    const items = await listExecutions(supabase);

    return res.status(200).json({
      ok: true,
      mode: "ENTERPRISE",
      operator: user.email,
      items
    });
  } catch (e) {
    return res.status(401).json({
      ok: false,
      error: { code: "OPERATOR_EXECUTIONS_FAILED", message: e.message }
    });
  }
}
