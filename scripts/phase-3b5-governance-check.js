#!/usr/bin/env node
/**
 * Phase 3B5 — Self-governed development layer
 * Scans git working tree for protected-file and canonical-safety violations.
 *
 * Exit 0: ok (warnings allowed)
 * Exit 1: hard violation — block deploy
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const PROTECTED_PATTERNS = [
  { label: "sql/**", test: (f) => f.startsWith("sql/") },
  { label: "api/v1/audit/**", test: (f) => f.startsWith("api/v1/audit/") },
  { label: "api/v1/execution/replay.js", test: (f) => f === "api/v1/execution/replay.js" },
  { label: "api/v1/verify*", test: (f) => f.startsWith("api/v1/verify") },
  { label: "services/audit.js", test: (f) => f === "services/audit.js" },
  { label: "services/ledger.js", test: (f) => f === "services/ledger.js" },
  { label: "services/core-ledger.js", test: (f) => f === "services/core-ledger.js" },
  { label: "services/db.js", test: (f) => f === "services/db.js" },
  { label: "services/auth.js", test: (f) => f === "services/auth.js" },
  { label: "services/jwt-auth.js", test: (f) => f === "services/jwt-auth.js" },
  { label: "scripts/test-runner.js", test: (f) => f === "scripts/test-runner.js" },
  { label: "vercel.json", test: (f) => f === "vercel.json" },
  { label: ".env*", test: (f) => f.startsWith(".env") }
];

const AUDIT_MUTATION_PATTERNS = [
  /UPDATE\s+audit_events/i,
  /DELETE\s+FROM\s+audit_events/i,
  /TRUNCATE\s+audit_events/i
];

const PUBLIC_VERIFY_WARN_PATTERNS = [
  { id: "requireInternalKey", test: /requireInternalKey/ },
  { id: "service_role", test: /service_role/i },
  { id: "process.env", test: /process\.env/ },
  { id: "payload", test: /\bpayload\b/ },
  { id: "actor", test: /\bactor\b/ }
];

function gitChangedFiles() {
  const parts = [];

  try {
    const unstaged = execSync("git diff --name-only", { cwd: ROOT, encoding: "utf8" }).trim();
    const staged = execSync("git diff --cached --name-only", { cwd: ROOT, encoding: "utf8" }).trim();
    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: ROOT,
      encoding: "utf8"
    }).trim();

    if (unstaged) parts.push(...unstaged.split("\n"));
    if (staged) parts.push(...staged.split("\n"));
    if (untracked) parts.push(...untracked.split("\n"));
  } catch (_) {
    return [];
  }

  return [...new Set(parts.filter(Boolean))];
}

function isProtected(file) {
  return PROTECTED_PATTERNS.filter((p) => p.test(file));
}

function classifyHint(files) {
  const hints = new Set();

  for (const file of files) {
    if (/\.(html|css)$/i.test(file) || file.includes("console/")) {
      hints.add("UI_CHANGE → risk LOW/MEDIUM");
    }
    if (file.startsWith("api/")) {
      hints.add("ROUTING_CHANGE → risk HIGH");
    }
    if (/services\/(auth|jwt-auth)\.js$/.test(file)) {
      hints.add("SECURITY_CHANGE → risk HIGH");
    }
    if (file.startsWith("api/v1/audit/") || file === "services/audit.js") {
      hints.add("AUDIT_IMPACTING_CHANGE → risk CANONICAL");
    }
    if (file === "services/ledger.js" || file.startsWith("sql/")) {
      hints.add("LEDGER_IMPACTING_CHANGE → risk CANONICAL");
    }
    if (file.includes("replay") || file.startsWith("api/v1/verify")) {
      hints.add("REPLAY_IMPACTING_CHANGE → risk HIGH/CANONICAL");
    }
    if (file.startsWith("docs/") || file.startsWith(".cursor/")) {
      hints.add("DOCS_ONLY → risk LOW");
    }
  }

  if (
    files.some(
      (f) =>
        f.startsWith("sql/") ||
        f === "services/ledger.js" ||
        f === "services/audit.js" ||
        f.startsWith("api/v1/audit/")
    )
  ) {
    hints.add("CANONICAL_TRUTH_CHANGE → risk CANONICAL (verify authority / hashes)");
  }

  return [...hints];
}

function gitDiffForFile(file) {
  let diff = "";
  try {
    diff += execSync(`git diff -U0 -- "${file}"`, { cwd: ROOT, encoding: "utf8" });
    diff += execSync(`git diff --cached -U0 -- "${file}"`, { cwd: ROOT, encoding: "utf8" });
  } catch (_) {}

  const isUntracked = (() => {
    try {
      const status = execSync(`git status --porcelain -- "${file}"`, {
        cwd: ROOT,
        encoding: "utf8"
      });
      return status.startsWith("??");
    } catch {
      return false;
    }
  })();

  if (isUntracked) {
    return scanFileContent(file);
  }

  const added = diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");

  return added;
}

function scanFileContent(relativePath) {
  const absolute = join(ROOT, relativePath);
  if (!existsSync(absolute)) return "";
  try {
    return readFileSync(absolute, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const violations = [];
  const warnings = [];
  const files = gitChangedFiles();

  console.log("EXECUTIA Phase 3B5 governance check");
  console.log("==================================\n");

  if (files.length === 0) {
    console.log("No changed files detected.");
    console.log("\nPHASE_3B5_GOVERNANCE_OK");
    return;
  }

  console.log("Changed files:");
  for (const file of files) {
    console.log(`  - ${file}`);
  }
  console.log("");

  const hints = classifyHint(files);
  if (hints.length) {
    console.log("Classification hints:");
    for (const hint of hints) {
      console.log(`  • ${hint}`);
    }
    console.log("");
  }

  const protectedHits = [];
  for (const file of files) {
    const matches = isProtected(file);
    if (matches.length) {
      protectedHits.push({ file, patterns: matches.map((m) => m.label) });
    }
  }

  if (protectedHits.length) {
    warnings.push("Protected files modified — explicit approval required.");
    console.log("Protected file touches (approval required):");
    for (const hit of protectedHits) {
      console.log(`  ! ${hit.file}  [${hit.patterns.join(", ")}]`);
    }
    console.log("");
  }

  const envTouched = files.filter((f) => f.startsWith(".env"));
  if (envTouched.length) {
    violations.push(`Environment files must not be committed: ${envTouched.join(", ")}`);
  }

  const sqlTouched = files.filter((f) => f.startsWith("sql/"));
  if (sqlTouched.length && process.env.PHASE_3B5_ALLOW_SQL !== "1") {
    violations.push(
      `SQL changes require explicit approval. Set PHASE_3B5_ALLOW_SQL=1 to acknowledge: ${sqlTouched.join(", ")}`
    );
  }

  for (const file of files) {
    const isAuditSurface =
      file === "services/audit.js" || file.startsWith("sql/");
    if (!isAuditSurface) continue;

    const content = gitDiffForFile(file);
    for (const pattern of AUDIT_MUTATION_PATTERNS) {
      if (pattern.test(content)) {
        violations.push(`Audit append-only violation in ${file}: ${pattern}`);
      }
    }
  }

  const publicVerifyFiles = files.filter((f) => f.startsWith("api/v1/verify"));
  for (const file of publicVerifyFiles) {
    const content = scanFileContent(file);
    for (const { id, test } of PUBLIC_VERIFY_WARN_PATTERNS) {
      if (test.test(content)) {
        warnings.push(`Public verify ${file}: contains '${id}' — confirm public-safe exposure.`);
      }
    }
  }

  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) {
      console.log(`  ⚠ ${w}`);
    }
    console.log("");
  }

  if (violations.length) {
    console.log("Hard violations:");
    for (const v of violations) {
      console.log(`  ✖ ${v}`);
    }
    console.log("\nPHASE_3B5_GOVERNANCE_FAILED");
    process.exit(1);
  }

  console.log("PHASE_3B5_GOVERNANCE_OK");
}

main();
