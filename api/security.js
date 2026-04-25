export function requireApiKey(req, res) {
  const expected = process.env.EXECUTIA_API_KEY;

  if (!expected) {
    return {
      ok: false,
      status: 500,
      error: "EXECUTIA_API_KEY_MISSING"
    };
  }

  const received = req.headers["x-api-key"];

  if (!received || received !== expected) {
    return {
      ok: false,
      status: 401,
      error: "UNAUTHORIZED"
    };
  }

  return { ok: true };
}
