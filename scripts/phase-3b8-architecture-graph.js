#!/usr/bin/env node
/**
 * Phase 3B8 / 3B8-A — Canonical architecture graph (read-only local map).
 * No DB, no external APIs, no runtime changes.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { engineeringConsoleDetected } from "../services/engineering-intelligence-loader.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH_DIR = join(ROOT, "architecture-graph");

export const NODE_CLASSIFICATIONS = [
  "canonical_authority",
  "public_verification",
  "replay_layer",
  "governance_layer",
  "architecture_memory",
  "ui_console",
  "proof_projection",
  "legacy_projection",
  "local_tooling",
  "unknown"
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".vercel",
  "engineering-ledger",
  "architecture-graph"
]);

const CANONICAL_ANCHORS = {
  audit_verify: "endpoint:audit/verify",
  execution_replay: "endpoint:execution/replay",
  public_verify: "endpoint:verify/execution_id"
};

const PROOF_PROJECTION_FILES = new Set([
  "api/v1/proof/export.js",
  "api/v1/proof/package.js",
  "api/v1/proof/summary.js",
  "api/v1/proof/execution.js",
  "api/v1/proof/verify.js",
  "api/v1/proof/commit.js",
  "api/v1/proof/pdf.js",
  "api/v1/proof/certificate.js",
  "api/v1/proof/certificate-pdf.js",
  "api/v1/proof/merkle-root.js",
  "api/v1/proof/timestamp-anchor.js"
]);

const LEGACY_ENDPOINT_FILES = [
  "api/v1/ledger-verify.js",
  "api/v1/core-ledger-verify.js"
];

const SHADOW_PATTERNS = [
  { id: "ledger-verify-url", re: /\/api\/v1\/ledger-verify/g },
  { id: "core-ledger-verify-url", re: /\/api\/v1\/core-ledger-verify/g },
  { id: "EXECUTION_CREATED", re: /\bEXECUTION_CREATED\b/ },
  { id: "OPERATOR_DECISION_COMMITTED", re: /\bOPERATOR_DECISION_COMMITTED\b/ }
];

const SHADOW_FILE_EXCLUDE = [
  /^scripts\/phase-3b8-architecture-graph\.js$/,
  /^scripts\/phase-3b7-architecture-drift\.js$/,
  /^scripts\/test-runner\.js$/,
  /^docs\/governance\//,
  /^docs\//,
  /^\.cursor\//,
  /^sql\/rollback\//,
  /^sql\/009_atomic_execution_rpc\.sql$/,
  /^architecture-graph\//,
  /^engineering-ledger\//,
  /^ARCHITECTURE_CORE_V1\.md$/,
  /^api\/v1\/ledger-verify\.js$/,
  /^api\/v1\/core-ledger-verify\.js$/
];

const ORPHAN_PATH_EXCLUDE = [
  /^docs\//,
  /^\.cursor\//,
  /^engineering-ledger\//,
  /^architecture-graph\//,
  /^scripts\/phase-3b/,
  /^sql\/rollback\//,
  /^sql\/009_atomic_execution_rpc\.sql$/,
  /^public\/(?!console)/,
  /^components\//,
  /^console\//,
  /^dashboard\//,
  /\.(css|md|mdc|json|html|sh)$/
];

const KNOWN_NODES = [
  {
    id: "endpoint:audit/verify",
    type: "endpoint",
    file: "api/v1/audit/verify.js",
    label: "GET /api/v1/audit/verify",
    canonical: true,
    classification: "canonical_authority"
  },
  {
    id: "endpoint:execution/replay",
    type: "endpoint",
    file: "api/v1/execution/replay.js",
    label: "GET /api/v1/execution/replay",
    canonical: false,
    classification: "replay_layer"
  },
  {
    id: "endpoint:verify/execution_id",
    type: "endpoint",
    file: "api/v1/verify/[execution_id].js",
    label: "GET /api/v1/verify/:execution_id",
    canonical: false,
    classification: "public_verification"
  },
  {
    id: "service:audit",
    type: "service",
    file: "services/audit.js",
    label: "Supplemental audit service",
    canonical: true,
    classification: "canonical_authority"
  },
  {
    id: "service:ledger",
    type: "service",
    file: "services/ledger.js",
    label: "Ledger material authority",
    canonical: true,
    classification: "canonical_authority"
  },
  {
    id: "sql:supplemental_audit",
    type: "sql",
    file: "sql/012_supplemental_audit_chain.sql",
    label: "Supplemental audit chain",
    canonical: true,
    classification: "canonical_authority"
  },
  {
    id: "sql:ledger_authority",
    type: "sql",
    file: "sql/011_ledger_hash_authority.sql",
    label: "Ledger hash authority",
    canonical: true,
    classification: "canonical_authority"
  },
  {
    id: "governance:phase-3b5",
    type: "governance",
    file: "scripts/phase-3b5-governance-check.js",
    label: "Phase 3B5 governance check",
    canonical: false,
    classification: "governance_layer"
  },
  {
    id: "governance:phase-3b6",
    type: "governance",
    file: "scripts/phase-3b6-engineering-ledger.js",
    label: "Phase 3B6 engineering ledger",
    canonical: false,
    classification: "governance_layer"
  },
  {
    id: "governance:phase-3b7",
    type: "governance",
    file: "scripts/phase-3b7-architecture-drift.js",
    label: "Phase 3B7 architecture drift",
    canonical: false,
    classification: "governance_layer"
  },
  {
    id: "governance:phase-3b8",
    type: "governance",
    file: "scripts/phase-3b8-architecture-graph.js",
    label: "Phase 3B8 architecture graph",
    canonical: false,
    classification: "local_tooling"
  },
  {
    id: "context:architecture-graph",
    type: "context",
    file: ".cursor/context/architecture-graph.md",
    label: "Architecture graph context",
    canonical: false,
    classification: "architecture_memory"
  },
  {
    id: "store:audit_events",
    type: "storage",
    file: "audit_events",
    label: "audit_events table",
    canonical: false,
    classification: "canonical_authority"
  },
  {
    id: "store:ledger_entries",
    type: "storage",
    file: "ledger_entries",
    label: "ledger_entries table",
    canonical: false,
    classification: "canonical_authority"
  },
  {
    id: "store:git_state",
    type: "storage",
    file: "git",
    label: "Git working tree",
    canonical: false,
    classification: "governance_layer"
  }
];

function git(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function listFiles(dir, acc = []) {
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
      listFiles(absolute, acc);
      continue;
    }
    acc.push(absolute);
  }
  return acc;
}

function rel(absolute) {
  return relative(ROOT, absolute).split("\\").join("/");
}

function isOrphanPathExcluded(file) {
  if (!file.startsWith("api/v1/")) return true;
  return ORPHAN_PATH_EXCLUDE.some((pattern) => pattern.test(file));
}

function isShadowFileExcluded(file) {
  return SHADOW_FILE_EXCLUDE.some((pattern) => pattern.test(file));
}

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("--");
}

function isLegacyCommentLine(line) {
  if (!isCommentLine(line)) return false;
  return /\blegacy\b/i.test(line) || /\bLEGACY\b/.test(line);
}

function hasProofLegacyMarker(content) {
  return content.includes("Legacy projection check only");
}

export function classifyNode(node) {
  if (node.classification) return node.classification;

  const file = node.file || "";

  if (file === "scripts/phase-3b8-architecture-graph.js") return "local_tooling";
  if (/^scripts\/phase-3b[0-9]/.test(file)) return "governance_layer";
  if (file.startsWith(".cursor/rules/")) return "governance_layer";
  if (file.startsWith(".cursor/context/")) return "architecture_memory";
  if (file.startsWith("docs/")) return "architecture_memory";
  if (file.startsWith("sql/rollback/")) return "legacy_projection";
  if (file === "sql/009_atomic_execution_rpc.sql") return "legacy_projection";
  if (LEGACY_ENDPOINT_FILES.includes(file)) return "legacy_projection";
  if (PROOF_PROJECTION_FILES.has(file)) return "proof_projection";
  if (file.startsWith("console/") || file.startsWith("public/console/") || file === "dashboard/index.html") {
    return "ui_console";
  }

  if (node.type === "endpoint") {
    const route = file.replace(/^api\/v1\//, "").replace(/\.js$/, "");
    if (route === "audit/verify") return "canonical_authority";
    if (route === "execution/replay") return "replay_layer";
    if (route.startsWith("verify/")) return "public_verification";
    if (route.startsWith("proof/")) return "proof_projection";
    return "unknown";
  }

  if (node.type === "service" && (file === "services/audit.js" || file === "services/ledger.js")) {
    return "canonical_authority";
  }
  if (file.startsWith("sql/01")) return "canonical_authority";
  if (node.type === "governance") return "governance_layer";
  if (node.type === "context") return "architecture_memory";

  return "unknown";
}

function withClassification(node) {
  return { ...node, classification: classifyNode(node) };
}

function listApiEndpoints() {
  const apiRoot = join(ROOT, "api/v1");
  const files = listFiles(apiRoot).filter((f) => f.endsWith(".js"));
  return files.map((absolute) => {
    const file = rel(absolute);
    const route = file
      .replace(/^api\/v1\//, "")
      .replace(/\.js$/, "")
      .replace(/\[execution_id\]/g, "execution_id");
    const node = {
      id: `endpoint:${route}`,
      type: "endpoint",
      file,
      label: `/api/v1/${route.replace(/\\/g, "/")}`,
      canonical: file === "api/v1/audit/verify.js"
    };
    return withClassification(node);
  });
}

function listCursorNodes() {
  const nodes = [];
  for (const sub of ["rules", "context"]) {
    const base = join(ROOT, ".cursor", sub);
    if (!existsSync(base)) continue;
    for (const absolute of listFiles(base)) {
      if (!/\.(md|mdc)$/.test(absolute)) continue;
      const file = rel(absolute);
      const node = {
        id: `cursor:${file}`,
        type: sub === "rules" ? "governance" : "context",
        file,
        label: file,
        canonical: false
      };
      nodes.push(withClassification(node));
    }
  }
  return nodes;
}

function addEdge(edges, from, to, relation) {
  if (!from || !to) return;
  const key = `${from}|${to}|${relation}`;
  if (edges.some((e) => `${e.from}|${e.to}|${e.relation}` === key)) return;
  edges.push({ from, to, relation });
}

function scanShadowFlows(files) {
  const candidates = [];
  const seen = new Set();

  for (const absolute of files) {
    const file = rel(absolute);
    if (isShadowFileExcluded(file)) continue;

    let content = "";
    try {
      content = readFileSync(absolute, "utf8");
    } catch {
      continue;
    }

    const proofLegacy = PROOF_PROJECTION_FILES.has(file) && hasProofLegacyMarker(content);

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isLegacyCommentLine(line)) continue;
      if (proofLegacy && isCommentLine(line)) continue;

      for (const { id, re } of SHADOW_PATTERNS) {
        if (!re.test(line)) continue;
        const key = `${file}:${id}:${i + 1}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({ file, pattern: id, line: i + 1 });
      }
    }
  }

  return candidates;
}

function collectConnectedEndpointIds(edges) {
  const seeds = new Set(Object.values(CANONICAL_ANCHORS));
  seeds.add("governance:phase-3b5");
  seeds.add("governance:phase-3b6");
  seeds.add("governance:phase-3b7");
  seeds.add("governance:phase-3b8");

  const connected = new Set(seeds);
  let changed = true;

  while (changed) {
    changed = false;
    for (const edge of edges) {
      for (const [a, b] of [
        [edge.from, edge.to],
        [edge.to, edge.from]
      ]) {
        if (connected.has(a) && !connected.has(b)) {
          connected.add(b);
          changed = true;
        }
      }
    }
  }

  return connected;
}

function nodesByClassification(nodes) {
  const map = Object.fromEntries(NODE_CLASSIFICATIONS.map((c) => [c, []]));
  for (const node of nodes) {
    const key = node.classification || "unknown";
    if (!map[key]) map[key] = [];
    map[key].push(node);
  }
  return map;
}

function buildOrphanCandidates(nodeMap, connected) {
  return [...nodeMap.values()]
    .filter((n) => n.type === "endpoint")
    .filter((n) => !isOrphanPathExcluded(n.file))
    .filter((n) => n.classification === "unknown")
    .filter((n) => !connected.has(n.id))
    .map((n) => ({
      id: n.id,
      file: n.file,
      label: n.label,
      classification: n.classification
    }));
}

export function generateArchitectureReportMarkdown(graph) {
  const byLayer = nodesByClassification(graph.nodes);
  const lines = [];

  lines.push("# EXECUTIA Architecture Graph Report");
  lines.push("");
  lines.push("Phase 3B8-A — human-readable reduction (local tooling only).");
  lines.push("");
  lines.push(`## Generated at`);
  lines.push("");
  lines.push(`- **Timestamp:** ${graph.generated_at}`);
  lines.push(`- **Branch:** ${graph.branch}`);
  lines.push(`- **Commit:** ${graph.commit}`);
  lines.push("");

  const section = (title, layerKey) => {
    lines.push(`## ${title}`);
    lines.push("");
    const items = byLayer[layerKey] || [];
    if (!items.length) {
      lines.push("_None mapped._");
      lines.push("");
      return;
    }
    for (const node of items.slice(0, 40)) {
      lines.push(`- \`${node.file}\` — ${node.label} (\`${node.id}\`)`);
    }
    if (items.length > 40) {
      lines.push(`- _…and ${items.length - 40} more_`);
    }
    lines.push("");
  };

  section("Canonical authority", "canonical_authority");
  section("Replay layer", "replay_layer");
  section("Public verification", "public_verification");
  section("Governance layer", "governance_layer");
  section("Legacy projection layer", "legacy_projection");
  section("Proof projection (legacy-aware)", "proof_projection");
  section("UI console", "ui_console");
  section("Architecture memory", "architecture_memory");
  section("Local tooling", "local_tooling");

  lines.push("## Orphan candidates");
  lines.push("");
  lines.push(
    "Unclassified API endpoints not connected to canonical/governance anchors (excludes proof, UI, docs, tooling paths)."
  );
  lines.push("");
  if (!graph.findings.orphan_candidates.length) {
    lines.push("_No orphan API endpoints after reduction._");
  } else {
    for (const o of graph.findings.orphan_candidates) {
      lines.push(`- \`${o.file}\` — ${o.label}`);
    }
  }
  lines.push("");

  lines.push("## Shadow flow candidates");
  lines.push("");
  if (!graph.findings.shadow_flow_candidates.length) {
    lines.push("_No shadow flow references after suppression._");
  } else {
    for (const s of graph.findings.shadow_flow_candidates) {
      lines.push(`- \`${s.file}:${s.line}\` — pattern \`${s.pattern}\``);
    }
  }
  lines.push("");

  lines.push("## Summary counts");
  lines.push("");
  const sc = graph.findings.summary_counts;
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total nodes | ${sc.total_nodes} |`);
  lines.push(`| Total edges | ${sc.total_edges} |`);
  lines.push(`| API endpoints | ${sc.api_endpoints} |`);
  lines.push(`| Orphan candidates (reduced) | ${sc.orphan_candidates} |`);
  lines.push(`| Shadow flow candidates (reduced) | ${sc.shadow_flow_candidates} |`);
  for (const layer of NODE_CLASSIFICATIONS) {
    lines.push(`| Layer: ${layer} | ${sc.by_layer[layer] ?? 0} |`);
  }
  lines.push("");

  lines.push("## Next recommended cleanup");
  lines.push("");
  const next = graph.findings.next_recommended_cleanup || [];
  for (const item of next) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  lines.push("## Engineering console");
  lines.push("");
  lines.push(`engineering_console_detected = ${engineeringConsoleDetected(ROOT)}`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function buildArchitectureGraph() {
  const generated_at = new Date().toISOString();
  const branch = git("git rev-parse --abbrev-ref HEAD") || "unknown";
  const commit = git("git rev-parse HEAD") || "unknown";

  const endpointNodes = listApiEndpoints();
  const cursorNodes = listCursorNodes();

  const nodeMap = new Map();
  for (const node of [...KNOWN_NODES.map(withClassification), ...endpointNodes, ...cursorNodes]) {
    nodeMap.set(node.id, node);
  }

  for (const file of LEGACY_ENDPOINT_FILES) {
    if (!existsSync(join(ROOT, file))) continue;
    const route = file.replace(/^api\/v1\//, "").replace(/\.js$/, "");
    nodeMap.set(
      `endpoint:${route}`,
      withClassification({
        id: `endpoint:${route}`,
        type: "endpoint",
        file,
        label: `/api/v1/${route} (legacy compat)`,
        canonical: false
      })
    );
  }

  const edges = [];

  addEdge(edges, "endpoint:audit/verify", "service:audit", "uses");
  addEdge(edges, "endpoint:audit/verify", "service:ledger", "uses");
  addEdge(edges, "endpoint:audit/verify", "sql:supplemental_audit", "verifies");
  addEdge(edges, "endpoint:audit/verify", "sql:ledger_authority", "verifies");

  addEdge(edges, "endpoint:execution/replay", "store:audit_events", "reads");
  addEdge(edges, "endpoint:execution/replay", "store:ledger_entries", "reads");
  addEdge(edges, "endpoint:execution/replay", "endpoint:audit/verify", "defers_to");

  addEdge(edges, "endpoint:verify/execution_id", "endpoint:execution/replay", "reuses_loader");
  addEdge(edges, "endpoint:verify/execution_id", "store:audit_events", "reads");
  addEdge(edges, "endpoint:verify/execution_id", "store:ledger_entries", "reads");

  addEdge(edges, "service:audit", "sql:supplemental_audit", "materializes");
  addEdge(edges, "service:ledger", "sql:ledger_authority", "materializes");

  addEdge(edges, "governance:phase-3b5", "service:audit", "protects");
  addEdge(edges, "governance:phase-3b5", "service:ledger", "protects");
  addEdge(edges, "governance:phase-3b5", "endpoint:audit/verify", "protects");

  addEdge(edges, "governance:phase-3b7", "governance:phase-3b8", "feeds");
  addEdge(edges, "governance:phase-3b7", "endpoint:audit/verify", "guards");

  addEdge(edges, "governance:phase-3b6", "store:git_state", "records");
  addEdge(edges, "governance:phase-3b8", "store:git_state", "maps");

  addEdge(edges, "governance:phase-3b8", "context:architecture-graph", "documents");
  addEdge(edges, "context:architecture-graph", "endpoint:audit/verify", "explains");

  for (const node of cursorNodes) {
    if (node.classification === "governance_layer") {
      addEdge(edges, node.id, "governance:phase-3b5", "ai_governance");
    }
    if (node.classification === "architecture_memory") {
      addEdge(edges, node.id, "context:architecture-graph", "memory");
    }
  }

  addEdge(edges, "endpoint:ledger-verify", "endpoint:audit/verify", "compat_wraps");
  addEdge(edges, "endpoint:core-ledger-verify", "endpoint:audit/verify", "compat_wraps");

  const nodes = [...nodeMap.values()];
  const projectFiles = listFiles(ROOT);
  const shadow_flow_candidates = scanShadowFlows(projectFiles);
  const connected = collectConnectedEndpointIds(edges);
  const orphan_candidates = buildOrphanCandidates(nodeMap, connected);
  const layered = nodesByClassification(nodes);

  const next_recommended_cleanup = [];
  if (orphan_candidates.length) {
    next_recommended_cleanup.push(
      `Classify ${orphan_candidates.length} orphan API endpoint(s) before any removal.`
    );
  }
  if (shadow_flow_candidates.length) {
    next_recommended_cleanup.push(
      "Migrate remaining shadow flow references (ledger-verify URLs or legacy event names)."
    );
  }
  if (!shadow_flow_candidates.length && orphan_candidates.length <= 5) {
    next_recommended_cleanup.push("Graph is clean — proceed with governed deploy.");
  }

  const findings = {
    canonical_authority: [CANONICAL_ANCHORS.audit_verify],
    replay_layer: [CANONICAL_ANCHORS.execution_replay],
    public_verification: [CANONICAL_ANCHORS.public_verify],
    governance_layer: [
      "governance:phase-3b5",
      "governance:phase-3b6",
      "governance:phase-3b7",
      "governance:phase-3b8"
    ],
    legacy_projection: LEGACY_ENDPOINT_FILES.filter((f) => existsSync(join(ROOT, f))).map(
      (f) => `endpoint:${f.replace(/^api\/v1\//, "").replace(/\.js$/, "")}`
    ),
    orphan_candidates,
    shadow_flow_candidates,
    summary_counts: {
      total_nodes: nodes.length,
      total_edges: edges.length,
      api_endpoints: nodes.filter((n) => n.type === "endpoint").length,
      orphan_candidates: orphan_candidates.length,
      shadow_flow_candidates: shadow_flow_candidates.length,
      by_layer: Object.fromEntries(
        NODE_CLASSIFICATIONS.map((layer) => [layer, (layered[layer] || []).length])
      )
    },
    next_recommended_cleanup,
    engineering_console_detected: engineeringConsoleDetected(ROOT)
  };

  return {
    generated_at,
    branch,
    commit,
    nodes,
    edges,
    findings
  };
}

function snapshotFilename(iso) {
  return `${iso.replace(/[:.]/g, "-")}.json`;
}

export function writeGraphOutputs(graph, root = ROOT) {
  const graphDir = join(root, "architecture-graph");
  if (!existsSync(graphDir)) {
    mkdirSync(graphDir, { recursive: true });
  }

  const stamped = snapshotFilename(graph.generated_at);
  const body = `${JSON.stringify(graph, null, 2)}\n`;
  const report = generateArchitectureReportMarkdown(graph);

  writeFileSync(join(graphDir, stamped), body, "utf8");
  writeFileSync(join(graphDir, "latest.json"), body, "utf8");
  writeFileSync(join(graphDir, "report.md"), report, "utf8");

  return { stamped: `architecture-graph/${stamped}`, report: "architecture-graph/report.md" };
}

function main() {
  console.log("EXECUTIA Phase 3B8 architecture graph");
  console.log("===================================\n");

  const graph = buildArchitectureGraph();
  const paths = writeGraphOutputs(graph);

  const sc = graph.findings.summary_counts;
  console.log(`nodes=${sc.total_nodes} edges=${sc.total_edges}`);
  console.log(`orphans=${sc.orphan_candidates} shadow_flows=${sc.shadow_flow_candidates}`);
  console.log("");
  console.log("ARCHITECTURE_GRAPH_RECORDED");
  console.log(paths.stamped);
  console.log("architecture-graph/latest.json");
  console.log(paths.report);
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main();
}
