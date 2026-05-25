#!/usr/bin/env node
/**
 * Phase 3B9 — Execution intelligence layer (read-only, local).
 * Predicts engineering risk, architecture evolution delta, stability metrics,
 * and governed deploy intelligence. No DB, no external APIs, no runtime changes.
 */
import { execSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

import { classifyEngineeringChange } from "./phase-3b6-engineering-ledger.js";
import {
  engineeringConsoleDetected,
  buildEngineeringConsoleStatus
} from "../services/engineering-intelligence-loader.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INTELLIGENCE_DIR = join(ROOT, "execution-intelligence");
const GRAPH_DIR = join(ROOT, "architecture-graph");
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

const REQUIRED_CANONICAL_EDGES = [
  ["endpoint:audit/verify", "service:audit", "uses"],
  ["endpoint:audit/verify", "service:ledger", "uses"],
  ["endpoint:execution/replay", "endpoint:audit/verify", "defers_to"],
  ["endpoint:verify/execution_id", "endpoint:execution/replay", "reuses_loader"]
];

const CANONICAL_FILE_PREFIXES = [
  "sql/",
  "services/audit.js",
  "services/ledger.js",
  "api/v1/audit/"
];

const REPLAY_FILE_MARKERS = ["api/v1/execution/replay.js", "execution/replay"];
const PUBLIC_VERIFY_MARKERS = ["api/v1/verify"];

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

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
    (f) => !f.startsWith("engineering-ledger/") && !f.startsWith("execution-intelligence/")
  );
}

function isDocsOnly(files) {
  if (!files.length) return false;
  return files.every(
    (f) =>
      f.startsWith("docs/") ||
      f.startsWith(".cursor/") ||
      f.endsWith(".md") ||
      f.startsWith("architecture-graph/") ||
      f.startsWith("execution-intelligence/")
  );
}

function protectedMatches(file) {
  return PROTECTED_PATTERNS.filter((p) => p.test(file));
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function loadArchitectureGraph() {
  return readJson(join(GRAPH_DIR, "latest.json"));
}

function loadArchitectureReport() {
  const path = join(GRAPH_DIR, "report.md");
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function loadLatestEngineeringLedger() {
  if (!existsSync(LEDGER_DIR)) return null;
  const files = readdirSync(LEDGER_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ name: f, path: join(LEDGER_DIR, f), mtime: statSync(join(LEDGER_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) return null;
  return readJson(files[0].path);
}

function listGraphSnapshots() {
  if (!existsSync(GRAPH_DIR)) return [];
  return readdirSync(GRAPH_DIR)
    .filter((f) => f.endsWith(".json") && f !== "latest.json")
    .map((f) => ({ name: f, path: join(GRAPH_DIR, f), mtime: statSync(join(GRAPH_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

function loadPreviousArchitectureGraph(currentGraph) {
  const snapshots = listGraphSnapshots();
  for (const snap of snapshots) {
    const data = readJson(snap.path);
    if (!data || !data.nodes) continue;
    if (currentGraph && data.generated_at === currentGraph.generated_at) continue;
    return data;
  }
  return null;
}

function edgeKey(edge) {
  return `${edge.from}|${edge.to}|${edge.relation}`;
}

function orphanIds(graph) {
  if (!graph?.findings?.orphan_candidates) return [];
  return graph.findings.orphan_candidates.map((o) => o.id || o.file).sort();
}

function shadowKeys(graph) {
  if (!graph?.findings?.shadow_flow_candidates) return [];
  return graph.findings.shadow_flow_candidates
    .map((s) => `${s.file}:${s.line ?? 0}:${s.pattern}`)
    .sort();
}

function nodeIds(graph) {
  if (!graph?.nodes) return [];
  return graph.nodes.map((n) => n.id).sort();
}

function edgeKeys(graph) {
  if (!graph?.edges) return [];
  return graph.edges.map(edgeKey).sort();
}

function diffSorted(before, after) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: after.filter((x) => !beforeSet.has(x)),
    removed: before.filter((x) => !afterSet.has(x))
  };
}

export function computeArchitectureDelta(current, previous) {
  if (!previous) {
    return {
      new_nodes: nodeIds(current),
      removed_nodes: [],
      new_edges: edgeKeys(current),
      removed_edges: [],
      new_orphans: orphanIds(current),
      removed_orphans: [],
      new_shadow_flows: shadowKeys(current),
      removed_shadow_flows: [],
      baseline: "none"
    };
  }

  const nodes = diffSorted(nodeIds(previous), nodeIds(current));
  const edges = diffSorted(edgeKeys(previous), edgeKeys(current));
  const orphans = diffSorted(orphanIds(previous), orphanIds(current));
  const shadows = diffSorted(shadowKeys(previous), shadowKeys(current));

  return {
    new_nodes: nodes.added,
    removed_nodes: nodes.removed,
    new_edges: edges.added,
    removed_edges: edges.removed,
    new_orphans: orphans.added,
    removed_orphans: orphans.removed,
    new_shadow_flows: shadows.added,
    removed_shadow_flows: shadows.removed,
    baseline: previous.generated_at || "previous"
  };
}

function countMissingCanonicalEdges(graph) {
  if (!graph?.edges) return REQUIRED_CANONICAL_EDGES.length;
  const present = new Set(graph.edges.map(edgeKey));
  let missing = 0;
  for (const triple of REQUIRED_CANONICAL_EDGES) {
    if (!present.has(edgeKey({ from: triple[0], to: triple[1], relation: triple[2] }))) {
      missing += 1;
    }
  }
  return missing;
}

function countGovernanceWarnings(files, engineeringLedger, graphReport) {
  let count = 0;
  const classification = classifyEngineeringChange(files);
  if (classification.protected_files_touched.length) count += 1;
  if (classification.risk_level === "CANONICAL" || classification.risk_level === "HIGH") {
    count += 1;
  }
  if (engineeringLedger?.governance?.deterministic_checks_required) count += 1;
  if ((graphReport.match(/⚠/g) || []).length) count += 1;
  if (
    graphReport.includes("Shadow flow candidates") &&
    !graphReport.includes("No shadow flow references") &&
    !graphReport.includes("_No shadow flow")
  ) {
    count += 1;
  }
  return count;
}

function riskLevelRank(level) {
  const order = { LOW: 0, MEDIUM: 1, HIGH: 2, CANONICAL: 3 };
  return order[level] ?? 0;
}

function maxRisk(...levels) {
  let best = "LOW";
  for (const level of levels) {
    if (riskLevelRank(level) > riskLevelRank(best)) best = level;
  }
  return best;
}

function fileTouchesLayer(file, markers) {
  return markers.some((m) => file === m || file.includes(m));
}

function deployLayerImpact(files) {
  const canonical_authority_affected = files.filter((f) =>
    CANONICAL_FILE_PREFIXES.some((p) => (p.endsWith("/") ? f.startsWith(p) : f === p))
  );
  const replay_layer_affected = files.filter((f) => fileTouchesLayer(f, REPLAY_FILE_MARKERS));
  const public_verify_affected = files.filter((f) => fileTouchesLayer(f, PUBLIC_VERIFY_MARKERS));
  const governance_layer_affected = files.filter(
    (f) => f.startsWith("scripts/phase-3b") || f.startsWith(".cursor/rules/")
  );

  const protected_files_touched = [];
  for (const file of files) {
    const matches = protectedMatches(file);
    if (matches.length) {
      protected_files_touched.push({ file, patterns: matches.map((m) => m.label) });
    }
  }

  return {
    protected_files_touched,
    canonical_authority_affected,
    replay_layer_affected,
    public_verify_affected,
    governance_layer_affected
  };
}

function computeRisk(files, deploy, engineeringLedger, graph) {
  const classification = classifyEngineeringChange(files);
  const orphanCount = graph?.findings?.summary_counts?.orphan_candidates ?? orphanIds(graph).length;
  const shadowCount =
    graph?.findings?.summary_counts?.shadow_flow_candidates ??
    shadowKeys(graph).length;

  let canonical_risk = "LOW";
  if (deploy.canonical_authority_affected.length) {
    canonical_risk =
      classification.risk_level === "CANONICAL" ? "CANONICAL" : "HIGH";
  } else if (classification.risk_level === "CANONICAL") {
    canonical_risk = "CANONICAL";
  }

  let replay_risk = deploy.replay_layer_affected.length ? "HIGH" : "LOW";
  let public_verify_risk = deploy.public_verify_affected.length ? "HIGH" : "LOW";

  let governance_risk = "LOW";
  if (deploy.governance_layer_affected.length) governance_risk = "MEDIUM";
  if (deploy.protected_files_touched.length) governance_risk = maxRisk(governance_risk, "HIGH");
  if (engineeringLedger?.risk_level === "HIGH") {
    governance_risk = maxRisk(governance_risk, "HIGH");
  }

  let architecture_risk = "LOW";
  if (orphanCount > 40) architecture_risk = "MEDIUM";
  if (shadowCount > 3) architecture_risk = maxRisk(architecture_risk, "MEDIUM");
  if (shadowCount > 0) architecture_risk = maxRisk(architecture_risk, "MEDIUM");

  let orphan_risk = "LOW";
  if (orphanCount > 20) orphan_risk = "MEDIUM";
  if (orphanCount > 45) orphan_risk = "HIGH";

  let mutation_risk = "LOW";
  if (files.some((f) => f.startsWith("sql/") || f === "services/audit.js")) {
    mutation_risk = "HIGH";
  }

  let overall = maxRisk(
    canonical_risk,
    replay_risk,
    public_verify_risk,
    governance_risk,
    architecture_risk,
    orphan_risk,
    mutation_risk
  );

  if (isDocsOnly(files)) {
    overall = "LOW";
    canonical_risk = deploy.canonical_authority_affected.length ? canonical_risk : "LOW";
    replay_risk = deploy.replay_layer_affected.length ? replay_risk : "LOW";
    public_verify_risk = deploy.public_verify_affected.length ? public_verify_risk : "LOW";
  }

  if (!files.length) overall = "LOW";

  return {
    overall,
    canonical_risk,
    replay_risk,
    governance_risk,
    architecture_risk,
    orphan_risk,
    mutation_risk
  };
}

export function computeStabilityScores(graph, files, deploy, governanceWarningCount) {
  const orphanCount =
    graph?.findings?.summary_counts?.orphan_candidates ?? orphanIds(graph).length;
  const shadowCount =
    graph?.findings?.summary_counts?.shadow_flow_candidates ?? shadowKeys(graph).length;
  const protectedCount = deploy.protected_files_touched.length;
  const missingEdges = countMissingCanonicalEdges(graph);

  const totalEndpoints = graph?.nodes?.filter((n) => n.type === "endpoint").length || 1;
  const unknownOrphans = orphanCount;

  const deductions = {
    orphans: orphanCount,
    shadows: shadowCount,
    protected: protectedCount,
    governance_warnings: governanceWarningCount,
    missing_canonical_edges: missingEdges
  };

  const overall_score = clamp(
    100 -
      deductions.orphans -
      deductions.shadows -
      deductions.protected -
      deductions.governance_warnings -
      deductions.missing_canonical_edges
  );

  const architecture_score = clamp(
    100 - orphanCount - shadowCount * 5 - (deductions.missing_canonical_edges ? 15 : 0)
  );

  const governance_score = clamp(
    100 - protectedCount * 8 - governanceWarningCount * 6
  );

  const replayPresent = graph?.findings?.replay_layer?.length > 0;
  const replay_score = clamp(
    replayPresent ? 100 - (deploy.replay_layer_affected.length ? 25 : 0) : 40
  );

  const verifyPresent = graph?.findings?.canonical_authority?.length > 0;
  const verification_score = clamp(
    verifyPresent
      ? 100 - missingEdges * 12 - (deploy.canonical_authority_affected.length ? 20 : 0)
      : 30
  );

  const endpoint_consistency_score = clamp(
    100 - Math.round((unknownOrphans / totalEndpoints) * 100)
  );

  return {
    overall_score,
    architecture_score,
    governance_score,
    replay_score,
    verification_score,
    endpoint_consistency_score,
    deductions
  };
}

function buildFindings(graph, delta, risk, stability, deploy, files) {
  const findings = [];

  if (!graph) {
    findings.push({ level: "HIGH", code: "GRAPH_MISSING", message: "architecture-graph/latest.json not found" });
    return findings;
  }

  const orphanCount =
    graph.findings?.summary_counts?.orphan_candidates ?? orphanIds(graph).length;
  const shadowCount =
    graph.findings?.summary_counts?.shadow_flow_candidates ?? shadowKeys(graph).length;

  if (orphanCount > 0) {
    findings.push({
      level: "MEDIUM",
      code: "ORPHAN_ENDPOINTS",
      message: `${orphanCount} unclassified API endpoint(s) disconnected from canonical anchors`
    });
  }

  if (shadowCount > 0) {
    findings.push({
      level: "MEDIUM",
      code: "SHADOW_FLOWS",
      message: `${shadowCount} shadow flow reference(s) in codebase`
    });
  }

  if (deploy.protected_files_touched.length) {
    findings.push({
      level: risk.canonical_risk === "CANONICAL" ? "CANONICAL" : "HIGH",
      code: "PROTECTED_TOUCH",
      message: `${deploy.protected_files_touched.length} protected file(s) modified in working tree`
    });
  }

  if (delta.new_orphans.length) {
    findings.push({
      level: "MEDIUM",
      code: "ORPHAN_INCREASE",
      message: `${delta.new_orphans.length} new orphan(s) since previous graph snapshot`
    });
  }

  if (delta.new_shadow_flows.length) {
    findings.push({
      level: "HIGH",
      code: "SHADOW_INCREASE",
      message: `${delta.new_shadow_flows.length} new shadow flow(s) since previous graph snapshot`
    });
  }

  if (stability.deductions.missing_canonical_edges > 0) {
    findings.push({
      level: "CANONICAL",
      code: "MISSING_CANONICAL_EDGES",
      message: `${stability.deductions.missing_canonical_edges} required canonical edge(s) absent from graph`
    });
  }

  if (!files.length) {
    findings.push({
      level: "LOW",
      code: "CLEAN_TREE",
      message: "No uncommitted engineering changes detected"
    });
  }

  return findings;
}

function buildRecommendations(risk, stability, deploy, delta) {
  const recommendations = [];

  if (risk.overall === "CANONICAL" || risk.canonical_risk === "CANONICAL") {
    recommendations.push(
      "Run full institutional verification: npm test, ledger/audit vector tests, production audit/verify curl."
    );
  }

  if (deploy.replay_layer_affected.length) {
    recommendations.push(
      "Replay layer touched — verify GET /api/v1/execution/replay and console REPLAY VERIFY before deploy."
    );
  }

  if (deploy.public_verify_affected.length) {
    recommendations.push(
      "Public verify touched — confirm no auth, secrets, or sensitive payload fields on public route."
    );
  }

  if (stability.deductions.orphans > 30) {
    recommendations.push(
      "Classify orphan API endpoints in architecture graph before large refactors or route removal."
    );
  }

  if (delta.new_shadow_flows.length) {
    recommendations.push("Review new shadow flow references; migrate to /api/v1/audit/verify where applicable.");
  }

  if (deploy.protected_files_touched.length && risk.overall !== "LOW") {
    recommendations.push("Obtain explicit approval for protected file modifications before deploy.");
  }

  if (risk.overall === "LOW" && stability.overall_score >= 70) {
    recommendations.push("Deploy readiness: LOW risk and acceptable stability — proceed with governed pre-deploy chain.");
  } else if (stability.overall_score < 50) {
    recommendations.push("Defer deploy until stability improves (reduce orphans, shadows, or protected touches).");
  }

  if (!recommendations.length) {
    recommendations.push("Maintain engineering ledger and architecture graph snapshots each pre-deploy run.");
  }

  return recommendations;
}

export function buildExecutionIntelligence(root = ROOT) {
  const generated_at = new Date().toISOString();
  const branch = git("git rev-parse --abbrev-ref HEAD") || "unknown";
  const commit = git("git rev-parse HEAD") || "unknown";

  const graph = loadArchitectureGraph();
  const graphReport = loadArchitectureReport();
  const engineeringLedger = loadLatestEngineeringLedger();
  const files = gitChangedFiles();
  const previousGraph = graph ? loadPreviousArchitectureGraph(graph) : null;
  const architecture_delta = computeArchitectureDelta(graph || { nodes: [], edges: [], findings: {} }, previousGraph);
  const deploy_intelligence = deployLayerImpact(files);
  const governanceWarningCount = countGovernanceWarnings(files, engineeringLedger, graphReport);
  const stability = computeStabilityScores(graph, files, deploy_intelligence, governanceWarningCount);
  const risk = computeRisk(files, deploy_intelligence, engineeringLedger, graph);
  const findings = buildFindings(graph, architecture_delta, risk, stability, deploy_intelligence, files);
  const recommendations = buildRecommendations(risk, stability, deploy_intelligence, architecture_delta);

  return {
    generated_at,
    branch,
    commit,
    inputs: {
      architecture_graph: existsSync(join(root, "architecture-graph/latest.json")),
      engineering_ledger_latest: Boolean(engineeringLedger),
      git_files_changed: files.length,
      architecture_graph_report: Boolean(graphReport),
      protected_files_config: ".cursor/context/protected-files.md"
    },
    stability,
    risk,
    architecture_delta,
    deploy_intelligence,
    findings,
    recommendations,
    deploy_readiness: deriveDeployReadiness(risk, stability, findings),
    engineering_console_status: buildEngineeringConsoleStatus(root, graph?.findings)
  };
}

function deriveDeployReadiness(risk, stability, findings) {
  const hard = findings.some((f) => f.level === "CANONICAL" && f.code === "GRAPH_MISSING");
  if (hard) return "BLOCKED";
  if (risk.overall === "CANONICAL") return "REVIEW_REQUIRED";
  if (risk.overall === "HIGH" || stability.overall_score < 45) return "REVIEW_REQUIRED";
  if (risk.overall === "MEDIUM" || stability.overall_score < 65) return "CAUTION";
  return "READY";
}

export function generateExecutionIntelligenceReportMarkdown(intel) {
  const lines = [];
  lines.push("# EXECUTIA Execution Intelligence Report");
  lines.push("");
  lines.push("Phase 3B9 — governed deploy intelligence (local tooling only).");
  lines.push("");
  lines.push(`**Generated:** ${intel.generated_at}`);
  lines.push(`**Branch:** ${intel.branch}`);
  lines.push(`**Commit:** ${intel.commit}`);
  lines.push("");

  lines.push("## Stability score");
  lines.push("");
  const s = intel.stability;
  lines.push(`| Metric | Score |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Overall | ${s.overall_score} |`);
  lines.push(`| Architecture | ${s.architecture_score} |`);
  lines.push(`| Governance | ${s.governance_score} |`);
  lines.push(`| Replay | ${s.replay_score} |`);
  lines.push(`| Verification | ${s.verification_score} |`);
  lines.push(`| Endpoint consistency | ${s.endpoint_consistency_score} |`);
  lines.push("");
  lines.push("Deductions from 100 (overall):");
  lines.push(`- Orphans: −${s.deductions.orphans}`);
  lines.push(`- Shadow flows: −${s.deductions.shadows}`);
  lines.push(`- Protected file touches: −${s.deductions.protected}`);
  lines.push(`- Governance warnings: −${s.deductions.governance_warnings}`);
  lines.push(`- Missing canonical edges: −${s.deductions.missing_canonical_edges}`);
  lines.push("");

  lines.push("## Risk summary");
  lines.push("");
  const r = intel.risk;
  lines.push(`| Dimension | Level |`);
  lines.push(`|-----------|-------|`);
  lines.push(`| Overall | **${r.overall}** |`);
  lines.push(`| Canonical | ${r.canonical_risk} |`);
  lines.push(`| Replay | ${r.replay_risk} |`);
  lines.push(`| Public verify | ${r.public_verify_risk} |`);
  lines.push(`| Governance | ${r.governance_risk} |`);
  lines.push(`| Architecture | ${r.architecture_risk} |`);
  lines.push(`| Orphan | ${r.orphan_risk} |`);
  lines.push(`| Mutation | ${r.mutation_risk} |`);
  lines.push("");

  lines.push("## Architecture delta");
  lines.push("");
  const d = intel.architecture_delta;
  lines.push(`Baseline: \`${d.baseline}\``);
  lines.push("");
  lines.push(`- New nodes: ${d.new_nodes.length}`);
  lines.push(`- Removed nodes: ${d.removed_nodes.length}`);
  lines.push(`- New edges: ${d.new_edges.length}`);
  lines.push(`- Removed edges: ${d.removed_edges.length}`);
  lines.push(`- New orphans: ${d.new_orphans.length}`);
  lines.push(`- Removed orphans: ${d.removed_orphans.length}`);
  lines.push(`- New shadow flows: ${d.new_shadow_flows.length}`);
  lines.push(`- Removed shadow flows: ${d.removed_shadow_flows.length}`);
  lines.push("");

  lines.push("## Canonical authority impact");
  lines.push("");
  const ca = intel.deploy_intelligence.canonical_authority_affected;
  if (!ca.length) lines.push("_No canonical authority files in current git diff._");
  else for (const f of ca) lines.push(`- \`${f}\``);
  lines.push("");

  lines.push("## Replay impact");
  lines.push("");
  const rp = intel.deploy_intelligence.replay_layer_affected;
  if (!rp.length) lines.push("_No replay layer files in current git diff._");
  else for (const f of rp) lines.push(`- \`${f}\``);
  lines.push("");

  lines.push("## Governance impact");
  lines.push("");
  const gov = intel.deploy_intelligence.governance_layer_affected;
  const prot = intel.deploy_intelligence.protected_files_touched;
  if (gov.length) {
    lines.push("Governance tooling / rules:");
    for (const f of gov) lines.push(`- \`${f}\``);
  }
  if (prot.length) {
    lines.push("");
    lines.push("Protected files:");
    for (const p of prot) lines.push(`- \`${p.file}\` (${p.patterns.join(", ")})`);
  }
  if (!gov.length && !prot.length) lines.push("_No governance or protected paths in current git diff._");
  lines.push("");

  lines.push("## Recommendations");
  lines.push("");
  for (const rec of intel.recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push("");

  lines.push("## Engineering Console Status");
  lines.push("");
  const ecs = intel.engineering_console_status || buildEngineeringConsoleStatus();
  lines.push(`- DETECTED: ${ecs.DETECTED}`);
  lines.push(`- GOVERNED: ${ecs.GOVERNED}`);
  lines.push(`- READ_ONLY: ${ecs.READ_ONLY}`);
  lines.push(`- LIVE_REFRESH_ENABLED: ${ecs.LIVE_REFRESH_ENABLED}`);
  lines.push("");

  lines.push("## Deploy readiness");
  lines.push("");
  lines.push(`**Status:** ${intel.deploy_readiness}`);
  lines.push("");
  if (intel.findings.length) {
    lines.push("### Findings");
    for (const f of intel.findings) {
      lines.push(`- [${f.level}] ${f.code}: ${f.message}`);
    }
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function snapshotFilename(iso) {
  return `${iso.replace(/[:.]/g, "-")}.json`;
}

export function writeIntelligenceOutputs(intel, root = ROOT) {
  const dir = join(root, "execution-intelligence");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const stamped = snapshotFilename(intel.generated_at);
  const body = `${JSON.stringify(intel, null, 2)}\n`;
  const report = generateExecutionIntelligenceReportMarkdown(intel);

  writeFileSync(join(dir, stamped), body, "utf8");
  writeFileSync(join(dir, "latest.json"), body, "utf8");
  writeFileSync(join(dir, "report.md"), report, "utf8");

  return {
    stamped: `execution-intelligence/${stamped}`,
    report: "execution-intelligence/report.md"
  };
}

function main() {
  console.log("EXECUTIA Phase 3B9 execution intelligence");
  console.log("========================================\n");

  const intel = buildExecutionIntelligence();
  const paths = writeIntelligenceOutputs(intel);

  console.log(`stability=${intel.stability.overall_score} risk=${intel.risk.overall}`);
  console.log(`deploy_readiness=${intel.deploy_readiness}`);
  console.log(`findings=${intel.findings.length} recommendations=${intel.recommendations.length}`);
  console.log("");
  console.log("EXECUTION_INTELLIGENCE_RECORDED");
  console.log(paths.stamped);
  console.log("execution-intelligence/latest.json");
  console.log(paths.report);
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main();
}
