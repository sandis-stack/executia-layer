import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LOCK_TTL_MINUTES = 5;

function getToken(req) {
  const auth = req.headers.authorization || "";
  return auth.replace("Bearer ", "");
}

async function getOperator(req) {
  const token = getToken(req);

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const { data, error } = await db.auth.getUser(token);

  if (error || !data?.user) {
    throw new Error("INVALID_TOKEN");
  }

  return data.user;
}

export default async function handler(req, res) {
  try {
    const user = await getOperator(req);

    const execution_id =
      req.body?.execution_id ||
      req.query?.execution_id;

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: "execution_id required"
      });
    }

    if (req.method === "GET") {
      const { data, error } = await db
        .from("execution_results")
        .select("id,status,locked_by,locked_at,lock_expires_at")
        .eq("id", execution_id)
        .single();

      if (error) throw error;

      return res.json({
        ok: true,
        lock: data
      });
    }

    if (req.method === "DELETE") {
      const { error } = await db
        .from("execution_results")
        .update({
          locked_by: null,
          locked_at: null,
          lock_expires_at: null
        })
        .eq("id", execution_id);

      if (error) throw error;

      return res.json({
        ok: true,
        released: true
      });
    }

    if (req.method === "POST") {

      const now = new Date();
      const expires = new Date(
        now.getTime() + LOCK_TTL_MINUTES * 60 * 1000
      );

      const { data: existing } = await db
        .from("execution_results")
        .select("locked_by,lock_expires_at")
        .eq("id", execution_id)
        .single();

      if (
        existing?.locked_by &&
        existing?.locked_by !== user.id &&
        existing?.lock_expires_at &&
        new Date(existing.lock_expires_at) > now
      ) {
        return res.status(409).json({
          ok: false,
          error: "EXECUTION_LOCKED",
          locked_by: existing.locked_by,
          expires_at: existing.lock_expires_at
        });
      }

      const { error } = await db
        .from("execution_results")
        .update({
          locked_by: user.id,
          locked_at: now.toISOString(),
          lock_expires_at: expires.toISOString()
        })
        .eq("id", execution_id);

      if (error) throw error;

      return res.json({
        ok: true,
        locked: true,
        locked_by: user.id,
        expires_at: expires.toISOString()
      });
    }

    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });

  } catch (e) {
    console.error("[LOCK]", e);

    return res.status(500).json({
      ok: false,
      error: e.message || "SERVER_ERROR"
    });
  }
}