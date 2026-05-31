import { evaluateRules } from "../engine/rule-evaluator.js";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  readdirSync
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildLedgerHash, LEDGER_HASH_FORMULA_ID } from "../services/ledger.js";
import {
  buildExecutionHash,
  buildAuditHash,
  verifyAuditChain,
  getLastAuditHash,
  AUDIT_HASH_FORMULA_ID,
  AUDIT_VERIFY_AUTHORITY_MODE,
  isLegacyAuditRow,
  isStrictAuditChainEnabled
} from "../services/audit.js";
import {
  applyOperatorDecision,
  buildCanonicalEvaluation,
  decisionToStatus,
  isCanonicalDecisionEnabled,
  isRpcOnlyOperatorEnabled,
  normalizeOperatorDecision,
  OperatorDecisionError,
  operatorDecisionToStatus
} from "../services/execution.js";
import { DECISIONS } from "../shared/statuses.js";

const approved = evaluateRules({
  request_type: "PAYMENT",
  actor: "bank-operator",
  subject: "invoice-001",
  amount: 100,
  rule_context: { approval_limit: 1000 }
});

if (approved.decision !== "APPROVE") throw new Error("Expected APPROVE");

const blocked = evaluateRules({
  request_type: "PAYMENT",
  actor: "bank-operator",
  subject: "invoice-002",
  amount: 2000,
  rule_context: { approval_limit: 1000 }
});

if (blocked.decision !== "BLOCK") throw new Error("Expected BLOCK");

const review = evaluateRules({ request_type: "PAYMENT" });
if (review.decision !== "REVIEW") throw new Error("Expected REVIEW");

const highRisk = evaluateRules({
  request_type: "PAYMENT",
  actor: "bank-operator",
  subject: "invoice-high-risk",
  amount: 1000000,
  rule_context: { approval_limit: 2000000000 }
});

if (highRisk.decision !== DECISIONS.REVIEW) throw new Error("Expected REVIEW for HIGH risk amount");
if (highRisk.reason !== "HIGH_RISK_REQUIRES_REVIEW") throw new Error("Expected HIGH_RISK_REQUIRES_REVIEW");

const canonical = buildCanonicalEvaluation({
  request_type: "PAYMENT",
  actor: "bank-operator",
  subject: "invoice-high-risk",
  amount: 1000000,
  rule_context: { approval_limit: 2000000000 }
});

if (canonical.version !== "1") throw new Error("Expected canonical_evaluation version 1");
if (canonical.decision !== DECISIONS.REVIEW) throw new Error("Expected canonical REVIEW decision");
if (canonical.status !== decisionToStatus(DECISIONS.REVIEW)) throw new Error("Expected canonical PENDING_REVIEW status");
if (canonical.source !== "engine/rule-evaluator") throw new Error("Expected engine/rule-evaluator source");

if (!isCanonicalDecisionEnabled()) throw new Error("Expected canonical decision enabled by default");

if (!isRpcOnlyOperatorEnabled()) throw new Error("Expected RPC-only operator enabled by default");
if (normalizeOperatorDecision("APPROVE") !== "APPROVE") throw new Error("Expected APPROVE normalization");
if (normalizeOperatorDecision("APPROVED") !== "APPROVE") throw new Error("Expected APPROVED → APPROVE normalization");
if (normalizeOperatorDecision("BLOCK") !== "BLOCK") throw new Error("Expected BLOCK normalization");
if (normalizeOperatorDecision("BLOCKED") !== "BLOCK") throw new Error("Expected BLOCKED → BLOCK normalization");
if (operatorDecisionToStatus("APPROVED") !== "APPROVED") throw new Error("Expected APPROVED → APPROVED status");
if (operatorDecisionToStatus("BLOCKED") !== "BLOCKED") throw new Error("Expected BLOCKED → BLOCKED status");

let invalidDecisionThrew = false;
try {
  normalizeOperatorDecision("REJECT");
} catch (error) {
  if (error instanceof OperatorDecisionError && error.code === "INVALID_OPERATOR_DECISION") {
    invalidDecisionThrew = true;
  }
}
if (!invalidDecisionThrew) throw new Error("Expected REJECT to throw INVALID_OPERATOR_DECISION");

let emptyDecisionThrew = false;
try {
  normalizeOperatorDecision("");
} catch (error) {
  if (error instanceof OperatorDecisionError && error.code === "INVALID_OPERATOR_DECISION") {
    emptyDecisionThrew = true;
  }
}
if (!emptyDecisionThrew) throw new Error("Expected empty decision to throw INVALID_OPERATOR_DECISION");

const dryApprove = await applyOperatorDecision({
  execution_id: "00000000-0000-0000-0000-000000000099",
  decision: "APPROVE",
  reason: "TEST"
});
if (dryApprove.status !== "APPROVED" || dryApprove.mode !== "DRY_RUN") {
  throw new Error("Expected DRY_RUN APPROVED operator decision");
}

const vectorExecutionId = "550e8400-e29b-41d4-a716-446655440000";

const approvedGenesis = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: vectorExecutionId,
  status: "APPROVED",
  decision: "APPROVE"
});

const blockedGenesis = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: vectorExecutionId,
  status: "BLOCKED",
  decision: "BLOCK"
});

const reviewGenesis = buildLedgerHash({
  previous_hash: "GENESIS",
  execution_id: vectorExecutionId,
  status: "PENDING_REVIEW",
  decision: "REVIEW"
});

const chainedBlocked = buildLedgerHash({
  previous_hash: approvedGenesis,
  execution_id: vectorExecutionId,
  status: "BLOCKED",
  decision: "BLOCK"
});

for (const h of [approvedGenesis, blockedGenesis, reviewGenesis, chainedBlocked]) {
  if (!h || h.length !== 64) throw new Error("Invalid ledger hash vector length");
}

if (approvedGenesis === blockedGenesis || approvedGenesis === reviewGenesis) {
  throw new Error("Ledger hash vectors must be distinct for different states");
}

if (chainedBlocked === blockedGenesis) {
  throw new Error("Chained ledger hash must differ from GENESIS-chained BLOCKED");
}

const projectionHash = buildExecutionHash(
  {
    execution_id: vectorExecutionId,
    status: "APPROVED",
    decision: "APPROVE",
    payload: {}
  },
  "GENESIS"
);

if (projectionHash !== approvedGenesis) {
  throw new Error("buildExecutionHash must delegate to ledger.js canonical formula");
}

if (LEDGER_HASH_FORMULA_ID !== "executia/ledger/v1") {
  throw new Error("Unexpected ledger hash formula id");
}

const auditGenesis = buildAuditHash(
  {
    execution_id: vectorExecutionId,
    event_type: "EXECUTION_SUBMITTED",
    actor: "system",
    payload: {
      chain_era: "3B1",
      reference_only: true,
      status: "PENDING_REVIEW",
      decision: "REVIEW",
      reason: "TEST"
    }
  },
  "GENESIS"
);

const auditChained = buildAuditHash(
  {
    execution_id: vectorExecutionId,
    event_type: "OPERATOR_DECISION_RECORDED",
    actor: "operator",
    payload: {
      chain_era: "3B1",
      reference_only: true,
      status: "APPROVED",
      decision: "APPROVE",
      reason: "TEST"
    }
  },
  auditGenesis
);

if (!auditGenesis || auditGenesis.length !== 64) {
  throw new Error("Invalid audit hash vector length");
}
if (auditGenesis === auditChained) {
  throw new Error("Chained audit hash must differ from GENESIS supplemental event");
}
if (AUDIT_HASH_FORMULA_ID !== "executia/audit/v1") {
  throw new Error("Unexpected audit hash formula id");
}
if (AUDIT_VERIFY_AUTHORITY_MODE !== "SUPPLEMENTAL_AUDIT_GLOBAL") {
  throw new Error("Unexpected audit verify authority mode");
}

const dryAudit = await verifyAuditChain();
if (!dryAudit.verified || dryAudit.mode !== "DRY_RUN") {
  throw new Error("Expected DRY_RUN global audit verify");
}
if (dryAudit.chain_scope !== "GLOBAL") {
  throw new Error("Expected GLOBAL audit chain scope");
}

const dryHead = await getLastAuditHash();
if (dryHead !== "GENESIS") {
  throw new Error("Expected GENESIS audit head in DRY_RUN");
}

if (!isLegacyAuditRow({ event_type: "EXECUTION_CREATED", payload: {} })) {
  throw new Error("Expected legacy row without event_hash");
}
if (isLegacyAuditRow({ event_hash: auditGenesis, payload: { chain_era: "3B1" } })) {
  throw new Error("Expected non-legacy row with event_hash");
}
if (isStrictAuditChainEnabled() && !process.env.EXECUTIA_STRICT_AUDIT_CHAIN) {
  throw new Error("Strict audit flag should be false by default in test runner");
}

const {
  resolveLedgerVerifyAuthority,
  LEDGER_VERIFY_AUTHORITY_MODE
} = await import("../api/v1/ledger-verify.js");

const ledgerOk = { verified: true, entries: 10 };
const execFail = {
  verified: false,
  entries: 10,
  tampered_execution_id: "93d10bcc-518b-4353-8e0b-852e04d34aa4"
};
const coreFail = {
  verified: false,
  entries: 5,
  tampered_id: "ed9f4e9c-2c9b-4eb1-a117-391bb135e718"
};
const auditOk = { verified: true, accounts_checked: 3, mismatches: [] };

const phase31 = resolveLedgerVerifyAuthority({
  ledger: ledgerOk,
  executions: execFail,
  coreLedger: coreFail,
  accountAudit: auditOk
});

if (phase31.verified !== true) {
  throw new Error("Phase 3A.1: verified must follow ledger_chain when ledger verified");
}
if (phase31.authority_mode !== LEDGER_VERIFY_AUTHORITY_MODE) {
  throw new Error("Phase 3A.1: expected LEDGER_ENTRIES_PRIMARY authority_mode");
}
if (!phase31.legacy_projection_warning?.tampered_execution_id) {
  throw new Error("Phase 3A.1: legacy_projection_warning must retain tampered_execution_id");
}
if (!phase31.legacy_core_ledger_warning?.tampered_id) {
  throw new Error("Phase 3A.1: legacy_core_ledger_warning must retain tampered_id");
}
if (phase31.legacy_verified.composite_all_chains !== false) {
  throw new Error("Phase 3A.1: composite_all_chains must reflect legacy components");
}
if (phase31.legacy_verified.execution_projection !== false) {
  throw new Error("Phase 3A.1: legacy_verified.execution_projection mismatch");
}

const allLegacyOk = resolveLedgerVerifyAuthority({
  ledger: ledgerOk,
  executions: { verified: true, entries: 1 },
  coreLedger: { verified: true, entries: 1 },
  accountAudit: auditOk
});

if (allLegacyOk.verified !== true || allLegacyOk.legacy_projection_warning !== null) {
  throw new Error("Phase 3A.1: no warnings when all legacy chains verify");
}

const ledgerFail = resolveLedgerVerifyAuthority({
  ledger: { verified: false, entries: 1, reason: "ENTRY_HASH_MISMATCH" },
  executions: execFail,
  coreLedger: coreFail,
  accountAudit: auditOk
});

if (ledgerFail.verified !== false) {
  throw new Error("Phase 3A.1: verified must be false when ledger_chain fails");
}
if (ledgerFail.legacy_projection_warning !== null) {
  throw new Error("Phase 3A.1: no projection warning when ledger_chain not verified");
}

const {
  buildDeterministicReplay,
  REPLAY_MODE,
  REPLAY_CANONICAL_NOTE
} = await import("../api/v1/execution/replay.js");

const replaySafe = buildDeterministicReplay({
  execution_id: vectorExecutionId,
  execution: {
    status: "APPROVED",
    decision: "APPROVE",
    actor: "operator",
    subject: "invoice-001",
    hash: approvedGenesis,
    prev_hash: "GENESIS",
    created_at: "2026-01-01T00:00:00.000Z"
  },
  audit_events_count: 2,
  ledger_entries_count: 1
});

if (replaySafe.replay_mode !== REPLAY_MODE) {
  throw new Error("Unexpected replay mode");
}
if (!replaySafe.execution_found || !replaySafe.deterministic_checks?.canonical_replay_safe) {
  throw new Error("Expected canonical replay safe for complete execution");
}
if (replaySafe.canonical_replay_result !== "REPLAY_SAFE") {
  throw new Error("Expected canonical_replay_result REPLAY_SAFE");
}
if (!Array.isArray(replaySafe.timeline) || replaySafe.timeline.length !== 4) {
  throw new Error("Expected replay timeline with 4 steps");
}
if (replaySafe.timeline[3]?.layer !== "REPLAY_DECISION" || replaySafe.timeline[3]?.result !== "REPLAY_SAFE") {
  throw new Error("Expected final replay timeline decision REPLAY_SAFE");
}
if (replaySafe.canonical_note !== REPLAY_CANONICAL_NOTE) {
  throw new Error("Unexpected replay canonical note");
}

const replayMissing = buildDeterministicReplay({
  execution_id: vectorExecutionId
});

if (replayMissing.execution_found || replayMissing.deterministic_checks?.canonical_replay_safe) {
  throw new Error("Expected replay unsafe when execution missing");
}
if (replayMissing.canonical_replay_result !== "REPLAY_CHECK") {
  throw new Error("Expected canonical_replay_result REPLAY_CHECK when execution missing");
}

const __test_dir = dirname(fileURLToPath(import.meta.url));
const publicVerifySource = readFileSync(
  join(__test_dir, "../api/v1/verify/[execution_id].js"),
  "utf8"
);

if (publicVerifySource.includes("requireInternalKey")) {
  throw new Error("Public verify must not require internal key");
}

for (const forbidden of ["insert", "update", "delete", "upsert"]) {
  if (new RegExp(`\\.${forbidden}\\(`, "i").test(publicVerifySource)) {
    throw new Error(`Public verify must not contain database mutation: ${forbidden}`);
  }
}

const phase35GovernanceFiles = [
  ".cursor/context/change-classification.md",
  ".cursor/context/protected-files.md",
  ".cursor/rules/change-governance.mdc",
  "scripts/phase-3b5-governance-check.js"
];

for (const file of phase35GovernanceFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 3B5 governance file: ${file}`);
  }
}

const phase36EngineeringFiles = [
  "docs/governance/engineering-ledger.md",
  ".cursor/context/engineering-ledger.md",
  "scripts/phase-3b6-engineering-ledger.js",
  "engineering-ledger/.gitkeep"
];

for (const file of phase36EngineeringFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 3B6 engineering ledger file: ${file}`);
  }
}

const { buildEngineeringSnapshot, classifyEngineeringChange } = await import(
  "../scripts/phase-3b6-engineering-ledger.js"
);

const canonicalSample = classifyEngineeringChange(["sql/012_example.sql", "services/audit.js"]);
if (canonicalSample.risk_level !== "CANONICAL") {
  throw new Error("Expected CANONICAL risk for protected audit/sql touch");
}
if (!canonicalSample.protected_files_touched.length) {
  throw new Error("Expected protected_files_touched for sql/audit");
}

const docsSample = classifyEngineeringChange(["docs/governance/engineering-ledger.md"]);
if (docsSample.risk_level !== "LOW") {
  throw new Error("Expected LOW risk for docs-only change");
}

const uiSample = classifyEngineeringChange(["console/ledger.html"]);
if (uiSample.risk_level !== "MEDIUM") {
  throw new Error("Expected MEDIUM risk for UI-only change");
}

const snapshot = buildEngineeringSnapshot(["docs/governance/engineering-ledger.md"]);
if (!snapshot.governance?.replayable) {
  throw new Error("Engineering snapshot must be replayable");
}
if (!snapshot.generated_at || !snapshot.branch || !snapshot.commit) {
  throw new Error("Engineering snapshot missing core fields");
}
if (snapshot.governance.deterministic_checks_required !== false) {
  throw new Error("Docs-only snapshot should not require deterministic checks");
}

const phase37DriftFiles = [
  "scripts/phase-3b7-architecture-drift.js",
  ".cursor/context/architecture-drift.md",
  "docs/governance/architecture-drift.md"
];

for (const file of phase37DriftFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 3B7 architecture drift file: ${file}`);
  }
}

const { runArchitectureDriftScan } = await import(
  "../scripts/phase-3b7-architecture-drift.js"
);

const driftSample = runArchitectureDriftScan({
  files: ["api/v1/verify/[execution_id].js", "docs/governance/architecture-drift.md"],
  envTouched: []
});

if (driftSample.violations.length) {
  throw new Error("Public verify sample should not produce hard violations");
}

const driftViolation = runArchitectureDriftScan({
  files: ["api/v1/verify/fake-test-violation.js"],
  envTouched: []
});

const fakePublicVerify =
  'import { requireInternalKey } from "../../services/auth.js";\nexport default function handler() { requireInternalKey({}); }\n';

writeFileSync(
  join(__test_dir, "../api/v1/verify/fake-test-violation.js"),
  fakePublicVerify,
  "utf8"
);

try {
  const withKey = runArchitectureDriftScan({
    files: ["api/v1/verify/fake-test-violation.js"],
    envTouched: []
  });
  if (!withKey.violations.some((v) => v.includes("requireInternalKey"))) {
    throw new Error("Expected hard violation when public verify uses requireInternalKey");
  }
} finally {
  try {
    unlinkSync(join(__test_dir, "../api/v1/verify/fake-test-violation.js"));
  } catch (_) {}
}

const phase38GraphFiles = [
  "scripts/phase-3b8-architecture-graph.js",
  ".cursor/context/architecture-graph.md",
  "docs/governance/architecture-graph.md",
  "architecture-graph/.gitkeep"
];

for (const file of phase38GraphFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 3B8 architecture graph file: ${file}`);
  }
}

const phase38ScriptPath = join(__test_dir, "..", "scripts/phase-3b8-architecture-graph.js");
const phase38Source = readFileSync(phase38ScriptPath, "utf8");
const classificationLabels = [
  "canonical_authority",
  "public_verification",
  "replay_layer",
  "governance_execution",
  "governance_projection",
  "proof_projection",
  "ledger_projection",
  "audit_projection",
  "operator_control",
  "engineering_intelligence",
  "legacy_projection"
];
for (const label of classificationLabels) {
  if (!phase38Source.includes(label)) {
    throw new Error(`Architecture graph script must include classification label: ${label}`);
  }
}

const { buildArchitectureGraph, writeGraphOutputs } = await import(
  "../scripts/phase-3b8-architecture-graph.js"
);

const graph = buildArchitectureGraph();
if (!graph.findings.canonical_authority.includes("endpoint:audit/verify")) {
  throw new Error("Architecture graph must include canonical audit verify");
}
if (!graph.findings.replay_layer.includes("endpoint:execution/replay")) {
  throw new Error("Architecture graph must include execution replay layer");
}
if (!graph.findings.public_verification.includes("endpoint:verify/execution_id")) {
  throw new Error("Architecture graph must include public verification endpoint");
}
if (graph.findings.governance_layer.length < 4) {
  throw new Error("Architecture graph must include Phase 3B5–3B8 governance scripts");
}
if (!graph.nodes.length || !graph.edges.length) {
  throw new Error("Architecture graph must contain nodes and edges");
}
if (!graph.findings.summary_counts) {
  throw new Error("Architecture graph must include summary_counts");
}
if (!graph.findings.endpoint_taxonomy) {
  throw new Error("Architecture graph must include endpoint_taxonomy findings");
}
if (graph.findings.endpoint_taxonomy.classified_endpoints < 1) {
  throw new Error("Endpoint taxonomy must classify at least one API endpoint");
}
if (graph.findings.endpoint_taxonomy.unknown_endpoints !== 0) {
  throw new Error(
    `Endpoint taxonomy must have zero unknown endpoints; got ${graph.findings.endpoint_taxonomy.unknown_endpoints}`
  );
}
const orphanBaseline = 54;
if (graph.findings.orphan_candidates.length >= orphanBaseline) {
  throw new Error(
    `Phase 4B must reduce orphans below ${orphanBaseline}; got ${graph.findings.orphan_candidates.length}`
  );
}

const taxonomyContextFiles = [
  ".cursor/context/endpoint-taxonomy.md",
  "docs/governance/endpoint-taxonomy.md"
];
for (const file of taxonomyContextFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing endpoint taxonomy file: ${file}`);
  }
}
const classifiedNodes = graph.nodes.filter((n) => n.classification);
if (classifiedNodes.length < graph.nodes.length * 0.9) {
  throw new Error("Architecture graph nodes must include classification labels");
}

writeGraphOutputs(graph, join(__test_dir, ".."));
if (graph.findings.engineering_console_detected !== true) {
  throw new Error("Architecture graph must set engineering_console_detected === true");
}
const engConsoleUi = graph.nodes.filter((n) => n.classification === "engineering_console");
const engIntelNodes = graph.nodes.filter((n) => n.classification === "engineering_intelligence");
if (engConsoleUi.length < 2) {
  throw new Error("Architecture graph must classify engineering console UI nodes");
}
if (engIntelNodes.length < 1) {
  throw new Error("Architecture graph must classify engineering_intelligence API node");
}
if (!graph.findings.engineering_console_governance?.read_only) {
  throw new Error("Architecture graph must include engineering_console_governance mapping");
}
const reportPath = join(__test_dir, "..", "architecture-graph/report.md");
if (!existsSync(reportPath)) {
  throw new Error("Architecture graph must write architecture-graph/report.md");
}
const reportBody = readFileSync(reportPath, "utf8");
if (!reportBody.includes("Canonical authority") || !reportBody.includes("Summary counts")) {
  throw new Error("Architecture graph report.md must include required sections");
}
if (
  !reportBody.includes("Engineering Console Layer") ||
  !reportBody.includes("Governance Visualization Layer")
) {
  throw new Error("Architecture graph report must include engineering console governance sections");
}
if (
  !reportBody.includes("Endpoint taxonomy summary") ||
  !reportBody.includes("Remaining orphan endpoints")
) {
  throw new Error("Architecture graph report must include endpoint taxonomy sections");
}
if (
  !graph.findings.canonical_authority.length &&
  !graph.findings.replay_layer.length &&
  !graph.findings.governance_layer.length
) {
  throw new Error("Architecture graph latest must have institutional findings");
}

const phase39Files = [
  "scripts/phase-3b9-execution-intelligence.js",
  ".cursor/context/execution-intelligence.md",
  "docs/governance/execution-intelligence.md",
  "execution-intelligence/.gitkeep"
];

for (const file of phase39Files) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 3B9 execution intelligence file: ${file}`);
  }
}

const { buildExecutionIntelligence, writeIntelligenceOutputs } = await import(
  "../scripts/phase-3b9-execution-intelligence.js"
);

const intel = buildExecutionIntelligence(join(__test_dir, ".."));
if (typeof intel.stability?.overall_score !== "number") {
  throw new Error("Execution intelligence must include stability scores");
}
if (!intel.risk?.overall) {
  throw new Error("Execution intelligence must include risk summary");
}
if (!intel.architecture_delta) {
  throw new Error("Execution intelligence must include architecture_delta");
}

writeIntelligenceOutputs(intel, join(__test_dir, ".."));
const intelReportPath = join(__test_dir, "..", "execution-intelligence/report.md");
if (!existsSync(intelReportPath)) {
  throw new Error("Execution intelligence must write execution-intelligence/report.md");
}
const intelReportBody = readFileSync(intelReportPath, "utf8");
if (!intelReportBody.includes("Stability score") || !intelReportBody.includes("Deploy readiness")) {
  throw new Error("Execution intelligence report.md must include required sections");
}
if (!intelReportBody.includes("Engineering Console Status")) {
  throw new Error("Execution intelligence report must include Engineering Console Status");
}
if (!intelReportBody.includes("Engineering Console Authority")) {
  throw new Error("Execution intelligence report must include Engineering Console Authority");
}
if (intel.engineering_console_status?.DETECTED !== true) {
  throw new Error("Execution intelligence must report engineering console DETECTED");
}

const phase4aFiles = [
  "console/engineering.html",
  "public/console/engineering.html",
  "api/v1/engineering/intelligence.js",
  "services/engineering-intelligence-loader.js"
];

for (const file of phase4aFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 4A engineering console file: ${file}`);
  }
}

const intelApiPath = join(__test_dir, "..", "api/v1/engineering/intelligence.js");
const intelApiSource = readFileSync(intelApiPath, "utf8");
if (!intelApiSource.includes("buildEngineeringIntelligencePayload")) {
  throw new Error("Engineering intelligence API must aggregate local governance artifacts");
}

const { buildEngineeringIntelligencePayload } = await import(
  "../services/engineering-intelligence-loader.js"
);
const engPayload = buildEngineeringIntelligencePayload(join(__test_dir, ".."));
if (engPayload.engineering_console_detected !== true) {
  throw new Error("Engineering intelligence payload must set engineering_console_detected true from graph");
}
if (engPayload.architecture_graph?.engineering_console_detected !== true) {
  throw new Error("Architecture graph summary must propagate engineering_console_detected true");
}
if (engPayload.engineering_console_authority?.DETECTED !== true) {
  throw new Error("Engineering console authority must report DETECTED true");
}

const phase5aFiles = [
  "public/components/executia-design-system.css",
  "public/components/executia-governance-shell.css",
  "public/components/executia-governance-language.js",
  "docs/governance/design-system.md",
  ".cursor/context/design-system.md"
];

for (const file of phase5aFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5A institutional design system file: ${file}`);
  }
}

const engHtml5a = readFileSync(
  join(__test_dir, "..", "public/console/engineering.html"),
  "utf8"
);
if (!engHtml5a.includes("executia-governed-presentation.css")) {
  throw new Error("Engineering console must load executia-governed-presentation.css (5G bundle)");
}
if (!engHtml5a.includes("executia-governance-core.js")) {
  throw new Error("Engineering console must load executia-governance-core.js");
}
if (!engHtml5a.includes("ex-gov-core-enabled")) {
  throw new Error("Engineering console must enable governance core");
}
if (!engHtml5a.includes("ex-ds-governance-shell")) {
  throw new Error("Engineering console must use ex-ds-governance-shell");
}

const dsCss = readFileSync(
  join(__test_dir, "..", "public/components/executia-design-system.css"),
  "utf8"
);
for (const token of [
  "--ex-ds-s8",
  "--ex-ds-s64",
  "ex-ds-executive",
  "ex-ds-authority-heading",
  "ex-ds-diagnostics",
  "ex-ds-institutional-label",
  "ex-ds-tier-primary"
]) {
  if (!dsCss.includes(token)) {
    throw new Error(`Design system CSS missing token/class: ${token}`);
  }
}

const langJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-governance-core.js"),
  "utf8"
);
for (const term of [
  "CANONICAL",
  "VERIFIED",
  "GOVERNED",
  "REPLAY_SAFE",
  "DETERMINISTIC",
  "EXECUTION_AUTHORITY",
  "EXECUTION_INTEGRITY",
  "READ_ONLY",
  "GOVERNANCE_STATUS",
  "EXECUTION_SURFACE"
]) {
  if (!langJs.includes(term)) {
    throw new Error(`Governance language missing canonical term: ${term}`);
  }
}

const shellJs = readFileSync(
  join(__test_dir, "..", "public/components/engine-shell.js"),
  "utf8"
);
if (!shellJs.includes("ex-gov-nav-primary")) {
  throw new Error("Engine shell must expose primary governance navigation");
}
if (!shellJs.includes("EXECUTIA_GOVERNANCE_CORE")) {
  throw new Error("Engine shell must resolve navigation from governance core");
}
if (!langJs.includes('["ENGINEERING", "/console/engineering.html"]')) {
  throw new Error("Governance core must link ENGINEERING surface to engineering console");
}
if (!langJs.includes("buildNav") || !langJs.includes("EXECUTIA_INSTITUTIONAL_SURFACES")) {
  throw new Error("Governance core must build navigation from institutional surfaces registry");
}
if (!langJs.includes("Execution Governance Infrastructure")) {
  throw new Error("Governance language must use Execution Governance Infrastructure brand subline");
}

const phase5bFiles = [
  "public/components/executia-operational-shell.css",
  "public/components/executia-operational-shell.js",
  "docs/governance/operational-shell.md",
  ".cursor/context/operational-shell.md"
];

for (const file of phase5bFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5B operational shell file: ${file}`);
  }
}

if (engHtml5a.includes("executia-execution-identity.js") && !engHtml5a.includes("executia-governance-core.js")) {
  throw new Error("Engineering console must not load identity shim without governance core");
}
if (!engHtml5a.includes("ex-op-shell")) {
  throw new Error("Engineering console must use ex-op-shell");
}
if (!engHtml5a.includes("engineering-governance-surfaces.js")) {
  throw new Error("Engineering console must load governance surface renderers (5E)");
}

const opShellDoc = readFileSync(
  join(__test_dir, "..", "docs/governance/operational-shell.md"),
  "utf8"
);
if (
  !/governance status/i.test(opShellDoc) ||
  !/canonical authority/i.test(opShellDoc)
) {
  throw new Error("Operational shell documentation must define section hierarchy");
}

const phase5cFiles = [
  "services/artifact-governance.js",
  "docs/governance/artifact-governance.md",
  "docs/governance/artifact-retention.md",
  ".cursor/context/artifact-governance.md",
  ".cursor/context/artifact-retention.md"
];

for (const file of phase5cFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5C artifact governance file: ${file}`);
  }
}

const {
  isSignificantGraphChange,
  isSignificantIntelligenceChange,
  isSignificantLedgerChange,
  rotateStampedSnapshots,
  writeGovernedArtifacts,
  readJsonSafe,
  RETENTION
} = await import("../services/artifact-governance.js");

if (RETENTION.maxStampedSnapshots !== 8) {
  throw new Error("Artifact retention must keep newest 8 stamped snapshots");
}

const graphA = { branch: "main", commit: "a", generated_at: "2026-01-01T00:00:00.000Z", findings: { summary_counts: { orphan_candidates: 0, shadow_flow_candidates: 0, total_nodes: 10, total_edges: 5 } } };
const graphB = { ...graphA, commit: "b" };
if (!isSignificantGraphChange(graphA, graphB)) {
  throw new Error("Graph significance must detect commit change");
}
if (isSignificantGraphChange(graphA, { ...graphA })) {
  throw new Error("Duplicate graph run must not be significant");
}

const intelA = { branch: "main", commit: "a", generated_at: "2026-01-01T00:00:00.000Z", deploy_readiness: "READY", risk: { overall: "LOW" }, stability: { overall_score: 94 }, findings: [] };
const intelB = { ...intelA, stability: { overall_score: 80 } };
if (!isSignificantIntelligenceChange(intelA, intelB)) {
  throw new Error("Intelligence significance must detect stability change");
}

const ledgerA = { branch: "main", commit: "a", generated_at: "2026-01-01T00:00:00.000Z", risk_level: "LOW", files_changed: [], protected_files_touched: [] };
const ledgerB = { ...ledgerA, risk_level: "HIGH" };
if (!isSignificantLedgerChange(ledgerA, ledgerB)) {
  throw new Error("Ledger significance must detect risk change");
}

const graph38 = readFileSync(phase38ScriptPath, "utf8");
if (!graph38.includes("writeGovernedArtifacts") || !graph38.includes("isSignificantGraphChange")) {
  throw new Error("Phase 3B8 must use artifact governance writes");
}

const intel39 = readFileSync(join(__test_dir, "..", "scripts/phase-3b9-execution-intelligence.js"), "utf8");
if (!intel39.includes("writeGovernedArtifacts")) {
  throw new Error("Phase 3B9 must use artifact governance writes");
}

const ledger36 = readFileSync(join(__test_dir, "..", "scripts/phase-3b6-engineering-ledger.js"), "utf8");
if (!ledger36.includes("writeLedgerOutputs") || !ledger36.includes("latest.json")) {
  throw new Error("Phase 3B6 must write canonical engineering-ledger/latest.json");
}

const phase5dFiles = [
  "public/components/executia-governance-modes.js",
  "public/components/executia-governance-modes.css",
  "docs/governance/governance-modes.md",
  ".cursor/context/governance-modes.md"
];

for (const file of phase5dFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5D governance modes file: ${file}`);
  }
}

if (
  !engHtml5a.includes("executia-governance-modes.css") &&
  !engHtml5a.includes("executia-governed-presentation.css")
) {
  throw new Error("Engineering console must load governance modes styles");
}
if (!engHtml5a.includes("ex-gov-modes-enabled")) {
  throw new Error("Engineering console must enable governance modes");
}
if (!engHtml5a.includes("ex-gov-mode-panel")) {
  throw new Error("Engineering console must use dedicated governance mode panels (5E)");
}
if (!engHtml5a.includes("engineering-governance-surfaces.js")) {
  throw new Error("Engineering console must load engineering-governance-surfaces.js");
}

const phase5eFiles = [
  "public/components/engineering-governance-surfaces.js",
  "docs/governance/governance-surface-separation.md",
  ".cursor/context/governance-surface-separation.md"
];
for (const file of phase5eFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5E governance surface file: ${file}`);
  }
}

const modesJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-governance-modes.js"),
  "utf8"
);
for (const mode of ["EXECUTIVE", "OPERATIONAL", "ENGINEERING", "AUDIT", "PUBLIC_VERIFY"]) {
  if (!modesJs.includes(mode)) {
    throw new Error(`Governance modes must define ${mode}`);
  }
}

if (!modesJs.includes("executia:governance-mode-change")) {
  throw new Error("Governance modes must dispatch mode change event for surface re-render");
}

const surfacesJs = readFileSync(
  join(__test_dir, "..", "public/components/engineering-governance-surfaces.js"),
  "utf8"
);
if (!surfacesJs.includes("renderExecutive") || !surfacesJs.includes("renderPublicVerify")) {
  throw new Error("Governance surfaces must implement mode-specific renderers");
}
if (!surfacesJs.includes("Executive authority findings")) {
  throw new Error("Executive surface must render executive authority findings only");
}
if (!surfacesJs.includes("Canonical memory retention") || !surfacesJs.includes("Deterministic replay safety")) {
  throw new Error("Governance surfaces must include canonical memory retention and audit replay safety sections");
}
if (!surfacesJs.includes("SURFACE") || !surfacesJs.includes("opSurface")) {
  throw new Error("Governance surfaces must use mode-aware operational surface helpers");
}

const phase5eDoc = readFileSync(
  join(__test_dir, "..", "docs/governance/governance-surface-separation.md"),
  "utf8"
);
if (!/Executive/i.test(phase5eDoc) || !/Public verify/i.test(phase5eDoc)) {
  throw new Error("Governance surface separation docs must describe all perspectives");
}

const phase5fFiles = [
  "public/components/executia-execution-identity.js",
  "public/components/executia-execution-identity.css",
  "docs/governance/execution-identity.md",
  ".cursor/context/execution-identity.md"
];
for (const file of phase5fFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5F execution identity file: ${file}`);
  }
}

const idJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-governance-core.js"),
  "utf8"
);
if (!idJs.includes("EXECUTION VERIFIED") || !idJs.includes("FRAME_INEVITABILITY")) {
  throw new Error("Governance core must define execution states and frame inevitability");
}
if (!idJs.includes("EXECUTION AUTHORITY ACTIVE") || !idJs.includes("EXECUTION INTEGRITY MAINTAINED")) {
  throw new Error("Governance core must define authority active and integrity maintained states");
}
if (!idJs.includes("applyPresentation")) {
  throw new Error("Governance core must expose applyPresentation for operational surfaces");
}

if (
  !langJs.includes("Execution Governance Infrastructure") &&
  !langJs.includes("Execution Authority")
) {
  throw new Error("Governance language must use institutional infrastructure brand framing");
}
if (!langJs.includes('["ENGINEERING", "/console/engineering.html"]')) {
  throw new Error("Governance language nav must include ENGINEERING surface");
}

const phase5gFiles = [
  "public/components/executia-governance-core.js",
  "public/components/executia-governance-core.css",
  "public/components/executia-governed-presentation.css",
  "docs/governance/governance-consolidation.md",
  ".cursor/context/governance-consolidation.md"
];
for (const file of phase5gFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5G governance consolidation file: ${file}`);
  }
}

const coreJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-governance-core.js"),
  "utf8"
);
if (!coreJs.includes("EXECUTIA_GOVERNANCE_CORE") || !coreJs.includes("applyPresentation")) {
  throw new Error("Governance core must expose unified applyPresentation API");
}
if (!coreJs.includes("ex-gov-authority-frame")) {
  throw new Error("Governance core must use single authority frame");
}
if (!coreJs.includes("opSurface") || !coreJs.includes("STATE_DISPLAY_MAX")) {
  throw new Error("Governance core must expose unified surface render helpers and state cap");
}

const surfacesJs5g = readFileSync(
  join(__test_dir, "..", "public/components/engineering-governance-surfaces.js"),
  "utf8"
);
if (!surfacesJs5g.includes("EXECUTIA_GOVERNANCE_CORE")) {
  throw new Error("Engineering governance surfaces must delegate to governance core");
}
if (surfacesJs5g.includes("function surfaceClass")) {
  throw new Error("Engineering governance surfaces must not duplicate surfaceClass");
}

const opShellJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-operational-shell.js"),
  "utf8"
);
if (!opShellJs.includes("EXECUTIA_GOVERNANCE_CORE")) {
  throw new Error("Operational shell must delegate to governance core");
}

const modesJs5g = readFileSync(
  join(__test_dir, "..", "public/components/executia-governance-modes.js"),
  "utf8"
);
if (modesJs5g.includes("focus: [")) {
  throw new Error("Governance modes must not duplicate verbose focus metadata");
}

const phase5hFiles = [
  "public/components/executia-execution-rhythm.js",
  "public/components/executia-execution-rhythm.css",
  "docs/governance/execution-rhythm.md",
  ".cursor/context/execution-rhythm.md"
];
for (const file of phase5hFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5H execution rhythm file: ${file}`);
  }
}

if (!engHtml5a.includes("executia-execution-rhythm.js")) {
  throw new Error("Engineering console must load executia-execution-rhythm.js");
}
if (!engHtml5a.includes("ex-rhythm-enabled")) {
  throw new Error("Engineering console must enable execution rhythm layer");
}
if (engHtml5a.includes("setInterval(load")) {
  throw new Error("Engineering console must use governed rhythm refresh, not raw setInterval");
}

const rhythmJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-execution-rhythm.js"),
  "utf8"
);
if (!rhythmJs.includes("EXECUTION CONTINUITY MAINTAINED") || !rhythmJs.includes("runGovernedRefresh")) {
  throw new Error("Execution rhythm must define continuity framing and governed refresh");
}
if (!rhythmJs.includes("GOVERNANCE SYNCHRONIZED")) {
  throw new Error("Execution rhythm must define governance synchronized framing");
}
if (!rhythmJs.includes("EXECUTION SURFACE SYNCHRONIZED")) {
  throw new Error("Execution rhythm must define execution surface synchronized framing");
}
if (!rhythmJs.includes("activeController")) {
  throw new Error("Execution rhythm must use single canonical controller instance");
}

const governedCss = readFileSync(
  join(__test_dir, "..", "public/components/executia-governed-presentation.css"),
  "utf8"
);
if (!governedCss.includes("executia-execution-rhythm.css")) {
  throw new Error("Governed presentation bundle must import execution rhythm CSS");
}

const phase5iFiles = [
  "public/components/executia-execution-consequence.js",
  "public/components/executia-execution-consequence.css",
  "docs/governance/execution-consequence.md",
  ".cursor/context/execution-consequence.md"
];
for (const file of phase5iFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5I execution consequence file: ${file}`);
  }
}

if (!engHtml5a.includes("executia-execution-consequence.js")) {
  throw new Error("Engineering console must load executia-execution-consequence.js");
}
if (!engHtml5a.includes("ex-consequence-enabled")) {
  throw new Error("Engineering console must enable execution consequence layer");
}

const consequenceJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-execution-consequence.js"),
  "utf8"
);
if (!consequenceJs.includes("EXECUTION COMMITTED") || !consequenceJs.includes("frameOperatorAction")) {
  throw new Error("Execution consequence must define transition frames and operator framing");
}
if (!consequenceJs.includes("EXECUTION CONSEQUENCE APPLIED")) {
  throw new Error("Execution consequence must define consequence applied framing");
}

if (!governedCss.includes("executia-execution-consequence.css")) {
  throw new Error("Governed presentation bundle must import execution consequence CSS");
}

const phase5jFiles = [
  "public/components/executia-execution-memory.js",
  "public/components/executia-execution-memory.css",
  "docs/governance/execution-memory.md",
  ".cursor/context/execution-memory.md"
];
for (const file of phase5jFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5J execution memory file: ${file}`);
  }
}

if (!engHtml5a.includes("executia-execution-memory.js")) {
  throw new Error("Engineering console must load executia-execution-memory.js");
}
if (!engHtml5a.includes("ex-memory-enabled")) {
  throw new Error("Engineering console must enable execution memory layer");
}
if (!engHtml5a.includes("applyMemory")) {
  throw new Error("Engineering console must apply execution memory on governed refresh");
}

const memoryJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-execution-memory.js"),
  "utf8"
);
if (!memoryJs.includes("EXECUTION MEMORY") || !memoryJs.includes("applyMemory")) {
  throw new Error("Execution memory must define institutional frames and applyMemory");
}
if (!memoryJs.includes("EXECUTION CONTINUITY RECORD") || !memoryJs.includes("REPLAYABLE CONSEQUENCE")) {
  throw new Error("Execution memory must define continuity record and replayable consequence language");
}
if (!memoryJs.includes("execution continuity memory")) {
  throw new Error("Execution memory must define primary hierarchy tier");
}

if (!governedCss.includes("executia-execution-memory.css")) {
  throw new Error("Governed presentation bundle must import execution memory CSS");
}

const surfacesJs5j = readFileSync(
  join(__test_dir, "..", "public/components/engineering-governance-surfaces.js"),
  "utf8"
);
if (/artifact retention|ledger snapshots|stamped snapshots/i.test(surfacesJs5j)) {
  throw new Error("Governance surfaces must not use artifact or snapshot dump terminology");
}
if (!surfacesJs5j.includes("Canonical memory retention") || !surfacesJs5j.includes("Replayable governance memory")) {
  throw new Error("Governance surfaces must use execution memory presentation language");
}

const phase5kFiles = [
  "public/components/executia-execution-intent.js",
  "public/components/executia-execution-intent.css",
  "docs/governance/execution-intent.md",
  ".cursor/context/execution-intent.md"
];
for (const file of phase5kFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5K execution intent file: ${file}`);
  }
}

if (!engHtml5a.includes("executia-execution-intent.js")) {
  throw new Error("Engineering console must load executia-execution-intent.js");
}
if (!engHtml5a.includes("ex-intent-enabled")) {
  throw new Error("Engineering console must enable execution intent layer");
}
if (!engHtml5a.includes("applyIntent")) {
  throw new Error("Engineering console must apply execution intent on governed refresh");
}

const intentJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-execution-intent.js"),
  "utf8"
);
if (!intentJs.includes("EXECUTION OBJECTIVE") || !intentJs.includes("applyIntent")) {
  throw new Error("Execution intent must define institutional frames and applyIntent");
}
if (!intentJs.includes("GOVERNED OUTCOME") || !intentJs.includes("DETERMINISTIC PURPOSE")) {
  throw new Error("Execution intent must define governed outcome and deterministic purpose language");
}
if (!intentJs.includes("execution objective")) {
  throw new Error("Execution intent must define primary hierarchy tier");
}
if (/workflow|task orchestration|productivity/i.test(intentJs)) {
  throw new Error("Execution intent must avoid workflow and task orchestration terminology");
}

if (!governedCss.includes("executia-execution-intent.css")) {
  throw new Error("Governed presentation bundle must import execution intent CSS");
}

const surfacesJs5k = readFileSync(
  join(__test_dir, "..", "public/components/engineering-governance-surfaces.js"),
  "utf8"
);
if (/Deployment readiness|Deployment state/i.test(surfacesJs5k)) {
  throw new Error("Governance surfaces must not use deployment workflow terminology for objectives");
}
if (!surfacesJs5k.includes("Execution objective") || !surfacesJs5k.includes("Governed outcome")) {
  throw new Error("Governance surfaces must use execution intent presentation language");
}

const phase5lFiles = [
  "public/components/executia-execution-trust.js",
  "public/components/executia-execution-trust.css",
  "docs/governance/execution-trust.md",
  ".cursor/context/execution-trust.md"
];
for (const file of phase5lFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5L execution trust file: ${file}`);
  }
}

if (!engHtml5a.includes("executia-execution-trust.js")) {
  throw new Error("Engineering console must load executia-execution-trust.js");
}
if (!engHtml5a.includes("ex-trust-enabled")) {
  throw new Error("Engineering console must enable execution trust layer");
}
if (!engHtml5a.includes("applyTrust")) {
  throw new Error("Engineering console must apply execution trust on governed refresh");
}

const trustJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-execution-trust.js"),
  "utf8"
);
if (!trustJs.includes("TRUST MAINTAINED") || !trustJs.includes("applyTrust")) {
  throw new Error("Execution trust must define institutional frames and applyTrust");
}
if (!trustJs.includes("EXECUTION RELIABILITY VERIFIED") || !trustJs.includes("STRUCTURAL INTEGRITY ACTIVE")) {
  throw new Error("Execution trust must define reliability and structural integrity language");
}
if (!trustJs.includes("execution reliability")) {
  throw new Error("Execution trust must define primary hierarchy tier");
}
if (/feel safe|you can trust|success!|congratulations|reassur/i.test(trustJs)) {
  throw new Error("Execution trust must avoid marketing and emotional reassurance wording");
}

if (!governedCss.includes("executia-execution-trust.css")) {
  throw new Error("Governed presentation bundle must import execution trust CSS");
}

const surfacesJs5l = readFileSync(
  join(__test_dir, "..", "public/components/engineering-governance-surfaces.js"),
  "utf8"
);
if (!surfacesJs5l.includes("Structural execution reliability") || !surfacesJs5l.includes("Trust maintained")) {
  throw new Error("Governance surfaces must use execution trust presentation language");
}

const phase5mFiles = [
  "public/components/executia-execution-sovereignty.js",
  "public/components/executia-execution-sovereignty.css",
  "docs/governance/execution-sovereignty.md",
  ".cursor/context/execution-sovereignty.md"
];
for (const file of phase5mFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 5M execution sovereignty file: ${file}`);
  }
}

if (!engHtml5a.includes("executia-execution-sovereignty.js")) {
  throw new Error("Engineering console must load executia-execution-sovereignty.js");
}
if (!engHtml5a.includes("ex-sovereignty-enabled")) {
  throw new Error("Engineering console must enable execution sovereignty layer");
}
if (!engHtml5a.includes("applySovereignty")) {
  throw new Error("Engineering console must apply execution sovereignty on governed refresh");
}

const sovereigntyJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-execution-sovereignty.js"),
  "utf8"
);
if (!sovereigntyJs.includes("EXECUTION AUTHORITY ACTIVE") || !sovereigntyJs.includes("applySovereignty")) {
  throw new Error("Execution sovereignty must define institutional frames and applySovereignty");
}
if (
  !sovereigntyJs.includes("CANONICAL JURISDICTION VERIFIED") ||
  !sovereigntyJs.includes("EXECUTION SUPREMACY MAINTAINED")
) {
  throw new Error("Execution sovereignty must define jurisdiction and supremacy language");
}
if (!sovereigntyJs.includes("execution authority")) {
  throw new Error("Execution sovereignty must define primary hierarchy tier");
}
if (/enterprise platform|orchestration software|governance application|operational tool/i.test(sovereigntyJs)) {
  throw new Error("Execution sovereignty must avoid platform and tooling terminology");
}

if (!governedCss.includes("executia-execution-sovereignty.css")) {
  throw new Error("Governed presentation bundle must import execution sovereignty CSS");
}

const surfacesJs5m = readFileSync(
  join(__test_dir, "..", "public/components/engineering-governance-surfaces.js"),
  "utf8"
);
if (
  !surfacesJs5m.includes("Canonical execution jurisdiction") ||
  !surfacesJs5m.includes("Execution authority active")
) {
  throw new Error("Governance surfaces must use execution sovereignty presentation language");
}

const phase6aFiles = [
  "public/components/executia-canonical-compression.js",
  "public/components/executia-canonical-compression.css",
  "docs/governance/canonical-compression.md",
  ".cursor/context/canonical-compression.md"
];
for (const file of phase6aFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 6A canonical compression file: ${file}`);
  }
}

if (!engHtml5a.includes("executia-canonical-compression.js")) {
  throw new Error("Engineering console must load executia-canonical-compression.js");
}
if (!engHtml5a.includes("ex-compression-enabled")) {
  throw new Error("Engineering console must enable canonical compression layer");
}
if (!engHtml5a.includes("applyCompression")) {
  throw new Error("Engineering console must apply canonical compression on governed refresh");
}

const compressionJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-canonical-compression.js"),
  "utf8"
);
if (!compressionJs.includes("CANONICAL") || !compressionJs.includes("applyCompression")) {
  throw new Error("Canonical compression must define language core and applyCompression");
}
if (!compressionJs.includes("canonicalPostureBlock") || !compressionJs.includes("Governed · calm · inevitable")) {
  throw new Error("Canonical compression must define inevitability posture framing");
}
if (!compressionJs.includes("DISPLAY_MAX")) {
  throw new Error("Canonical compression must cap presentation frame density");
}

if (!governedCss.includes("executia-canonical-compression.css")) {
  throw new Error("Governed presentation bundle must import canonical compression CSS");
}

const surfacesJs6a = readFileSync(
  join(__test_dir, "..", "public/components/engineering-governance-surfaces.js"),
  "utf8"
);
if (!surfacesJs6a.includes("postureBlocks") || !surfacesJs6a.includes("canonicalPostureBlock")) {
  throw new Error("Governance surfaces must use canonical compression posture blocks");
}

const coreJs6a = readFileSync(
  join(__test_dir, "..", "public/components/executia-governance-core.js"),
  "utf8"
);
if (!coreJs6a.includes("Governed · calm · inevitable")) {
  throw new Error("Governance core must use compressed inevitability language");
}

const phase6bFiles = [
  "services/execution-state-transition.js",
  "services/execution-commit-flow.js",
  "services/execution-replay.js",
  "api/v1/execution/transition.js",
  "public/components/executia-execution-surfaces.js",
  "public/components/executia-execution-surfaces.css",
  "docs/governance/real-execution-mechanics.md",
  ".cursor/context/real-execution-mechanics.md"
];
for (const file of phase6bFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 6B real execution mechanics file: ${file}`);
  }
}

const {
  assertExecutionTransition,
  EXECUTION_SEMANTICS,
  OPERATOR_ACTIONS,
  resolveOperatorAction
} = await import("../services/execution-state-transition.js");

assertExecutionTransition("PENDING_REVIEW", OPERATOR_ACTIONS.APPROVE);
assertExecutionTransition("PENDING_REVIEW", OPERATOR_ACTIONS.REJECT);
if (resolveOperatorAction("APPROVE") !== "APPROVE") {
  throw new Error("Expected APPROVE action resolution");
}

let invalidTransition = false;
try {
  assertExecutionTransition("APPROVED", OPERATOR_ACTIONS.REJECT);
} catch (e) {
  invalidTransition = e.code === "INVALID_EXECUTION_STATUS";
}
if (!invalidTransition) {
  throw new Error("Expected invalid transition from APPROVED via REJECT");
}

const { buildCommitFlowPlan, COMMIT_FLOW_STAGES } = await import("../services/execution-commit-flow.js");
const plan = buildCommitFlowPlan(OPERATOR_ACTIONS.APPROVE);
if (!plan.includes("REPLAY_SAFE") || !COMMIT_FLOW_STAGES.includes("VALIDATED")) {
  throw new Error("Commit flow plan must include validated and replay safe canonical stages");
}

const { buildDeterministicReplay: buildDeterministicReplay6b } = await import("../services/execution-replay.js");
const dryReplay = buildDeterministicReplay6b({
  execution_id: "dry-run-id",
  execution: { status: "APPROVED", hash: "abc", prev_hash: "gen" },
  audit_events_count: 1,
  ledger_entries_count: 1
});
if (dryReplay.canonical_replay_result !== "REPLAY_SAFE") {
  throw new Error("Deterministic replay must resolve REPLAY_SAFE when checks pass");
}

const surfacesJs6b = readFileSync(
  join(__test_dir, "..", "public/components/executia-execution-surfaces.js"),
  "utf8"
);
if (!surfacesJs6b.includes("Execution Approval Surface") || !surfacesJs6b.includes("CANONICAL EXECUTION FLOW")) {
  throw new Error("Execution surfaces must define canonical operator surfaces");
}

const phase6cFiles = [
  "shared/canonical-execution-semantics.js",
  "services/canonical-execution-semantics.js",
  "public/components/executia-canonical-semantics.js",
  "docs/governance/execution-semantics.md",
  ".cursor/context/execution-semantics.md"
];
for (const file of phase6cFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing Phase 6C canonical execution semantics file: ${file}`);
  }
}

const {
  CANONICAL_STATE,
  CANONICAL_ACTION,
  resolveCanonicalAction,
  canonicalStateForStatus,
  buildCanonicalTransitionMeta,
  STATE_SEMANTICS,
  COMMIT_FLOW_CANONICAL
} = await import("../shared/canonical-execution-semantics.js");

if (resolveCanonicalAction("REJECT") !== CANONICAL_ACTION.BLOCK) {
  throw new Error("REJECT must alias to canonical BLOCK");
}
if (resolveCanonicalAction("VERIFY_REPLAY") !== CANONICAL_ACTION.REPLAY) {
  throw new Error("VERIFY_REPLAY must alias to canonical REPLAY");
}
if (canonicalStateForStatus("PENDING_REVIEW") !== CANONICAL_STATE.PENDING_REVIEW) {
  throw new Error("PENDING_REVIEW must map to canonical state");
}
if (!STATE_SEMANTICS[CANONICAL_STATE.COMMITTED]?.consequence) {
  throw new Error("COMMITTED state must define consequence semantics");
}

const meta6c = buildCanonicalTransitionMeta({
  action: "APPROVE",
  previous_state: "PENDING_REVIEW",
  next_state: "APPROVED"
});
if (meta6c.canonical_action !== CANONICAL_ACTION.APPROVE) {
  throw new Error("Transition meta must carry canonical action");
}
if (!meta6c.jurisdiction?.SCOPE) {
  throw new Error("Transition meta must include operator jurisdiction");
}

const transitionJs6c = readFileSync(
  join(__test_dir, "..", "services/execution-state-transition.js"),
  "utf8"
);
if (!transitionJs6c.includes("canonical-execution-semantics")) {
  throw new Error("execution-state-transition must import canonical semantics");
}

const { buildTransitionPayload } = await import("../services/execution-state-transition.js");
const payload6c = buildTransitionPayload({
  action: "COMMIT",
  previous_state: "APPROVED",
  next_state: "COMMITTED",
  actor: "operator@test"
});
if (!payload6c.canonical || payload6c.canonical_action !== CANONICAL_ACTION.COMMIT) {
  throw new Error("Transition payload must embed canonical block");
}

if (!COMMIT_FLOW_CANONICAL.includes(CANONICAL_STATE.REPLAY_SAFE)) {
  throw new Error("Commit flow canonical stages must end at REPLAY_SAFE");
}

const operatorHtml6c = readFileSync(join(__test_dir, "..", "public/console/operator.html"), "utf8");
if (!operatorHtml6c.includes("executia-canonical-semantics.js")) {
  throw new Error("Operator console must load canonical semantics before execution surfaces");
}

const phaseInstitutionalFiles = [
  "public/components/executia-institutional-surfaces.js",
  "public/components/executia-institutional-environment.js",
  "public/components/executia-institutional-environment.css",
  "docs/governance/institutional-multi-surface.md",
  ".cursor/context/institutional-multi-surface.md",
  "docs/governance/institutional-completion.md",
  ".cursor/context/institutional-completion.md"
];
for (const file of phaseInstitutionalFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing institutional completion file: ${file}`);
  }
}

const envJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-institutional-environment.js"),
  "utf8"
);
if (!envJs.includes("INSTITUTIONAL") && !envJs.includes("FLOW")) {
  throw new Error("Institutional environment must define flow architecture");
}
const surfacesJsInstitutional = readFileSync(
  join(__test_dir, "..", "public/components/executia-institutional-surfaces.js"),
  "utf8"
);
for (const surface of [
  "Execution",
  "Governance",
  "Proof",
  "Replay",
  "Health",
  "Operations",
  "Engineering",
  "Request"
]) {
  if (!surfacesJsInstitutional.includes(`label: "${surface}"`)) {
    throw new Error(`Institutional surfaces registry must include ${surface}`);
  }
}
if (!surfacesJsInstitutional.includes("engineHome: true")) {
  throw new Error("Execution surface must remain canonical engine home");
}

const entryHtml = readFileSync(join(__test_dir, "..", "public/index.html"), "utf8");
if (entryHtml.includes('refresh') && entryHtml.includes("execution-test")) {
  throw new Error("Entry page must not be redirect-only stub");
}
if (!entryHtml.includes("ex-institutional-env") || !entryHtml.includes("executia-institutional-environment")) {
  throw new Error("Entry page must use institutional environment");
}

for (const publicPage of [
  "public/execution-test/index.html",
  "public/public-proof/index.html",
  "public/execution-demo.html",
  "public/proof-explorer/index.html",
  "public/health/index.html"
]) {
  const html = readFileSync(join(__test_dir, "..", publicPage), "utf8");
  if (!html.includes("ex-institutional-env") || !html.includes("data-ex-env-header")) {
    throw new Error(`${publicPage} must mount institutional environment`);
  }
  if (!html.includes("executia-institutional-surfaces.js")) {
    throw new Error(`${publicPage} must load canonical institutional surfaces registry`);
  }
}

for (const publicationPage of [
  "public/demonstration/index.html",
  "public/request-pilot/index.html"
]) {
  const html = readFileSync(join(__test_dir, "..", publicationPage), "utf8");
  if (!html.includes("ex-institutional-env") || !html.includes("ex-institutional-publication")) {
    throw new Error(`${publicationPage} must use institutional publication envelope`);
  }
  if (html.includes("data-ex-env-header")) {
    throw new Error(`${publicationPage} must not mount website header on publication annex`);
  }
  if (!html.includes("executia-institutional-surfaces.js")) {
    throw new Error(`${publicationPage} must load canonical institutional surfaces registry`);
  }
}

const productCompletionFiles = [
  "docs/governance/institutional-product-completion.md",
  ".cursor/context/institutional-product-completion.md"
];
for (const file of productCompletionFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing institutional product completion file: ${file}`);
  }
}

if (!envJs.includes("AI_CLARITY") || !envJs.includes("DEMO_FLOW")) {
  throw new Error("Institutional environment must define AI clarity and demo flow");
}
if (!envJs.includes("Execution Governance Infrastructure") || !envJs.includes("Execution-Time Truth")) {
  throw new Error("AI clarity must use Execution Governance Infrastructure and Execution-Time Truth");
}
if (!envJs.includes("ex-env-flow-institutional") || !envJs.includes("ex-env-flow-operational")) {
  throw new Error("Institutional header must separate institutional and operational surfaces");
}

const entryHtmlProduct = readFileSync(join(__test_dir, "..", "public/index.html"), "utf8");
if (!entryHtmlProduct.includes("data-ex-env-hero")) {
  throw new Error("Homepage must mount canonical hero via data-ex-env-hero");
}
if (entryHtmlProduct.includes("data-ex-env-pillars")) {
  throw new Error("Homepage must use compressed hero not legacy pillars mount");
}

const demoHtml = readFileSync(join(__test_dir, "..", "public/execution-demo.html"), "utf8");
if (!demoHtml.includes("data-ex-env-demo-flow") || !envJs.includes("PROOF_VERIFIED")) {
  throw new Error("Execution demo must use canonical demo flow through proof verified");
}
if (demoHtml.includes("engine-shell.js")) {
  throw new Error("Execution demo must not duplicate engine-shell header");
}

const proofHtml = readFileSync(join(__test_dir, "..", "public/public-proof/index.html"), "utf8");
if (!proofHtml.includes("data-ex-env-proof-intro")) {
  throw new Error("Public proof must mount proof intro band");
}

const requestPilotHtml = readFileSync(join(__test_dir, "..", "public/request-pilot/index.html"), "utf8");
if (!requestPilotHtml.includes("Administrative Annex") || !requestPilotHtml.includes("Administrative Request Fields")) {
  throw new Error("Request pilot must present administrative annex publication structure");
}
if (requestPilotHtml.includes("<form") || requestPilotHtml.includes("<button")) {
  throw new Error("Request pilot must not use lead-generation form UI");
}
if (requestPilotHtml.includes("executia-assessment-demo.css")) {
  throw new Error("Request pilot must not load assessment demo stylesheet");
}

const finalRefinementFiles = [
  "docs/governance/final-institutional-refinement.md",
  ".cursor/context/final-institutional-refinement.md"
];
for (const file of finalRefinementFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing final institutional refinement file: ${file}`);
  }
}

const envJsFinal = readFileSync(
  join(__test_dir, "..", "public/components/executia-institutional-environment.js"),
  "utf8"
);
if (!envJsFinal.includes("Enter Execution") || !envJsFinal.includes("Request Pilot")) {
  throw new Error("Homepage hero must expose Enter Execution and Request Pilot CTAs");
}
if (!envJsFinal.includes("ex-env-home-engine") || !envJsFinal.includes("ex-env-surface-orchestration")) {
  throw new Error("Homepage must restore full institutional orchestration sections");
}
if (!envJsFinal.includes("ex-env-home-orchestration")) {
  throw new Error("Homepage must show execution hierarchy orchestration ladder");
}
if (!envJsFinal.includes("ENGINE_IDENTITY") && !envJsFinal.includes("Execution Engine")) {
  throw new Error("Homepage must expose Execution Engine identity");
}
if (!envJsFinal.includes("Proof Engine") && !demoHtml.includes("Proof Engine")) {
  throw new Error("Execution demo must be branded as Proof Engine");
}

const pilotReadinessFiles = [
  "public/components/executia-pilot-readiness.js",
  "docs/governance/pilot-readiness.md",
  ".cursor/context/pilot-readiness.md"
];
for (const file of pilotReadinessFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing pilot readiness file: ${file}`);
  }
}

const pilotJs = readFileSync(
  join(__test_dir, "..", "public/components/executia-pilot-readiness.js"),
  "utf8"
);
if (!pilotJs.includes("Procurement Governance") || !pilotJs.includes("Payment Approval Governance")) {
  throw new Error("Pilot readiness must define canonical institutional examples");
}
if (!pilotJs.includes("Replay-Safe Verification") || !pilotJs.includes("STATE_LABELS")) {
  throw new Error("Pilot readiness must define replay semantics and state labels");
}

const proofHtmlPilot = readFileSync(join(__test_dir, "..", "public/public-proof/index.html"), "utf8");
if (!proofHtmlPilot.includes("data-ex-env-proof-examples") || !proofHtmlPilot.includes("executia-pilot-readiness")) {
  throw new Error("Public proof must mount replay-safe proof examples");
}

if (!demoHtml.includes("demoScenario") || !demoHtml.includes("executia-pilot-readiness")) {
  throw new Error("Proof engine demo must use pilot scenario selector");
}

const aiOperatorFiles = [
  ".cursor/context/ai-operator-governance.md",
  ".cursor/context/vendor-operations.md",
  ".cursor/rules/ai-operator-governance.mdc",
  ".cursor/rules/vendor-safety.mdc",
  "scripts/phase-ai-operator-check.js",
  "docs/governance/ai-operator-governance.md"
];
for (const file of aiOperatorFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing AI operator governance file: ${file}`);
  }
}

const operatorCtx = readFileSync(
  join(__test_dir, "..", ".cursor/context/ai-operator-governance.md"),
  "utf8"
);
if (!operatorCtx.includes("Never guess production state")) {
  throw new Error("AI operator governance must forbid guessing production state");
}

const vendorCtx = readFileSync(join(__test_dir, "..", ".cursor/context/vendor-operations.md"), "utf8");
if (!vendorCtx.includes("dnyaancdvdsibbkdjdor") || !vendorCtx.includes("vercel --prod")) {
  throw new Error("Vendor operations must document Supabase project and Vercel deploy");
}

const operatorRule = readFileSync(
  join(__test_dir, "..", ".cursor/rules/ai-operator-governance.mdc"),
  "utf8"
);
if (!operatorRule.includes("Reproduce") || !operatorRule.includes("curl -i")) {
  throw new Error("AI operator rule must define error flow and production verify");
}

const preDeployHook = readFileSync(
  join(__test_dir, "..", ".cursor/hooks/pre-deploy-check.sh"),
  "utf8"
);
if (!preDeployHook.includes("phase-ai-operator-check.js")) {
  throw new Error("Pre-deploy hook must run phase-ai-operator-check.js");
}

const hardGovernanceFiles = [
  ".cursor/rules/executia-hard-governance.mdc",
  ".cursor/context/hard-governance-rules.md",
  "docs/governance/hard-governance-rules.md"
];
for (const file of hardGovernanceFiles) {
  if (!existsSync(join(__test_dir, "..", file))) {
    throw new Error(`Missing hard governance file: ${file}`);
  }
}

const hardRule = readFileSync(
  join(__test_dir, "..", ".cursor/rules/executia-hard-governance.mdc"),
  "utf8"
);
if (!hardRule.includes("alwaysApply: true")) {
  throw new Error("Hard governance rule must always apply");
}
if (!hardRule.includes("REQUEST") || !hardRule.includes("CONTINUITY")) {
  throw new Error("Hard governance must enforce canonical execution flow");
}
if (!hardRule.includes("Must not change") || !hardRule.includes("executia-design-system.css")) {
  throw new Error("Hard governance must require must-not-change and design system");
}

const hardDoc = readFileSync(
  join(__test_dir, "..", "docs/governance/hard-governance-rules.md"),
  "utf8"
);
if (!/institutional consistency over feature expansion/i.test(hardDoc)) {
  throw new Error("Hard governance doc must prioritize institutional consistency");
}

/* Artifact retention & stability layer */
const artifactGovSrc = readFileSync(
  join(__test_dir, "..", "services/artifact-governance.js"),
  "utf8"
);
if (artifactGovSrc.includes("unlinkSync")) {
  throw new Error("Artifact governance must archive rotated snapshots, not unlink");
}
if (!artifactGovSrc.includes('archiveSubdir: "archive"')) {
  throw new Error("Artifact governance must use per-directory archive/ subdirs");
}
if (!existsSync(join(__test_dir, "..", "docs/governance/artifact-retention.md"))) {
  throw new Error("Missing artifact retention strategy doc");
}
if (!existsSync(join(__test_dir, "..", ".cursor/context/artifact-retention.md"))) {
  throw new Error("Missing .cursor/context/artifact-retention.md");
}

for (const artifactDir of ["architecture-graph", "engineering-ledger", "execution-intelligence"]) {
  for (const canonical of ["latest.json", "report.md", "last-stable.json"]) {
    if (!existsSync(join(__test_dir, "..", artifactDir, canonical))) {
      throw new Error(`Stabilization: missing canonical ${artifactDir}/${canonical}`);
    }
  }
}

const { mkdtempSync, writeFileSync: writeTmp, rmSync } = await import("node:fs");
const { tmpdir } = await import("node:os");
const { join: joinPath } = await import("node:path");
const rotTmp = mkdtempSync(joinPath(tmpdir(), "executia-artifact-rot-"));
const rotDir = joinPath(rotTmp, "test-artifacts");
mkdirSync(rotDir, { recursive: true });
for (let i = 0; i < 10; i++) {
  const stamp = `2026-01-0${i}-T00-00-00-00${i}Z.json`;
  writeTmp(joinPath(rotDir, stamp), JSON.stringify({ i }), "utf8");
}
const archived = rotateStampedSnapshots(rotDir, 8);
if (archived.length !== 2) {
  throw new Error(`rotateStampedSnapshots must archive 2 excess files, got ${archived.length}`);
}
const kept = readdirSync(rotDir, { withFileTypes: true })
  .filter((e) => e.isFile() && /^202/.test(e.name))
  .length;
if (kept !== 8) {
  throw new Error(`rotateStampedSnapshots must keep 8 stamped files, got ${kept}`);
}
if (!existsSync(joinPath(rotDir, "archive"))) {
  throw new Error("rotateStampedSnapshots must create <artifactDir>/archive/");
}
for (const artifactDir of ["architecture-graph", "engineering-ledger", "execution-intelligence"]) {
  const latest = readJsonSafe(join(__test_dir, "..", artifactDir, "latest.json"));
  if (!latest?.generated_at && !latest?.branch) {
    throw new Error(`Retention: ${artifactDir}/latest.json must be valid governed JSON`);
  }
  const report = readFileSync(join(__test_dir, "..", artifactDir, "report.md"), "utf8");
  if (!report.trim()) {
    throw new Error(`Retention: ${artifactDir}/report.md must be non-empty`);
  }
}
rmSync(rotTmp, { recursive: true, force: true });

const flowExpect = [
  "REQUESTED",
  "VALIDATED",
  "PENDING_REVIEW",
  "COMMITTED",
  "REPLAY_SAFE"
];
for (const state of flowExpect) {
  if (!COMMIT_FLOW_CANONICAL.includes(state)) {
    throw new Error(`Canonical commit flow must include ${state}`);
  }
}
for (const action of ["VALIDATE", "COMMIT", "VERIFY", "REPLAY"]) {
  if (!CANONICAL_ACTION[action]) {
    throw new Error(`Canonical execution flow must define action ${action}`);
  }
}

console.log("EXECUTIA final full layer tests OK");
