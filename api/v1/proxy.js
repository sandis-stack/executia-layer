import { fail } from "../../shared/response.js";
import { requireInternalKey } from "../../services/auth.js";

const PUBLIC_TARGETS = new Set(["live-state", "health"]);
const ALLOWED_TARGETS = new Set([
  "execute", "history", "ledger-verify", "audit-ledger",
  "operator-queue", "operator-approve", "operator-block",
  "core-ledger-verify", "real-time-audit", "commit-execution",
  "live-state", "health"
]);

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function normalizeTarget(value = "") {
  const decoded = decodeURIComponent(String(value || "")).replace(/^\/+/, "");
  const [path, query = ""] = decoded.split("?");
  const clean = path.replace(/^v1\//, "").replace(/\.js$/, "");
  return { clean, query };
}

export default async function handler(req, res) {
  try {
    const { clean, query } = normalizeTarget(req.query?.target);

    if (!ALLOWED_TARGETS.has(clean)) {
      return fail(res, "PROXY_TARGET_NOT_ALLOWED", `Target not allowed: ${clean || "(empty)"}`, 400);
    }

    if (!PUBLIC_TARGETS.has(clean)) {
      const auth = requireInternalKey(req);
      if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error || "UNAUTHORIZED" });
    }

    const key = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY;
    if (!key) return fail(res, "EXECUTIA_API_KEY_MISSING", "Server-side API key is not configured.", 503);

    const url = `${getBaseUrl(req)}/api/v1/${clean}${query ? `?${query}` : ""}`;
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": key
    };

    const init = { method: req.method, headers };
    if (!["GET", "HEAD"].includes(req.method)) {
      init.body = JSON.stringify(req.body || {});
    }

    const upstream = await fetch(url, init);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    return res.send(text);
  } catch (error) {
    return fail(res, "PROXY_FAILED", error.message || "Proxy request failed.", 500);
  }
}
