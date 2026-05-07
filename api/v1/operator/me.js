import { requireOperator } from "../../../services/operator.js";

export default async function handler(req, res) {
  try {
    const { user } = await requireOperator(req);
    return res.status(200).json({
      ok: true,
      mode: "ENTERPRISE",
      user
    });
  } catch (e) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: e.message }
    });
  }
}
