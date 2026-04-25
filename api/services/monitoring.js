/**
 * EXECUTIA™ — /services/monitoring.js
 * Lightweight request timing and error tracking.
 */

const ring = [];
const MAX  = 1000;

export function startTimer(operation) {
  const t0 = Date.now();
  return {
    end(meta = {}) {
      const ms    = Date.now() - t0;
      const entry = { operation, ms, ts: new Date().toISOString(), ...meta };
      if (ring.length >= MAX) ring.shift();
      ring.push(entry);
      if (ms > 3000) console.warn(`[EXECUTIA][SLOW] ${operation} ${ms}ms`);
      return entry;
    },
  };
}

export function getStats(windowMinutes = 60) {
  const cutoff = Date.now() - windowMinutes * 60 * 1000;
  const recent = ring.filter(e => new Date(e.ts).getTime() > cutoff);
  if (!recent.length) return { calls: 0, errors: 0, avgMs: 0 };
  const durations = recent.map(e => e.ms).sort((a, b) => a - b);
  const errors    = recent.filter(e => e.error).length;
  return {
    windowMinutes,
    calls:     recent.length,
    errors,
    errorRate: Math.round(errors / recent.length * 100),
    avgMs:     Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    p95Ms:     durations[Math.floor(durations.length * 0.95)] || 0,
  };
}
