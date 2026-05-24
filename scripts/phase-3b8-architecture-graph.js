#!/usr/bin/env node
/**
 * Phase 3B8 — Canonical architecture graph (read-only local map).
 * No DB, no external APIs, no runtime changes.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH_DIR = join(ROOT, "architecture-graph");

const SKIP_DIRS = new Set(["node_modules", ".git", ".vercel", "engineering-ledger"]);

const CANONICAL_ANCHORS = {
  audit_verify: "endpoint:audit/verify",
  execution_replay: "endpoint:execution/replay",
  public_verify: "endpoint:verify/execution_id"
};

const KNOWN_NODES = [
  {
    id: "endpoint:audit/verify",
    type: "endpoint",
    file: "api/v1/audit/verify.js",
    label: "GET /api/v1/audit/verify",
    canonical: true
  },
  {
    id: "endpoint:execution/replay",
    type: "endpoint",
    file: "api/v1/execution/replay.js",
    label: "GET /api/v1/execution/replay",
    canonical: false
  },
  {
    id: "endpoint:verify/execution_id",
    type: "endpoint",
    file: "api/v1/verify/[execution_id].js",
    label: "GET /api/v1/verify/:execution_id",
    canonical: false
  },
  {
    id: "service:audit",
    type: "service",
    file: "services/audit.js",
    label: "Supplemental audit service",
    canonical: true
  },
  {
    id: "service:ledger",
    type: "service",
    file: "services/ledger.js",
    label: "Ledger material authority",
    canonical: true
  },
  {
    id: "sql:supplemental_audit",
    type: "sql",
    file: "sql/012_supplemental_audit_chain.sql",
    label: "Supplemental audit chain",
    canonical: true
  },
  {
    id: "sql:ledger_authority",
    type: "sql",
    file: "sql/011_ledger_hash_authority.sql",
    label: "Ledger hash authority",
    canonical: true
  },
  {
    id: "governance:phase-3b5",
    type: "governance",
    file: "scripts/phase-3b5-governance-check.js",
    label: "Phase 3B5 governance check",
    canonical: false
  },
  {
    id: "governance:phase-3b6",
    type: "governance",
    file: "scripts/phase-3b6-engineering-ledger.js",
    label: "Phase 3B6 engineering ledger",
    canonical: false
  },
  {
    id: "governance:phase-3b7",
    type: "governance",
    file: "scripts/phase-3b7-architecture-drift.js",
    label: "Phase 3B7 architecture drift",
    canonical: false
  },
  {
    id: "governance:phase-3b8",
    type: "governance",
    file: "scripts/phase-3b8-architecture-graph.js",
    label: "Phase 3B8 architecture graph",
    canonical: false
  },
  {
    id: "context:architecture-graph",
    type: "context",
    file: ".cursor/context/architecture-graph.md",
    label: "Architecture graph context",
    canonical: false
  },
  {
    id: "store:audit_events",
    type: "storage",
    file: "audit_events",
    label: "audit_events table",
    canonical: false
  },
  {
    id: "store:ledger_entries",
    type: "storage",
    file: "ledger_entries",
    label: "ledger_entries table",
    canonical: false
  },
  {
    id: "store:git_state",
    type: "storage",
    file: "git",
    label: "Git working tree",
    canonical: false
  }
];

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

const SHADOW_ALLOW = [
  /^sql\/rollback\//,
  /^docs\//,
  /^\.cursor\//,
  /^scripts\/phase-3b7/,
  /^scripts\/phase-3b8/,
  /^scripts\/test-runner\.js$/,
  /^api\/v1\/ledger-verify\.js$/,
  /^api\/v1\/core-ledger-verify\.js$/,
  /^sql\/009_atomic_execution_rpc\.sql$/
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

function listApiEndpoints() {
  const apiRoot = join(ROOT, "api/v1");
  const files = listFiles(apiRoot).filter((f) => f.endsWith(".js"));
  return files.map((absolute) => {
    const file = rel(absolute);
    const route = file
      .replace(/^api\/v1\//, "")
      .replace(/\.js$/, "")
      .replace(/\[execution_id\]/g, ":execution_id");
    return {
      id: `endpoint:${route}`,
      type: "endpoint",
      file,
      label: `/api/v1/${route.replace(/\\/g, "/")}`,
      canonical: file === "api/v1/audit/verify.js"
    };
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
      nodes.push({
        id: `cursor:${file}`,
        type: sub === "rules" ? "governance" : "context",
        file,
        label: file,
        canonical: false
      });
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

function isShadowAllowed(file) {
  return SHADOW_ALLOW.some((pattern) => pattern.test(file));
}

function scanShadowFlows(files) {
  const candidates = [];
  for (const absolute of files) {
    const file = rel(absolute);
    if (isShadowAllowed(file)) continue;
    if (file.startsWith("architecture-graph/")) continue;

    let content = "";
    try {
      content = readFileSync(absolute, "utf8");
    } catch {
      continue;
    }

    for (const { id, re } of SHADOW_PATTERNS) {
      if (re.test(content)) {
        candidates.push({ file, pattern: id });
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
      if (connected.has(edge.from) && edge.from.startsWith("endpoint:")) {
        if (!connected.has(edge.to) && edge.to.startsWith("endpoint:")) {
          connected.add(edge.to);
          changed = true;
        }
      }
      if (connected.has(edge.to) && edge.to.startsWith("endpoint:")) {
        if (!connected.has(edge.from) && edge.from.startsWith("endpoint:")) {
          connected.add(edge.from);
          changed = true;
        }
      }
      if (connected.has(edge.from) && !connected.has(edge.to)) {
        connected.add(edge.to);
        changed = true;
      }
      if (connected.has(edge.to) && !connected.has(edge.from)) {
        connected.add(edge.from);
        changed = true;
      }
    }
  }

  return connected;
}

export function buildArchitectureGraph() {
  const generated_at = new Date().toISOString();
  const branch = git("git rev-parse --abbrev-ref HEAD") || "unknown";
  const commit = git("git rev-parse HEAD") || "unknown";

  const endpointNodes = listApiEndpoints();
  const cursorNodes = listCursorNodes();

  const nodeMap = new Map();
  for (const node of [...KNOWN_NODES, ...endpointNodes, ...cursorNodes]) {
    nodeMap.set(node.id, node);
  }

  for (const file of LEGACY_ENDPOINT_FILES) {
    if (!existsSync(join(ROOT, file))) continue;
    const route = file.replace(/^api\/v1\//, "").replace(/\.js$/, "");
    nodeMap.set(`endpoint:${route}`, {
      id: `endpoint:${route}`,
      type: "endpoint",
      file,
      label: `/api/v1/${route} (legacy compat)`,
      canonical: false
    });
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
    if (node.type === "governance") {
      addEdge(edges, node.id, "governance:phase-3b5", "ai_governance");
    }
    if (node.type === "context") {
      addEdge(edges, node.id, "context:architecture-graph", "memory");
    }
  }

  addEdge(edges, "endpoint:ledger-verify", "endpoint:audit/verify", "compat_wraps");
  addEdge(edges, "endpoint:core-ledger-verify", "endpoint:audit/verify", "compat_wraps");

  const projectFiles = listFiles(ROOT);
  const shadow_flow_candidates = scanShadowFlows(projectFiles);

  const connected = collectConnectedEndpointIds(edges);
  const endpointIds = [...nodeMap.values()]
    .filter((n) => n.type === "endpoint")
    .map((n) => n.id);

  const orphan_candidates = endpointIds
    .filter((id) => !connected.has(id))
    .map((id) => {
      const node = nodeMap.get(id);
      return { id, file: node.file, label: node.label };
    });

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
    shadow_flow_candidates
  };

  return {
    generated_at,
    branch,
    commit,
    nodes: [...nodeMap.values()],
    edges,
    findings
  };
}

function snapshotFilename(iso) {
  return `${iso.replace(/[:.]/g, "-")}.json`;
}

function main() {
  console.log("EXECUTIA Phase 3B8 architecture graph");
  console.log("===================================\n");

  const graph = buildArchitectureGraph();

  if (!existsSync(GRAPH_DIR)) {
    mkdirSync(GRAPH_DIR, { recursive: true });
  }

  const stamped = snapshotFilename(graph.generated_at);
  const stampedPath = join(GRAPH_DIR, stamped);
  const latestPath = join(GRAPH_DIR, "latest.json");
  const body = `${JSON.stringify(graph, null, 2)}\n`;

  writeFileSync(stampedPath, body, "utf8");
  writeFileSync(latestPath, body, "utf8");

  console.log(`nodes=${graph.nodes.length} edges=${graph.edges.length}`);
  console.log(`orphans=${graph.findings.orphan_candidates.length}`);
  console.log(`shadow_flows=${graph.findings.shadow_flow_candidates.length}`);
  console.log("");
  console.log("ARCHITECTURE_GRAPH_RECORDED");
  console.log(`architecture-graph/${stamped}`);
  console.log("architecture-graph/latest.json");
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main();
}
