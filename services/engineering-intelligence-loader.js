/**
 * Read-only loader for local governance artifacts (Phase 4A).
 * No DB, no external APIs.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const GRAPH_LATEST = join(ROOT, "architecture-graph", "latest.json");
const INTEL_LATEST = join(ROOT, "execution-intelligence", "latest.json");
const LEDGER_DIR = join(ROOT, "engineering-ledger");

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function engineeringConsoleDetected(root = ROOT) {
  return (
    existsSync(join(root, "console/engineering.html")) &&
    existsSync(join(root, "public/console/engineering.html"))
  );
}

export function loadArchitectureGraphLatest(root = ROOT) {
  return readJson(join(root, "architecture-graph", "latest.json"));
}

export function loadExecutionIntelligenceLatest(root = ROOT) {
  return readJson(join(root, "execution-intelligence", "latest.json"));
}

export function listEngineeringLedgerSnapshots(root = ROOT, limit = 12) {
  const dir = join(root, "engineering-ledger");
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((name) => {
      const path = join(dir, name);
      return { name, path, mtime: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map(({ path }) => readJson(path))
    .filter(Boolean);
}

export function summarizeArchitectureGraph(graph) {
  if (!graph) return null;

  const sc = graph.findings?.summary_counts || {};
  return {
    generated_at: graph.generated_at,
    branch: graph.branch,
    commit: graph.commit,
    nodes: graph.nodes?.length ?? sc.total_nodes ?? 0,
    edges: graph.edges?.length ?? sc.total_edges ?? 0,
    orphans: sc.orphan_candidates ?? graph.findings?.orphan_candidates?.length ?? 0,
    shadow_flows:
      sc.shadow_flow_candidates ?? graph.findings?.shadow_flow_candidates?.length ?? 0,
    canonical_authority: graph.findings?.canonical_authority ?? [],
    replay_layer: graph.findings?.replay_layer ?? [],
    public_verification: graph.findings?.public_verification ?? [],
    governance_layer: graph.findings?.governance_layer ?? [],
    engineering_console_detected: graph.findings?.engineering_console_detected ?? false,
    by_layer: sc.by_layer ?? {}
  };
}

export function summarizeExecutionIntelligence(intel) {
  if (!intel) return null;

  return {
    generated_at: intel.generated_at,
    branch: intel.branch,
    commit: intel.commit,
    stability: intel.stability,
    risk: intel.risk,
    deploy_readiness: intel.deploy_readiness,
    architecture_delta: intel.architecture_delta,
    deploy_intelligence: intel.deploy_intelligence,
    findings: intel.findings ?? [],
    recommendations: intel.recommendations ?? []
  };
}

export function summarizeLedgerEntry(entry, currentStability) {
  if (!entry) return null;
  return {
    generated_at: entry.generated_at,
    branch: entry.branch,
    commit: entry.commit,
    risk: entry.risk_level,
    stability: currentStability,
    findings_count:
      (entry.protected_files_touched?.length ?? 0) +
      (entry.files_changed?.length ? 1 : 0),
    change_classification_hint: entry.change_classification_hint,
    files_changed_count: entry.files_changed?.length ?? 0,
    protected_files_touched: entry.protected_files_touched ?? []
  };
}

export function buildEngineeringIntelligencePayload(root = ROOT) {
  const graph = loadArchitectureGraphLatest(root);
  const intel = loadExecutionIntelligenceLatest(root);
  const ledgerSnapshots = listEngineeringLedgerSnapshots(root, 12);
  const stabilityScore = intel?.stability?.overall_score;

  const architecture_graph = summarizeArchitectureGraph(graph);
  if (architecture_graph) {
    architecture_graph.engineering_console_detected = engineeringConsoleDetected(root);
  }

  const execution_intelligence = summarizeExecutionIntelligence(intel);

  const engineering_ledger = ledgerSnapshots.map((entry) =>
    summarizeLedgerEntry(entry, stabilityScore)
  );

  const missing = [];
  if (!graph) missing.push("architecture-graph/latest.json");
  if (!intel) missing.push("execution-intelligence/latest.json");
  if (!engineering_ledger.length) missing.push("engineering-ledger snapshots");

  return {
    generated_at: new Date().toISOString(),
    engineering_console_detected: engineeringConsoleDetected(root),
    architecture_graph,
    execution_intelligence,
    engineering_ledger,
    sources_present: {
      architecture_graph: Boolean(graph),
      execution_intelligence: Boolean(intel),
      engineering_ledger: engineering_ledger.length > 0
    },
    missing_sources: missing,
    state: missing.length === 3 ? "PENDING_GENERATION" : "OK"
  };
}
