import { db } from "../services/db.js";

export default async function handler(req, res) {
  try {
    const { data, error } = await db
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
