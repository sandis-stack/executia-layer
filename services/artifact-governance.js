/**
 * EXECUTIA Artifact Retention & Stability Layer (Phase 5C).
 * Canonical retention for architecture-graph, execution-intelligence, engineering-ledger.
 * Archival only — no destructive cleanup of governed history.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  statSync,
  mkdirSync
} from "node:fs";
import { basename, join } from "node:path";

/** Canonical files always retained at artifact root — never archived. */
export const CANONICAL_ARTIFACT_FILES = Object.freeze([
  "latest.json",
  "report.md",
  "last-stable.json"
]);

/**
 * Retention thresholds:
 * - Tier 1: canonical trio (permanent at artifact root)
 * - Tier 2: newest maxStampedSnapshots stamped JSON at root (active)
 * - Tier 3: older stamped JSON under <artifactDir>/archive/
 */
export const RETENTION = Object.freeze({
  maxStampedSnapshots: 8,
  archiveSubdir: "archive",
  /** Legacy stabilization path — migrated into per-directory archive/ on write. */
  legacyArchiveRoot: "archive/governed-artifacts"
});

const STAMPED_EXCLUDE = new Set(CANONICAL_ARTIFACT_FILES);

export function snapshotFilename(iso) {
  return `${iso.replace(/[:.]/g, "-")}.json`;
}

export function readJsonSafe(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** Per-artifact archive directory, e.g. architecture-graph/archive/. */
export function archiveDirFor(artifactDir) {
  return join(artifactDir, RETENTION.archiveSubdir);
}

/**
 * Move snapshots from legacy repo-root archive into artifact-local archive/.
 */
export function migrateLegacyArchive(artifactDir, root = process.cwd()) {
  const dirName = basename(artifactDir);
  const legacyDir = join(root, RETENTION.legacyArchiveRoot, dirName);
  const targetDir = archiveDirFor(artifactDir);
  if (!existsSync(legacyDir)) return [];

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const moved = [];
  for (const name of readdirSync(legacyDir)) {
    if (!name.endsWith(".json")) continue;
    const src = join(legacyDir, name);
    const dest = join(targetDir, name);
    try {
      if (!existsSync(dest)) {
        renameSync(src, dest);
        moved.push(`${dirName}/${RETENTION.archiveSubdir}/${name}`);
      }
    } catch {
      /* ignore */
    }
  }
  return moved;
}

export function listStampedSnapshots(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".json") &&
        !STAMPED_EXCLUDE.has(entry.name)
    )
    .map((entry) => ({
      name: entry.name,
      path: join(dir, entry.name),
      mtime: statSync(join(dir, entry.name)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);
}

/**
 * Archive stamped snapshots beyond maxKeep (newest retained at artifact root).
 * Moves to <artifactDir>/archive/ — never deletes governed history.
 */
export function rotateStampedSnapshots(dir, maxKeep = RETENTION.maxStampedSnapshots) {
  migrateLegacyArchive(dir);
  const stamped = listStampedSnapshots(dir);
  const archived = [];
  const archiveDir = archiveDirFor(dir);
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  const dirName = basename(dir);
  for (const entry of stamped.slice(maxKeep)) {
    try {
      const dest = join(archiveDir, entry.name);
      renameSync(entry.path, dest);
      archived.push(`${dirName}/${RETENTION.archiveSubdir}/${entry.name}`);
    } catch {
      /* ignore */
    }
  }
  return archived;
}

function findingCodes(findings = []) {
  return [...findings].map((f) => f.code || f.message).sort().join("|");
}

export function isSignificantGraphChange(prev, next) {
  if (!next) return false;
  if (!prev) return true;
  if (prev.branch !== next.branch || prev.commit !== next.commit) return true;
  if (prev.engineering_console_detected !== next.engineering_console_detected) return true;

  const ps = prev.findings?.summary_counts || {};
  const ns = next.findings?.summary_counts || {};
  if (ps.orphan_candidates !== ns.orphan_candidates) return true;
  if (ps.shadow_flow_candidates !== ns.shadow_flow_candidates) return true;
  if (ps.total_nodes !== ns.total_nodes) return true;
  if (ps.total_edges !== ns.total_edges) return true;

  const pt = prev.findings?.endpoint_taxonomy?.unknown_endpoints;
  const nt = next.findings?.endpoint_taxonomy?.unknown_endpoints;
  if (pt !== nt) return true;

  return false;
}

export function isSignificantIntelligenceChange(prev, next) {
  if (!next) return false;
  if (!prev) return true;
  if (prev.branch !== next.branch || prev.commit !== next.commit) return true;
  if (prev.deploy_readiness !== next.deploy_readiness) return true;
  if (prev.risk?.overall !== next.risk?.overall) return true;
  if (prev.stability?.overall_score !== next.stability?.overall_score) return true;
  if (findingCodes(prev.findings) !== findingCodes(next.findings)) return true;
  if (prev.engineering_console_status?.DETECTED !== next.engineering_console_status?.DETECTED) {
    return true;
  }
  return false;
}

export function isSignificantLedgerChange(prev, next) {
  if (!next) return false;
  if (!prev) return true;
  if (prev.branch !== next.branch || prev.commit !== next.commit) return true;
  if (prev.risk_level !== next.risk_level) return true;
  if (prev.change_classification_hint !== next.change_classification_hint) return true;

  const pp = (prev.protected_files_touched || []).map((p) => p.file || p).sort().join(",");
  const np = (next.protected_files_touched || []).map((p) => p.file || p).sort().join(",");
  if (pp !== np) return true;

  const pf = (prev.files_changed || []).length;
  const nf = (next.files_changed || []).length;
  if (pf !== nf) return true;

  return false;
}

export function isDuplicateSnapshot(prev, next, significantCheck) {
  if (!prev || !next) return false;
  if (prev.branch !== next.branch || prev.commit !== next.commit) return false;
  return !significantCheck(prev, next);
}

export function shouldWriteStampedSnapshot(prev, next, significantCheck) {
  if (!next) return false;
  if (!prev) return true;
  if (isDuplicateSnapshot(prev, next, significantCheck)) return false;
  return significantCheck(prev, next);
}

export function shouldUpdateLastStable(next, significant) {
  if (!significant || !next) return false;
  const risk = next.risk?.overall ?? next.risk_level;
  const stability = next.stability?.overall_score;
  if (risk === "LOW" || risk === "low") return true;
  if (typeof stability === "number" && stability >= 90) return true;
  if (next.deploy_readiness === "READY" || next.deploy_readiness === "ready") return true;
  return significant;
}

/**
 * Write canonical artifacts with governed stamped retention (archival rotation).
 */
export function writeGovernedArtifacts({
  artifactDir,
  payload,
  reportMarkdown,
  significantCheck,
  stablePredicate = shouldUpdateLastStable
}) {
  if (!existsSync(artifactDir)) {
    mkdirSync(artifactDir, { recursive: true });
  }

  const latestPath = join(artifactDir, "latest.json");
  const prev = readJsonSafe(latestPath);
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  const significant = shouldWriteStampedSnapshot(prev, payload, significantCheck);

  writeFileSync(latestPath, body, "utf8");
  writeFileSync(join(artifactDir, "report.md"), reportMarkdown, "utf8");

  let stamped = null;
  if (significant) {
    stamped = snapshotFilename(payload.generated_at);
    writeFileSync(join(artifactDir, stamped), body, "utf8");
    if (stablePredicate(payload, true)) {
      writeFileSync(join(artifactDir, "last-stable.json"), body, "utf8");
    }
  }

  const archived = rotateStampedSnapshots(artifactDir);
  const dirName = basename(artifactDir);

  return {
    significant,
    stamped: stamped ? `${dirName}/${stamped}` : null,
    archived,
    removed: archived,
    canonical: [...CANONICAL_ARTIFACT_FILES],
    archiveDir: `${dirName}/${RETENTION.archiveSubdir}/`
  };
}
