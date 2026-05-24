#!/usr/bin/env node
/**
 * Phase 3B7 — Architecture drift detection (read-only local scan).
 * Warns on shadow logic / legacy resurrection; hard-fails critical violations.
 *
 * Exit 0: warnings only
 * Exit 1: hard violations (audit SQL mutations, public verify auth, .env touched)
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_EXTENSIONS = new Set([
  ".js",
  ".html",
  ".css",
  ".sql",
  ".md",
  ".mdc",
  ".sh"
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".vercel",
  "engineering-ledger"
]);

const AUDIT_MUTATION_PATTERNS = [
  { id: "UPDATE audit_events", re: /UPDATE\s+audit_events/i },
  { id: "DELETE FROM audit_events", re: /DELETE\s+FROM\s+audit_events/i },
  { id: "TRUNCATE audit_events", re: /TRUNCATE\s+audit_events/i }
];

const BLACK_BACKGROUND_PATTERNS = [
  { id: "background:#000", re: /background\s*:\s*#000\b/i },
  { id: "background: #000", re: /background\s*:\s*#000\b/i },
  { id: "background-color:#000", re: /background-color\s*:\s*#000\b/i },
  { id: "background-color: #000", re: /background-color\s*:\s*#000\b/i },
  { id: "background:black", re: /background\s*:\s*black\b/i },
  { id: "background-color:black", re: /background-color\s*:\s*black\b/i }
];

const LEGACY_EVENT_NAMES = ["EXECUTION_CREATED", "OPERATOR_DECISION_COMMITTED"];

const CANONICAL_VERIFY_FILE = "api/v1/audit/verify.js";
const VERIFY_COMPAT_FILES = new Set([
  "api/v1/ledger-verify.js",
  "api/v1/core-ledger-verify.js"
]);

function gitChangedFiles() {
  const parts = [];
  try {
    const unstaged = execSync("git diff --name-only", { cwd: ROOT, encoding: "utf8" }).trim();
    const staged = execSync("git diff --cached --name-only", { cwd: ROOT, encoding: "utf8" }).trim();
    if (unstaged) parts.push(...unstaged.split("\n"));
    if (staged) parts.push(...staged.split("\n"));
  } catch (_) {}
  return [...new Set(parts.filter(Boolean))];
}

function listProjectFiles(dir = ROOT, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      listProjectFiles(absolute, acc);
      continue;
    }
    const ext = entry.name.includes(".")
      ? entry.name.slice(entry.name.lastIndexOf("."))
      : "";
    if (!SCAN_EXTENSIONS.has(ext)) continue;
    if (entry.name.endsWith(".json") && dir.includes("engineering-ledger")) continue;
    acc.push(absolute);
  }
  return acc;
}

function relPath(absolute) {
  return relative(ROOT, absolute).split("\\").join("/");
}

function isAuditMutationAllowed(rel) {
  if (rel.startsWith("sql/rollback/")) return true;
  if (rel.startsWith("docs/")) return true;
  if (rel.startsWith(".cursor/")) return true;
  if (rel === "scripts/phase-3b7-architecture-drift.js") return true;
  if (rel === "scripts/phase-3b5-governance-check.js") return true;
  return false;
}

function isLegacyEventAllowed(rel) {
  if (rel.startsWith("sql/rollback/")) return true;
  if (rel.startsWith("docs/")) return true;
  if (rel.includes("/legacy/")) return true;
  if (rel.startsWith(".cursor/")) return true;
  if (rel === "scripts/test-runner.js") return true;
  if (rel === "scripts/phase-3b7-architecture-drift.js") return true;
  return false;
}

function isFrontendFile(rel) {
  return (
    rel.startsWith("console/") ||
    rel.startsWith("public/") ||
    rel.startsWith("dashboard/") ||
    rel.endsWith(".html")
  );
}

function isPublicVerifyFile(rel) {
  return rel.startsWith("api/v1/verify/");
}

function scanFile(rel, content, warnings, violations) {
  for (const name of LEGACY_EVENT_NAMES) {
    if (!content.includes(name)) continue;
    if (isLegacyEventAllowed(rel)) continue;
    warnings.push(`${rel}: legacy event name "${name}" (use supplemental types; rollback/docs only)`);
  }

  for (const { id, re } of AUDIT_MUTATION_PATTERNS) {
    if (!re.test(content)) continue;
    if (isAuditMutationAllowed(rel)) continue;
    violations.push(`${rel}: audit append-only violation — ${id}`);
  }

  if (
    content.includes("LEDGER_VERIFY_AUTHORITY_MODE") &&
    rel !== CANONICAL_VERIFY_FILE &&
    !VERIFY_COMPAT_FILES.has(rel) &&
    !rel.startsWith("docs/") &&
    !rel.startsWith(".cursor/") &&
    rel !== "scripts/phase-3b7-architecture-drift.js"
  ) {
    warnings.push(
      `${rel}: verification authority constant outside canonical ${CANONICAL_VERIFY_FILE}`
    );
  }

  if (
    /export\s+function\s+resolveLedgerVerifyAuthority/.test(content) &&
    rel !== "api/v1/ledger-verify.js"
  ) {
    warnings.push(`${rel}: resolveLedgerVerifyAuthority defined outside ledger compatibility wrapper`);
  }

  if (
    rel.startsWith("api/v1/") &&
    rel !== CANONICAL_VERIFY_FILE &&
    !VERIFY_COMPAT_FILES.has(rel) &&
    !rel.startsWith("api/v1/verify/") &&
    /verifyLedgerChain|verifyAuditChain|verifyCoreLedgerChain/.test(content) &&
    /verified\s*[:=]/.test(content)
  ) {
    warnings.push(`${rel}: direct chain verification logic outside canonical audit verify path`);
  }

  if (isFrontendFile(rel)) {
    if (content.includes("/api/v1/core-ledger-verify")) {
      warnings.push(`${rel}: frontend calls legacy /api/v1/core-ledger-verify (use /api/v1/audit/verify)`);
    }
    if (content.includes("/api/v1/ledger-verify")) {
      warnings.push(`${rel}: frontend calls /api/v1/ledger-verify (prefer /api/v1/audit/verify)`);
    }
  }

  if (isPublicVerifyFile(rel) && content.includes("requireInternalKey")) {
    violations.push(`${rel}: public verify must not use requireInternalKey`);
  }

  if (isFrontendFile(rel) || rel.endsWith(".css")) {
    for (const { id, re } of BLACK_BACKGROUND_PATTERNS) {
      if (re.test(content)) {
        warnings.push(`${rel}: black background UI drift (${id})`);
      }
    }
  }
}

export function runArchitectureDriftScan({ files = null, envTouched = null } = {}) {
  const warnings = [];
  const violations = [];

  const envFiles =
    envTouched ??
    gitChangedFiles().filter((f) => f.startsWith(".env"));
  if (envFiles.length) {
    violations.push(`Environment files must not be committed: ${envFiles.join(", ")}`);
  }

  const paths = files ?? listProjectFiles().map(relPath);

  for (const rel of paths) {
    const absolute = resolve(ROOT, rel);
    if (!existsSync(absolute)) continue;
    let content = "";
    try {
      content = readFileSync(absolute, "utf8");
    } catch {
      continue;
    }
    scanFile(rel, content, warnings, violations);
  }

  return { warnings, violations };
}

function main() {
  console.log("EXECUTIA Phase 3B7 architecture drift check");
  console.log("==========================================\n");

  const { warnings, violations } = runArchitectureDriftScan();

  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) {
      console.log(`  ⚠ ${w}`);
    }
    console.log("");
  } else {
    console.log("No architecture drift warnings.\n");
  }

  if (violations.length) {
    console.log("Hard violations:");
    for (const v of violations) {
      console.log(`  ✖ ${v}`);
    }
    console.log("\nPHASE_3B7_ARCHITECTURE_DRIFT_FAILED");
    process.exit(1);
  }

  console.log("PHASE_3B7_ARCHITECTURE_DRIFT_OK");
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main();
}
