import { createClient } from "@supabase/supabase-js";

const LOCK_TTL_MINUTES = 5;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(body));
}

function getDb() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function getOperator(db, req) {
  const token = getToken(req);

  if (!token) return null;

  const { data, error } = await db.auth.getUser(token);

  if (error || !data?.user) return null;

  return data.user;
}

export default async function handler(req, res) {
  try {
    const db = getDb();

    if (!db) {
      return json(res, 500, {
        ok: false,
        error: "SUPABASE_ENV_MISSING"
      });
    }

    const user = await getOperator(db, req);

    if (!user) {
      return json(res, 401, {
        ok: false,
        error: "UNAUTHORIZED"
      });
    }

    const body = await readBody(req);

    const execution_id = body.execution_id || req.query?.execution_id;

    if (!execution_id) {
      return json(res, 400, {
        ok: false,
        error: "EXECUTION_ID_REQUIRED"
      });
    }

    if (req.method === "GET") {
      const { data, error } = await db
        .from("execution_results")
        .select("id,status,locked_by,locked_at,lock_expires_at")
        .eq("id", execution_id)
        .single();

      if (error) {
        return json(res, 500, {
          ok: false,
          error: error.message
        });
      }

      return json(res, 200, {
        ok: true,
        lock: data
      });
    }

    if (req.method === "DELETE") {
      const now = new Date().toISOString();

      const { error } = await db
        .from("execution_results")
        .update({
          locked_by: null,
          locked_at: null,
          lock_expires_at: null
        })
        .eq("id", execution_id)
        .or(`locked_by.eq.${user.id},lock_expires_at.lt.${now}`);

      if (error) {
        return json(res, 500, {
          ok: false,
          error: error.message
        });
      }

      return json(res, 200, {
        ok: true,
        released: true
      });
    }

    if (req.method === "POST") {
      const now = new Date();
      const expires = new Date(now.getTime() + LOCK_TTL_MINUTES * 60 * 1000);

      const { data: existing, error: readError } = await db
        .from("execution_results")
        .select("locked_by,lock_expires_at")
        .eq("id", execution_id)
        .single();

      if (readError) {
        return json(res, 500, {
          ok: false,
          error: readError.message
        });
      }

      if (
        existing?.locked_by &&
        existing.locked_by !== user.id &&
        existing?.lock_expires_at &&
        new Date(existing.lock_expires_at) > now
      ) {
        return json(res, 409, {
          ok: false,
          error: "EXECUTION_LOCKED",
          locked_by: existing.locked_by,
          expires_at: existing.lock_expires_at
        });
      }

      const { error: updateError } = await db
        .from("execution_results")
        .update({
          locked_by: user.id,
          locked_at: now.toISOString(),
          lock_expires_at: expires.toISOString()
        })
        .eq("id", execution_id);

      if (updateError) {
        return json(res, 500, {
          ok: false,
          error: updateError.message
        });
      }

      return json(res, 200, {
        ok: true,
        locked: true,
        locked_by: user.id,
        expires_at: expires.toISOString()
      });
    }

    return json(res, 405, {
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  } catch (e) {
    console.error("[EXECUTIA_LOCK_FATAL]", e);

    return json(res, 500, {
      ok: false,
      error: e.message || "SERVER_ERROR"
    });
  }
}
