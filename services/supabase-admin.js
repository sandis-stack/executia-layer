/**
 * EXECUTIA™ — /services/supabase-admin.js
 * Single Supabase admin client. Service role — bypasses RLS.
 */

import { createClient } from "@supabase/supabase-js";

let _client = null;

export function createSupabaseAdmin() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
