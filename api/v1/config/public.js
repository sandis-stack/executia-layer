function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

export default async function handler(req, res) {
  return json(res, 200, {
    ok: true,
    supabase_url: process.env.SUPABASE_URL || null,
    supabase_anon_key: process.env.SUPABASE_ANON_KEY || null,
    realtime_enabled: Boolean(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY
    )
  });
}
