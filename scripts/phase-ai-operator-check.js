#!/usr/bin/env node
/**
 * EXECUTIA AI Operator Check — secret and unsafe-mutation guard.
 * Exit 0: ok (warnings allowed)
 * Exit 1: hard violation — block deploy
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCTION_SUPABASE_PROJECT = "dnyaancdvdsibbkdjdor";

const SCAN_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".sql",
  ".html",
  ".json",
  ".md",
  ".mdc",
  ".sh",
  ".yml",
  ".yaml"
]);

const HARD_PATTERNS = [
  {
    id: "console_log_env",
    label: "logging process environment object",
    test: (text) => {
      const fn = ["console", "log"].join(".");
      const env = ["process", "env"].join(".");
      return new RegExp(`${fn}\\s*\\(\\s*${env}`).test(text);
    }
  },
  {
    id: "service_role_jwt",
    label: "embedded service_role JWT",
    test: (text) => /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text) && /service_role|SERVICE_ROLE/i.test(text)
  },
  {
    id: "resend_key",
    label: "hardcoded Resend API key (re_...)",
    test: (text) => /['"`]re_[A-Za-z0-9]{16,}['"`]/.test(text)
  },
  {
    id: "postgres_password_url",
    label: "postgres URL with embedded password",
    test: (text) => /postgres(?:ql)?:\/\/[^:]+:[^@\s'"]+@/i.test(text)
  },
  {
    id: "supabase_service_key_literal",
    label: "SUPABASE service key literal assignment",
    test: (text) =>
      /(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*=\s*['"][^'"]{20,}['"]/i.test(text)
  }
];

const LEDGER_AUDIT_MUTATION = [
  { label: "UPDATE audit_events", re: /UPDATE\s+audit_events/i },
  { label: "DELETE audit_events", re: /DELETE\s+FROM\s+audit_events/i },
  { label: "TRUNCATE audit_events", re: /TRUNCATE\s+audit_events/i },
  { label: "UPDATE ledger_entries", re: /UPDATE\s+ledger_entries/i },
  { label: "DELETE ledger_entries", re: /DELETE\s+FROM\s+ledger_entries/i },
  { label: "TRUNCATE ledger_entries", re: /TRUNCATE\s+ledger_entries/i }
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

function shouldScan(file) {
  if (file.startsWith("node_modules/")) return false;
  if (file.startsWith(".git/")) return false;
  const ext = file.includes(".") ? file.slice(file.lastIndexOf(".")) : "";
  if (ext && !SCAN_EXTENSIONS.has(ext)) return false;
  if (/^\.env/i.test(file) || file === ".env" || file.endsWith(".env")) return true;
  return SCAN_EXTENSIONS.has(ext) || file.startsWith("sql/");
}

function readSafe(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (_) {
    return "";
  }
}

function isEnvFile(path) {
  const base = path.split("/").pop() || path;
  return base === ".env" || base.startsWith(".env.") || base.endsWith(".env");
}

function sqlMutationIsCommentOnly(content, matchIndex) {
  const lineStart = content.lastIndexOf("\n", matchIndex) + 1;
  const lineEnd = content.indexOf("\n", matchIndex);
  const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  return /^\s*--/.test(line);
}

const GOVERNANCE_SCRIPT_ALLOW = new Set([
  "scripts/phase-ai-operator-check.js",
  "scripts/phase-3b5-governance-check.js",
  "scripts/phase-3b7-architecture-drift.js"
]);

function scanFile(file, violations, warnings) {
  const full = join(ROOT, file);
  if (!existsSync(full)) return;

  if (GOVERNANCE_SCRIPT_ALLOW.has(file)) return;

  if (isEnvFile(file)) {
    let tracked = false;
    try {
      execSync(`git ls-files --error-unmatch ${JSON.stringify(file)}`, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: "pipe"
      });
      tracked = true;
    } catch (_) {
      tracked = false;
    }
    const staged = gitChangedFiles().includes(file);
    if (tracked || staged) {
      violations.push({ file, rule: "env_file_committed", detail: ".env must not be committed or staged" });
    }
    return;
  }

  const content = readSafe(full);
  if (!content) return;

  const isCode = /\.(js|mjs|cjs|ts|tsx)$/i.test(file);
  if (isCode) {
    for (const pat of HARD_PATTERNS) {
      if (pat.test(content)) {
        violations.push({ file, rule: pat.id, detail: pat.label });
      }
    }
  }

  if (file.endsWith(".sql") || file.startsWith("sql/")) {
    for (const mut of LEDGER_AUDIT_MUTATION) {
      const re = mut.re;
      let m;
      while ((m = re.exec(content)) !== null) {
        if (!sqlMutationIsCommentOnly(content, m.index)) {
          violations.push({
            file,
            rule: "unsafe_sql_mutation",
            detail: `${mut.label} in ${file} requires explicit approval`
          });
          break;
        }
      }
    }
  }

  if (/dnyaancdvdsibbkdjdor/.test(content) && file.includes(".example")) {
    warnings.push({ file, detail: "production project id in example file — verify intent" });
  }
}

function main() {
  console.log("EXECUTIA AI Operator Check");
  console.log("==========================\n");

  const files = gitChangedFiles().filter(shouldScan);
  const violations = [];
  const warnings = [];

  if (!files.length) {
    console.log("No scannable changed files in working tree.\n");
    console.log(`Production Supabase project (reference): ${PRODUCTION_SUPABASE_PROJECT}`);
    console.log("PHASE_AI_OPERATOR_OK");
    return;
  }

  console.log("Scanning changed files:");
  for (const f of files) {
    console.log(`  - ${f}`);
    scanFile(f, violations, warnings);
  }
  console.log("");

  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) {
      console.log(`  ⚠ ${w.file}: ${w.detail}`);
    }
    console.log("");
  }

  if (violations.length) {
    console.log("Hard violations:");
    for (const v of violations) {
      console.log(`  ✗ ${v.file}: [${v.rule}] ${v.detail}`);
    }
    console.log("\nPHASE_AI_OPERATOR_BLOCKED");
    process.exit(1);
  }

  console.log(`Production Supabase project (reference): ${PRODUCTION_SUPABASE_PROJECT}`);
  console.log("PHASE_AI_OPERATOR_OK");
}

main();
