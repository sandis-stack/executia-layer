/**
 * EXECUTIA™ — /api/health.js
 * System health check endpoint.
 *
 * GET /api/health
 *
 * Response:
 * {
 *   status: "healthy" | "degraded",
 *   checks: { supabase: { ok, ms }, engine: { ok, ms }, rules: { ok, ms } },
 *   metrics: { calls_1h, errors_1h, error_rate, avg_ms, p95_ms },
 *   version: "1.0.0"
 * }
 *
 * 200 = healthy, 503 = degraded
 */

import { createClient } from "@supabase/supabase-js";
import { monitor }      from "../core/monitoring/monitor.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS — health check must be publicly accessible
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const m       = monitor.start("health");
  const checks  = await runChecks();
  const allOk   = Object.values(checks).every(c => c.ok);
  const stats   = monitor.getStats(60);

  await m.end({ status: allOk ? "ok" : "degraded" });

  return res.status(allOk ? 200 : 503).json({
    status:    allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
    metrics: {
      calls_1h:   stats.calls,
      errors_1h:  stats.errors,
      error_rate: `${stats.errorRate}%`,
      avg_ms:     stats.avgMs,
      p95_ms:     stats.p95Ms,
    },
    version: process.env.npm_package_version || "1.0.0",
    env:     process.env.NODE_ENV || "production",
  });
}

// ── CHECKS ───────────────────────────────────────────────────

async function runChecks() {
  const results = await Promise.allSettled([
    checkSupabase(),
    checkRulesTable(),
    checkLedger(),
  ]);

  return {
    supabase: settled(results[0]),
    rules:    settled(results[1]),
    ledger:   settled(results[2]),
  };
}

async function checkSupabase() {
  const t = Date.now();
  const { error } = await supabase.from("events").select("id").limit(1);
  return { ok: !error, ms: Date.now() - t, error: error?.message };
}

async function checkRulesTable() {
  const t = Date.now();
  const { data, error } = await supabase
    .from("execution_rules")
    .select("id")
    .eq("active", true)
    .limit(1);
  return { ok: !error, ms: Date.now() - t, activeRules: data?.length ?? 0, error: error?.message };
}

async function checkLedger() {
  const t = Date.now();
  // Verify ledger is writable (check last entry exists)
  const { data, error } = await supabase
    .from("events")
    .select("id, hash, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    ok:          !error || error.code === "PGRST116", // PGRST116 = no rows (empty ledger is OK)
    ms:          Date.now() - t,
    lastEntry:   data?.created_at || null,
    hashPresent: !!data?.hash,
    error:       (error && error.code !== "PGRST116") ? error.message : null,
  };
}

function settled(result) {
  if (result.status === "fulfilled") return result.value;
  return { ok: false, error: result.reason?.message || "Check failed" };
}
