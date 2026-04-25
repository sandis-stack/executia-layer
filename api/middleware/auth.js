/**
 * EXECUTIA™ — /middleware/auth.js
 * Institutional auth: supports DB-backed keys, env registry, and legacy single key fallback.
 */

import { timingSafeEqual, createHash } from "crypto";
import { createSupabaseAdmin } from "../services/supabase-admin.js";

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function parseRegistry() {
  const raw = process.env.EXECUTIA_API_KEYS_JSON || "";
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("AUTH_MISCONFIGURED: EXECUTIA_API_KEYS_JSON is invalid JSON");
  }
}

function matchRegistryKey(received, organizationId) {
  const registry = parseRegistry();
  if (!registry.length) return null;

  for (const item of registry) {
    const plain = item.key || null;
    const hash = item.sha256 || null;
    const keyOk = plain ? safeEqual(received, plain) : hash ? safeEqual(sha256(received), hash) : false;
    if (!keyOk) continue;

    const allowedOrgs = Array.isArray(item.organizations) ? item.organizations : [];
    if (allowedOrgs.length && organizationId && !allowedOrgs.includes(organizationId)) {
      throw new Error(`UNAUTHORIZED_ORG_SCOPE: key not allowed for organization ${organizationId}`);
    }

    return {
      keyId: item.id || item.name || "key",
      plan: item.plan || null,
      organizations: allowedOrgs,
      scopes: Array.isArray(item.scopes) ? item.scopes : [],
      operatorId: item.operator_id || null,
      source: "env_registry",
    };
  }
  return false;
}

async function matchDbKey(received, organizationId) {
  const supabase = createSupabaseAdmin();
  const keyHash = sha256(received);
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, organization_id, label, scopes, status, operator_id, plan, key_hash")
    .eq("status", "active")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) throw new Error(`AUTH_DB_LOOKUP_FAILED: ${error.message}`);
  if (!data) return false;
  if (organizationId && data.organization_id && data.organization_id !== organizationId) {
    throw new Error(`UNAUTHORIZED_ORG_SCOPE: key not allowed for organization ${organizationId}`);
  }
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {}).catch(() => {});
  return {
    keyId: data.id,
    plan: data.plan || null,
    organizations: data.organization_id ? [data.organization_id] : [],
    scopes: Array.isArray(data.scopes) ? data.scopes : [],
    operatorId: data.operator_id || null,
    label: data.label || null,
    source: "db",
  };
}

export async function requireApiKey(req, res, next) {
  const expected = process.env.EXECUTIA_API_KEY;
  const received = req.headers["x-api-key"];
  const organizationId = req.headers["x-organization-id"] || req.body?.organizationId || req.body?.organization_id || null;
  const dbKeysEnabled = process.env.EXECUTIA_DB_KEYS_ENABLED === "true" || process.env.NODE_ENV === "production";

  if (!expected && !process.env.EXECUTIA_API_KEYS_JSON && !dbKeysEnabled) {
    const devMode = process.env.EXECUTIA_DEV_MODE === "true";
    if (devMode && process.env.NODE_ENV !== "production") {
      console.warn("[EXECUTIA][AUTH] Dev mode active (EXECUTIA_DEV_MODE=true) — no key required");
      return next();
    }
    return next(new Error("AUTH_MISCONFIGURED: API key config is missing"));
  }

  if (!received) return next(new Error("UNAUTHORIZED"));

  let authContext = null;

  if (dbKeysEnabled) {
    const dbMatch = await matchDbKey(received, organizationId);
    if (dbMatch && dbMatch !== false) authContext = dbMatch;
  }

  if (!authContext && process.env.EXECUTIA_API_KEYS_JSON) {
    const registryMatch = matchRegistryKey(received, organizationId);
    if (registryMatch && registryMatch !== false) authContext = registryMatch;
    else if (registryMatch === false && !expected && !dbKeysEnabled) return next(new Error("UNAUTHORIZED"));
  }

  if (!authContext) {
    if (!expected || !safeEqual(received, expected)) return next(new Error("UNAUTHORIZED"));
    authContext = { keyId: "default", plan: null, organizations: [], scopes: ["execute", "read", "admin"], operatorId: null, source: "legacy" };
  }

  req.executia = req.executia || {};
  req.executia.auth = authContext;
  next();
}
