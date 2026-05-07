import { createClient } from "@supabase/supabase-js";

let cached = null;

export function hasSupabaseEnv() {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function db() {
  if (!hasSupabaseEnv()) {
    const err = new Error("SUPABASE_ENV_MISSING");
    err.code = "SUPABASE_ENV_MISSING";
    throw err;
  }

  if (!cached) {
    cached = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }

  return cached;
}