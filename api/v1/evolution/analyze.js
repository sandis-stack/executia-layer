import { analyzeExecutionDrift } from "../../../services/evolution/self-evolution.js";

export default async function handler(req, res) {
  try {
    const result = await analyzeExecutionDrift();

    return res.status(200).json(result);

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e.message
    });
  }
}
