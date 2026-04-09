/**
 * EXECUTIA™ — /core/monitoring/monitor.js
 * Performance metrics, error tracking, and health monitoring.
 *
 * Lightweight — no external dependencies.
 * Writes to Supabase monitoring table for dashboarding.
 *
 * Usage:
 *   import { monitor } from "../core/monitoring/monitor.js";
 *   const m = monitor.start("execute-event");
 *   // ... your code ...
 *   await m.end({ orgId, eventType, status: "ok" });
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── IN-MEMORY METRICS (ring buffer — last 1000 requests) ─────
const MAX_ENTRIES = 1000;
const metrics     = [];
let   totalErrors = 0;
let   totalCalls  = 0;

// ── MONITOR API ───────────────────────────────────────────────

export const monitor = {
  /**
   * Start a timed operation.
   * Returns an object with .end() method.
   */
  start(operation) {
    const t0 = Date.now();
    return {
      async end(meta = {}) {
        const ms     = Date.now() - t0;
        const entry  = { operation, ms, ts: new Date().toISOString(), ...meta };

        // In-memory ring buffer
        if (metrics.length >= MAX_ENTRIES) metrics.shift();
        metrics.push(entry);
        totalCalls++;
        if (meta.error) totalErrors++;

        // Write to DB (non-blocking — fire and forget)
        if (process.env.MONITORING_ENABLED === "true") {
          supabase.from("monitoring_logs").insert({
            operation,
            duration_ms:  ms,
            org_id:       meta.orgId      || null,
            project_id:   meta.projectId  || null,
            event_type:   meta.eventType  || null,
            status:       meta.status     || "ok",
            error_msg:    meta.error      || null,
            metadata:     meta,
            created_at:   entry.ts,
          }).then(() => {}).catch(() => {}); // silent fail
        }

        // Alert on slow operations
        if (ms > 3000) {
          console.warn(`[EXECUTIA][SLOW] ${operation} took ${ms}ms`, meta);
        }

        return entry;
      },
      // Allow manual error capture
      error(err, meta = {}) {
        return this.end({ ...meta, status: "error", error: err.message });
      }
    };
  },

  /**
   * Get aggregated metrics for health check / dashboard.
   */
  getStats(windowMinutes = 60) {
    const cutoff  = Date.now() - windowMinutes * 60 * 1000;
    const recent  = metrics.filter(m => new Date(m.ts).getTime() > cutoff);

    if (!recent.length) return { calls: 0, errors: 0, avgMs: 0, p95Ms: 0 };

    const durations  = recent.map(m => m.ms).sort((a, b) => a - b);
    const errors     = recent.filter(m => m.error || m.status === "error");
    const p95Index   = Math.floor(durations.length * 0.95);

    return {
      windowMinutes,
      calls:       recent.length,
      errors:      errors.length,
      errorRate:   Math.round((errors.length / recent.length) * 100),
      avgMs:       Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p95Ms:       durations[p95Index] || 0,
      p99Ms:       durations[Math.floor(durations.length * 0.99)] || 0,
      slowCalls:   recent.filter(m => m.ms > 2000).length,
      byOperation: groupBy(recent, "operation"),
      total:       { calls: totalCalls, errors: totalErrors },
    };
  },

  /**
   * Record a specific business metric (non-request).
   */
  async record(metric, value, labels = {}) {
    if (process.env.MONITORING_ENABLED !== "true") return;

    await supabase.from("business_metrics").insert({
      metric,
      value,
      labels,
      created_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {});
  },
};

// ── HEALTH CHECK ENDPOINT ────────────────────────────────────

/**
 * Use in /api/health.js
 * Returns system health status.
 */
export async function healthCheck(req, res) {
  const checks = await Promise.allSettled([
    checkSupabase(),
    checkEngine(),
  ]);

  const results = {
    supabase: checks[0].status === "fulfilled" ? checks[0].value : { ok: false, error: checks[0].reason?.message },
    engine:   checks[1].status === "fulfilled" ? checks[1].value : { ok: false, error: checks[1].reason?.message },
  };

  const allOk   = Object.values(results).every(r => r.ok);
  const stats   = monitor.getStats(60);

  return res.status(allOk ? 200 : 503).json({
    status:    allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks:    results,
    metrics:   {
      calls_1h:    stats.calls,
      errors_1h:   stats.errors,
      error_rate:  `${stats.errorRate}%`,
      avg_ms:      stats.avgMs,
      p95_ms:      stats.p95Ms,
    },
    version: process.env.npm_package_version || "1.0.0",
  });
}

// ── INTERNAL CHECKS ──────────────────────────────────────────

async function checkSupabase() {
  const start = Date.now();
  const { error } = await supabase.from("events").select("id").limit(1);
  return {
    ok:      !error,
    ms:      Date.now() - start,
    error:   error?.message,
  };
}

async function checkEngine() {
  // Verify execution_rules table is reachable
  const start = Date.now();
  const { error } = await supabase.from("execution_rules").select("id").limit(1);
  return {
    ok:    !error,
    ms:    Date.now() - start,
    error: error?.message,
  };
}

// ── HELPERS ──────────────────────────────────────────────────

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || "unknown";
    if (!acc[k]) acc[k] = { count: 0, errors: 0, avgMs: 0, totalMs: 0 };
    acc[k].count++;
    acc[k].totalMs += item.ms;
    acc[k].avgMs    = Math.round(acc[k].totalMs / acc[k].count);
    if (item.error || item.status === "error") acc[k].errors++;
    return acc;
  }, {});
}
