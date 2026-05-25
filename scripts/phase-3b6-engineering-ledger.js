#!/usr/bin/env node
/**
 * Phase 3B6 — Engineering ledger snapshot (read-only, local git state).
 * Records governed engineering events before deploy. No DB, no external APIs.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import {
  isSignificantLedgerChange,
  writeGovernedArtifacts
} from "../services/artifact-governance.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_DIR = join(ROOT, "engineering-ledger");

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

function git(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function gitChangedFiles() {
  const parts = [];
  const unstaged = git("git diff --name-only");
  const staged = git("git diff --cached --name-only");
  const untracked = git("git ls-files --others --exclude-standard");

  if (unstaged) parts.push(...unstaged.split("\n"));
  if (staged) parts.push(...staged.split("\n"));
  if (untracked) parts.push(...untracked.split("\n"));

  return [...new Set(parts.filter(Boolean))].filter(
    (f) => !f.startsWith("engineering-ledger/")
  );
}

function protectedMatches(file) {
  return PROTECTED_PATTERNS.filter((p) => p.test(file));
}

function isDocsOnly(files) {
  if (!files.length) return false;
  return files.every(
    (f) =>
      f.startsWith("docs/") ||
      f.startsWith(".cursor/") ||
      f.endsWith(".md") ||
      f === "engineering-ledger/.gitkeep"
  );
}

function isUiOnly(files) {
  if (!files.length) return false;
  return files.every(
    (f) =>
      /\.(html|css)$/i.test(f) ||
      f.includes("/console/") ||
      f.startsWith("console/") ||
      f.startsWith("public/console/")
  );
}

function isCanonicalSurface(file) {
  return (
    file.startsWith("sql/") ||
    file === "services/ledger.js" ||
    file === "services/audit.js" ||
    file.startsWith("api/v1/audit/")
  );
}

function isHighSurface(file) {
  return (
    file.startsWith("api/") ||
    /services\/(auth|jwt-auth)\.js$/.test(file) ||
    file.includes("replay") ||
    file.startsWith("api/v1/verify")
  );
}

export function classifyEngineeringChange(files) {
  const hints = [];
  const protected_files_touched = [];

  for (const file of files) {
    const matches = protectedMatches(file);
    if (matches.length) {
      protected_files_touched.push({
        file,
        patterns: matches.map((m) => m.label)
      });
    }
  }

  let risk_level = "LOW";

  if (files.some(isCanonicalSurface)) {
    hints.push("CANONICAL_TRUTH_CHANGE");
    hints.push("AUDIT_OR_LEDGER_IMPACTING");
    risk_level = "CANONICAL";
  } else if (
    files.some(
      (f) =>
        f.startsWith("api/v1/audit/") ||
        f.includes("replay") ||
        f.startsWith("api/v1/verify") ||
        /services\/(auth|jwt-auth)\.js$/.test(f)
    )
  ) {
    hints.push("AUDIT_REPLAY_OR_SECURITY_CHANGE");
    risk_level = "CANONICAL";
  } else if (protected_files_touched.length) {
    hints.push("PROTECTED_FILES_TOUCHED");
    risk_level = "HIGH";
  } else if (files.some(isHighSurface)) {
    hints.push("API_OR_ROUTING_CHANGE");
    risk_level = "HIGH";
  }

  if (isDocsOnly(files)) {
    hints.push("DOCS_ONLY");
    if (risk_level === "LOW") risk_level = "LOW";
  }

  if (isUiOnly(files) && risk_level === "LOW") {
    hints.push("UI_CHANGE");
    risk_level = "MEDIUM";
  }

  if (!hints.length) {
    hints.push(files.length ? "GENERAL_ENGINEERING_CHANGE" : "CLEAN_WORKING_TREE");
  }

  const change_classification_hint = [...new Set(hints)].join("; ");

  return {
    change_classification_hint,
    risk_level,
    protected_files_touched
  };
}

export function buildEngineeringSnapshot(files_changed) {
  const generated_at = new Date().toISOString();
  const branch = git("git rev-parse --abbrev-ref HEAD") || "unknown";
  const commit = git("git rev-parse HEAD") || "unknown";

  const classification = classifyEngineeringChange(files_changed);
  const protected_present = classification.protected_files_touched.length > 0;

  return {
    generated_at,
    branch,
    commit,
    protected_files_touched: classification.protected_files_touched,
    change_classification_hint: classification.change_classification_hint,
    risk_level: classification.risk_level,
    files_changed,
    governance: {
      replayable: true,
      deterministic_checks_required:
        classification.risk_level === "CANONICAL" ||
        classification.risk_level === "HIGH",
      protected_files_present: protected_present
    }
  };
}

export function generateEngineeringLedgerReportMarkdown(snapshot) {
  const lines = [
    "# Engineering ledger",
    "",
    `**Generated:** ${snapshot.generated_at}`,
    `**Branch:** ${snapshot.branch}`,
    `**Commit:** ${snapshot.commit}`,
    `**Risk:** ${snapshot.risk_level}`,
    `**Classification:** ${snapshot.change_classification_hint}`,
    "",
    "## Protected files touched",
    ""
  ];
  const protectedFiles = snapshot.protected_files_touched || [];
  if (protectedFiles.length) {
    for (const p of protectedFiles) {
      lines.push(`- ${p.file || p}`);
    }
  } else {
    lines.push("- None");
  }
  lines.push("");
  lines.push(`## Files changed (${(snapshot.files_changed || []).length})`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeLedgerOutputs(snapshot, root = ROOT) {
  const ledgerDir = join(root, "engineering-ledger");
  const report = generateEngineeringLedgerReportMarkdown(snapshot);
  return writeGovernedArtifacts({
    artifactDir: ledgerDir,
    payload: snapshot,
    reportMarkdown: report,
    significantCheck: isSignificantLedgerChange,
    stablePredicate: (payload, significant) =>
      significant && (payload.risk_level === "LOW" || payload.risk_level === "CANONICAL")
  });
}

function main() {
  const files_changed = gitChangedFiles();
  const snapshot = buildEngineeringSnapshot(files_changed);
  const result = writeLedgerOutputs(snapshot);

  console.log("ENGINEERING_LEDGER_RECORDED");
  if (result.stamped) console.log(result.stamped);
  else console.log("(stamped snapshot skipped — no governance-significant change)");
  if (result.archived?.length) {
    console.log(`archived=${result.archived.length} snapshot(s) → engineering-ledger/archive/`);
  }
  console.log("engineering-ledger/latest.json");
  console.log("engineering-ledger/report.md");
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main();
}
