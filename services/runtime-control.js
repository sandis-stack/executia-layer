import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EXECUTIA_OPERATOR_BOOTSTRAP_PASSWORD_HASH",
];

const REQUIRED_TABLES = [
  "users",
  "projects",
  "execution_rules",
  "execution_ledger",
  "execution_tickets",
  "execution_results",
  "operators",
  "api_keys",
  "audit_logs",
  "operator_sessions",
  "webhook_events",
];

const HARD_FAIL_TABLES = [
  "execution_rules",
  "execution_ledger",
  "execution_tickets",
  "execution_results",
];

function parseMajorNodeVersion(versionString = process.versions.node) {
  const major = String(versionString).split(".")[0];
  return Number(major);
}

export function checkNodeRuntime() {
  const major = parseMajorNodeVersion();
  const ok = Number.isInteger(major) && major >= 20;

  return {
    ok,
    current: process.versions.node,
    required: "20.x",
    severity: ok ? "ok" : "warn",
    message: ok
      ? "Node runtime OK"
      : `Node runtime unsupported: ${process.versions.node}. Required: 20.x`,
  };
}

export function checkRequiredEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  return {
    ok: missing.length === 0,
    required: REQUIRED_ENV,
    missing,
    severity: missing.length === 0 ? "ok" : "block",
    message:
      missing.length === 0
        ? "Required environment variables present"
        : `Missing required environment variables: ${missing.join(", ")}`,
  };
}

export function getServiceSupabaseClient() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase runtime configuration");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function checkDatabaseConnectivity() {
  try {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("users")
      .select("id", { head: true, count: "exact" });

    if (error) {
      return {
        ok: false,
        severity: "warn",
        message: `Database connection failed: ${error.message}`,
        details: error,
      };
    }

    return {
      ok: true,
      severity: "ok",
      message: "Database connectivity OK",
    };
  } catch (error) {
    return {
      ok: false,
      severity: "warn",
      message: `Database connection failed: ${error.message}`,
    };
  }
}

export async function checkRequiredTables() {
  try {
    const supabase = getServiceSupabaseClient();

    const { data, error } = await supabase.rpc("exec_sql_table_check", {
      table_names: REQUIRED_TABLES,
    });

    if (error) {
      return {
        ok: false,
        severity: "warn",
        message: `Table verification failed: ${error.message}`,
        missing: REQUIRED_TABLES,
        hard_missing: HARD_FAIL_TABLES,
        details: error,
      };
    }

    const existing = Array.isArray(data) ? data : [];
    const missing = REQUIRED_TABLES.filter((t) => !existing.includes(t));
    const hardMissing = HARD_FAIL_TABLES.filter((t) => !existing.includes(t));

    return {
      ok: missing.length === 0,
      severity: hardMissing.length > 0 ? "block" : missing.length > 0 ? "warn" : "ok",
      existing,
      missing,
      hard_missing: hardMissing,
      message:
        missing.length === 0
          ? "Required tables present"
          : `Missing required tables: ${missing.join(", ")}`,
    };
  } catch (error) {
    return {
      ok: false,
      severity: "warn",
      message: `Table verification failed: ${error.message}`,
      missing: REQUIRED_TABLES,
      hard_missing: HARD_FAIL_TABLES,
    };
  }
}

export async function getRuntimeControlReport() {
  const node = checkNodeRuntime();
  const env = checkRequiredEnv();

  if (!env.ok) {
    return {
      ok: false,
      mode: "blocked",
      status: "CONFIG_UNSAFE",
      warnings: [],
      checks: { node, env },
    };
  }

  const db = await checkDatabaseConnectivity();
  const tables = await checkRequiredTables();

  const warnings = [];
  if (!node.ok) warnings.push(node.message);
  if (!db.ok) warnings.push(db.message);
  if (!tables.ok) warnings.push(tables.message);

  const blocked =
    env.severity === "block" ||
    tables.severity === "block";

  return {
    ok: !blocked,
    mode: blocked ? "blocked" : warnings.length > 0 ? "soft" : "strict",
    status: blocked ? "BLOCKED" : warnings.length > 0 ? "DEGRADED" : "READY",
    warnings,
    checks: { node, env, db, tables },
  };
}

export async function assertRuntimeReady() {
  const report = await getRuntimeControlReport();

  if (!report.ok) {
    const error = new Error(`EXECUTIA runtime blocked: ${report.status}`);
    error.code = report.status;
    error.report = report;
    throw error;
  }

  return report;
}
