import { evaluateRules } from "../engine/rule-evaluator.js";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
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
  "governance_layer",
  "architecture_memory",
  "proof_projection",
  "legacy_projection",
  "local_tooling",
  "engineering_console"
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
const classifiedNodes = graph.nodes.filter((n) => n.classification);
if (classifiedNodes.length < graph.nodes.length * 0.9) {
  throw new Error("Architecture graph nodes must include classification labels");
}

writeGraphOutputs(graph, join(__test_dir, ".."));
if (graph.findings.engineering_console_detected !== true) {
  throw new Error("Architecture graph must set engineering_console_detected === true");
}
const engConsoleNodes = graph.nodes.filter((n) => n.classification === "engineering_console");
if (engConsoleNodes.length < 4) {
  throw new Error("Architecture graph must classify at least 4 engineering_console nodes");
}
if (!graph.findings.summary_counts?.by_layer?.engineering_console) {
  throw new Error("Architecture graph summary_counts.by_layer must include engineering_console");
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
if (!engPayload.engineering_console_detected) {
  throw new Error("Engineering console must be detected when HTML files exist");
}

console.log("EXECUTIA final full layer tests OK");
