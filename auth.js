export function requireInternalKey(req) {
  const API_KEY = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY;

  if (!API_KEY) {
    return { ok: false, error: "EXECUTIA_API_KEY_MISSING" };
  }

  const incoming = req.headers["x-api-key"] || req.headers["x-executia-key"];

  if (incoming !== API_KEY) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  return { ok: true, mode: "KEY_VERIFIED" };
}
