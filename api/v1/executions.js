import { db } from "../services/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const { data, error } = await db
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return res.status(200).json({
        ok: false,
        executions: [],
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      executions: data || []
    });

  } catch (err) {
    return res.status(200).json({
      ok: false,
      executions: [],
      error: err.message
    });
  }
}
