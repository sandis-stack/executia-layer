import { withEngine } from "../middleware/with-engine.js";
import { createSupabaseAdmin } from "../services/supabase-admin.js";
import { getStats } from "../services/monitoring.js";
import { listProviders } from "../gateway/provider-registry.js";

export default withEngine(async (req, res) => {
  const supabase = createSupabaseAdmin();
  const started = Date.now();
  const defaultProvider = process.env.DEFAULT_PROVIDER || null;
  const dbKeysEnabled = process.env.EXECUTIA_DB_KEYS_ENABLED === "true";

  const [ledgerRes, rulesRes, projectsRes, reconRes, ticketsRes, resultsRes, auditRes, keysRes, opsRes] = await Promise.allSettled([
    supabase.from("execution_ledger").select("id").limit(1),
    supabase.from("execution_rules").select("id").eq("status", "published").limit(1),
    supabase.from("projects").select("id").limit(1),
    supabase.from("pending_reconciliation").select("ticket_id").limit(1),
    supabase.from("execution_tickets").select("id").limit(1),
    supabase.from("execution_results").select("id").limit(1),
    supabase.from("audit_logs").select("id").limit(1),
    supabase.from("api_keys").select("id").limit(1),
    supabase.from("operators").select("id").limit(1),
  ]);

  const checks = {
    database: { ok: ledgerRes.status === "fulfilled" && !ledgerRes.value.error, error: ledgerRes.value?.error?.message || null },
    rules: { ok: rulesRes.status === "fulfilled" && !rulesRes.value.error, error: rulesRes.value?.error?.message || null },
    projects: { ok: projectsRes.status === "fulfilled" && !projectsRes.value.error, error: projectsRes.value?.error?.message || null },
    reconciliation_view: { ok: reconRes.status === "fulfilled" && !reconRes.value.error, error: reconRes.value?.error?.message || null },
    tickets: { ok: ticketsRes.status === "fulfilled" && !ticketsRes.value.error, error: ticketsRes.value?.error?.message || null },
    execution_results: { ok: resultsRes.status === "fulfilled" && !resultsRes.value.error, error: resultsRes.value?.error?.message || null },
    audit_logs: { ok: auditRes.status === "fulfilled" && !auditRes.value.error, error: auditRes.value?.error?.message || null },
    api_keys: { ok: keysRes.status === "fulfilled" && !keysRes.value.error, error: keysRes.value?.error?.message || null },
    operators: { ok: opsRes.status === "fulfilled" && !opsRes.value.error, error: opsRes.value?.error?.message || null },
    provider_config: {
      ok: !!defaultProvider || process.env.EXECUTIA_REQUIRE_PROVIDER === "false",
      error: !!defaultProvider || process.env.EXECUTIA_REQUIRE_PROVIDER === "false" ? null : "DEFAULT_PROVIDER missing",
    },
    callback_secret: {
      ok: !!process.env.WEBHOOK_CALLBACK_SECRET,
      error: process.env.WEBHOOK_CALLBACK_SECRET ? null : "WEBHOOK_CALLBACK_SECRET missing",
    },
    db_keys_enabled: {
      ok: dbKeysEnabled,
      error: dbKeysEnabled ? null : "EXECUTIA_DB_KEYS_ENABLED=false",
    },
  };

  const unsafe = [];
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SIMULATE === "true") unsafe.push("ALLOW_SIMULATE=true");
  if (process.env.NODE_ENV === "production" && process.env.EXECUTIA_DEV_MODE === "true") unsafe.push("EXECUTIA_DEV_MODE=true");
  if (process.env.NODE_ENV === "production" && !process.env.ALLOWED_ORIGIN) unsafe.push("ALLOWED_ORIGIN missing");
  if (process.env.NODE_ENV === "production" && defaultProvider === "mock_bank") unsafe.push("DEFAULT_PROVIDER=mock_bank");
  if (process.env.NODE_ENV === "production" && !dbKeysEnabled) unsafe.push("EXECUTIA_DB_KEYS_ENABLED=false");
  if (process.env.NODE_ENV === "production" && !process.env.WEBHOOK_CALLBACK_SECRET) unsafe.push("WEBHOOK_CALLBACK_SECRET missing");

  const allOk = Object.values(checks).every(c => c.ok) && unsafe.length === 0;
  return res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
    unsafe_config: unsafe,
    config: {
      default_provider: defaultProvider,
      allowed_providers: listProviders(),
      require_provider: process.env.EXECUTIA_REQUIRE_PROVIDER !== "false",
      db_keys_enabled: dbKeysEnabled,
    },
    metrics: getStats(60),
    version: "3.0.0-institutional",
    latency_ms: Date.now() - started,
  });
}, { methods: ["GET"], requireAuth: false, rateLimit: false });
