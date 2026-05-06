/**
 * POST /api/v1/session — Operator login.
 *
 * Browser sends EXECUTIA_API_KEY once.
 * Server validates it, returns a session token.
 * All subsequent browser requests use x-session-token.
 * EXECUTIA_API_KEY never travels in subsequent requests.
 *
 * DELETE /api/v1/session — Logout.
 */
import { createSession, requireInternalKey } from "../../services/auth.js";
import { ok, fail } from "../../shared/response.js";

export default async function handler(req, res) {
  // POST — authenticate and issue session token
  if (req.method === "POST") {
    const auth = requireInternalKey(req);

    if (!auth.ok) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED",
        hint: "Send EXECUTIA_API_KEY as x-api-key header to get a session token." });
    }

    const token = createSession();

    // Set as HttpOnly cookie (most secure)
    res.setHeader("Set-Cookie",
      `executia_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`
    );

    return ok(res, {
      session_token: token,
      expires_in:    "8h",
      hint:          "Use x-session-token header or cookie for subsequent requests."
    });
  }

  // GET — check session status
  if (req.method === "GET") {
    const auth = requireInternalKey(req);
    return ok(res, { authenticated: auth.ok, mode: auth.mode || null });
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
