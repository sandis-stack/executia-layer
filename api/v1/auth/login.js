import { createClient } from "@supabase/supabase-js";
import ws from "ws";

function client() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_AUTH_ENV_MISSING_SERVICE_ROLE");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED" }
    });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: { code: "EMAIL_PASSWORD_REQUIRED" }
      });
    }

    const supabase = client();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data?.session?.access_token) {
      return res.status(401).json({
        ok: false,
        error: {
          code: "LOGIN_FAILED",
          message: error?.message || "Invalid credentials"
        }
      });
    }

    return res.status(200).json({
      ok: true,
      mode: "ENTERPRISE",
      user: {
        id: data.user.id,
        email: data.user.email
      },
      access_token: data.session.access_token,
      expires_at: data.session.expires_at
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "LOGIN_ERROR",
        message: e.message
      }
    });
  }
}
