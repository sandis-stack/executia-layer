import { randomUUID } from "crypto";

// In-memory session store (per serverless instance)
// For multi-instance: replace with Redis or Supabase sessions table
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function createSession() {
  const token = randomUUID();
  sessions.set(token, { created_at: Date.now() });
  return token;
}

function isValidSession(token) {
  const s = sessions.get(token);
  if (!s) return false;
  if (Date.now() - s.created_at > SESSION_TTL_MS) { sessions.delete(token); return false; }
  return true;
}

export function requireInternalKey(req) {
  const API_KEY = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY;
  if (!API_KEY) return { ok: false, error: "EXECUTIA_API_KEY_MISSING" };

  // Accept: direct API key (curl / server-to-server)
  const incoming = req.headers["x-api-key"] || req.headers["x-executia-key"];
  if (incoming && incoming === API_KEY) return { ok: true, mode: "KEY_VERIFIED" };

  // Accept: session token (browser operator sessions)
  const sessionToken = req.headers["x-session-token"] || req.cookies?.executia_session;
  if (sessionToken && isValidSession(sessionToken)) return { ok: true, mode: "SESSION_VERIFIED" };

  return { ok: false, error: "UNAUTHORIZED" };
}

export function unauthorizedResponse() {
  return { ok: false, error: { code: "UNAUTHORIZED" } };
}
