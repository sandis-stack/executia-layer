import { createClient } from "@supabase/supabase-js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body, null, 2));
}

function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function decodeJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const token = bearer(req);
  const payload = token ? decodeJwt(token) : null;

  const supabaseUrl = process.env.SUPABASE_URL || null;
  const anonPresent = Boolean(process.env.SUPABASE_ANON_KEY);
  const servicePresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let getUser = null;

  try {
    if (token && supabaseUrl && process.env.SUPABASE_ANON_KEY) {
      const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const { data, error } = await supabase.auth.getUser(token);

      getUser = {
        ok: Boolean(data?.user && !error),
        error: error?.message || null,
        email: data?.user?.email || null,
        user_metadata: data?.user?.user_metadata || null
      };
    }
  } catch (err) {
    getUser = { ok: false, error: err.message };
  }

  return json(res, 200, {
    ok: true,
    env: {
      supabase_url: supabaseUrl,
      anon_key_present: anonPresent,
      service_role_present: servicePresent
    },
    token: {
      present: Boolean(token),
      iss: payload?.iss || null,
      email: payload?.email || null,
      role: payload?.role || null,
      user_metadata: payload?.user_metadata || null,
      exp: payload?.exp || null
    },
    getUser
  });
}
