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

export const ENGINEERING_CONSOLE_ARTIFACTS = [
  "console/engineering.html",
  "public/console/engineering.html",
  "api/v1/engineering/intelligence.js",
  "services/engineering-intelligence-loader.js"
];

export const ENGINEERING_CONSOLE_GOVERNANCE = {
  read_only: true,
  governed: true,
  deterministic: true,
  visibility_layer: "institutional_governance"
};

export function engineeringConsoleArtifactsPresent(root = ROOT) {
  return ENGINEERING_CONSOLE_ARTIFACTS.every((file) => existsSync(join(root, file)));
}

/** @deprecated Use resolveEngineeringConsoleDetected — kept for file-only checks */
export function engineeringConsoleDetected(root = ROOT) {
  return engineeringConsoleArtifactsPresent(root);
}

/**
 * True when architecture graph classifies the engineering console layer,
 * or when all console artifacts exist locally (fallback).
 */
export function resolveEngineeringConsoleDetected(graph = null, root = ROOT) {
  if (graph?.findings?.engineering_console_detected === true) return true;

  const byLayer = graph?.findings?.summary_counts?.by_layer?.engineering_console ?? 0;
  if (byLayer > 0) return true;

  const classifiedNodes = (graph?.nodes ?? []).filter(
    (n) => n.classification === "engineering_console"
  ).length;
  if (classifiedNodes > 0) return true;

  return engineeringConsoleArtifactsPresent(root);
}

export function buildEngineeringConsoleStatus(root = ROOT, graph = null) {
  const graphData = graph ?? loadArchitectureGraphLatest(root);
  const detected = resolveEngineeringConsoleDetected(graphData, root);
  return {
    DETECTED: detected,
    GOVERNED: true,
    READ_ONLY: true,
    LIVE_REFRESH_ENABLED: true
  };
}

export function buildEngineeringConsoleAuthority(root = ROOT, graph = null) {
  const graphData = graph ?? loadArchitectureGraphLatest(root);
  const detected = resolveEngineeringConsoleDetected(graphData, root);
  return {
    ACTIVE: detected,
    GOVERNED: true,
    DETECTED: detected
  };
}

export function loadArchitectureGraphLatest(root = ROOT) {
  return readJson(join(root, "architecture-graph", "latest.json"));
}

export function loadExecutionIntelligenceLatest(root = ROOT) {
  return readJson(join(root, "execution-intelligence", "latest.json"));
}

export function listEngineeringLedgerSnapshots(root = ROOT, limit = 8) {
  const dir = join(root, "engineering-ledger");
  if (!existsSync(dir)) return [];

  const canonicalSkip = new Set(["latest.json", "last-stable.json"]);
  const stamped = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !canonicalSkip.has(f))
    .map((name) => {
      const path = join(dir, name);
      return { name, path, mtime: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map(({ path }) => readJson(path))
    .filter(Boolean);

  const latest = readJson(join(dir, "latest.json"));
  if (!latest) return stamped;
  const seen = new Set(stamped.map((s) => s.generated_at));
  if (!seen.has(latest.generated_at)) return [latest, ...stamped].slice(0, limit);
  return stamped;
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
    engineering_console_detected: resolveEngineeringConsoleDetected(graph),
    by_layer: sc.by_layer ?? {},
    endpoint_taxonomy: graph.findings?.endpoint_taxonomy ?? null
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
    recommendations: intel.recommendations ?? [],
    endpoint_taxonomy: intel.stability?.deductions
      ? {
          classified_endpoints: intel.stability.deductions.classified_endpoints,
          unknown_endpoints: intel.stability.deductions.unknown_endpoints,
          total_endpoints: intel.stability.deductions.total_endpoints,
          endpoint_consistency_score: intel.stability.endpoint_consistency_score
        }
      : null
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

  const consoleDetected = resolveEngineeringConsoleDetected(graph, root);

  const architecture_graph = summarizeArchitectureGraph(graph);
  if (architecture_graph) {
    architecture_graph.engineering_console_detected = consoleDetected;
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
    engineering_console_detected: consoleDetected,
    engineering_console_authority: buildEngineeringConsoleAuthority(root, graph),
    endpoint_taxonomy: graph?.findings?.endpoint_taxonomy ?? null,
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
