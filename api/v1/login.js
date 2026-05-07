import { resolveEnterpriseContext } from "../../services/enterprise-auth.js";
import { createJwt } from "../../services/jwt.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const auth = await resolveEnterpriseContext(req);
    if (!auth.ok) {
      return res.status(auth.status || 401).json({
        ok: false,
        error: auth.error || "UNAUTHORIZED"
      });
    }

    const token = createJwt({
      organization_id: auth.organization_id,
      user: auth.user,
      role: auth.role,
      permissions: auth.permissions,
      mode: auth.mode
    });

    return res.status(200).json({
      ok: true,
      token,
      mode: auth.mode,
      organization_id: auth.organization_id,
      user: auth.user,
      role: auth.role,
      permissions: auth.permissions
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "LOGIN_FAILED"
    });
  }
}
