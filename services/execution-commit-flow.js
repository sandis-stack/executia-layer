/**
 * EXECUTIA Execution Commit Flow (Phase 6B).
 * REQUEST → VALIDATION → GOVERNANCE REVIEW → EXECUTION COMMIT → CANONICAL RECORD → REPLAY SAFE
 */
import { db, hasSupabaseEnv } from "./db.js";
import {
  canonicalExecutionId,
  commitOperatorTerminalDecision,
  fetchOperatorExecution,
  OperatorDecisionError
} from "./execution.js";
import { EXECUTIA_STATUSES } from "../shared/statuses.js";
import { buildDeterministicReplay, loadExecutionReplayReadOnly } from "./execution-replay.js";
import {
  CANONICAL_STATE,
  COMMIT_FLOW_CANONICAL,
  PROOF_SEMANTICS,
  REPLAY_SEMANTICS,
  semanticsForAction
} from "../shared/canonical-execution-semantics.js";
import {
  assertExecutionTransition,
  buildTransitionPayload,
  EXECUTION_VERIFICATION_PHASE,
  isTerminalOperatorAction,
  OPERATOR_ACTIONS,
  resolveOperatorAction
} from "./execution-state-transition.js";
import { writeAuditEvent } from "./audit.js";

export const COMMIT_FLOW_STAGES = COMMIT_FLOW_CANONICAL;

function stageRecord(stage, state, detail = null) {
  return {
    stage,
    state,
    detail,
    at: new Date().toISOString()
  };
}

export function buildCommitFlowPlan(action) {
  const normalized = resolveOperatorAction(action);
  const stages = [
    CANONICAL_STATE.REQUESTED,
    CANONICAL_STATE.VALIDATED,
    CANONICAL_STATE.PENDING_REVIEW
  ];

  if (normalized === OPERATOR_ACTIONS.APPROVE || normalized === OPERATOR_ACTIONS.COMMIT) {
    stages.push(CANONICAL_STATE.COMMITTED, CANONICAL_STATE.VERIFIED, CANONICAL_STATE.REPLAY_SAFE);
  } else if (normalized === OPERATOR_ACTIONS.REJECT) {
    stages.push(CANONICAL_STATE.BLOCKED);
  }

  return stages;
}

async function assessReplaySafe(execution_id, organization_id) {
  const loaded = await loadExecutionReplayReadOnly({ execution_id, organization_id });
  const replay = buildDeterministicReplay({
    execution_id,
    execution: loaded.execution,
    audit_events_count: loaded.audit_events_count,
    ledger_entries_count: loaded.ledger_entries_count
  });

  return {
    replay_safe: replay.canonical_replay_result === "REPLAY_SAFE",
    canonical_replay_result: replay.canonical_replay_result,
    deterministic_checks: replay.deterministic_checks,
    replay_mode: replay.replay_mode
  };
}

async function materializeProofGovernance(execution_id, operator, previous_state, next_state) {
  const auditResult = await writeAuditEvent({
    execution_id,
    event_type: "PROOF_GOVERNANCE_RECORDED",
    actor: operator?.email || "operator",
    actor_email: operator?.email || null,
    actor_role: operator?.role || "OPERATOR",
    previous_state,
    next_state,
    metadata: {
      source: "execution_commit_flow",
      semantics: semanticsForAction(OPERATOR_ACTIONS.VERIFY_PROOF)
    }
  });

  return auditResult.auditEvent;
}

/**
 * Governed operator transition with institutional commit flow trace.
 */
export async function runExecutionCommitFlow({
  execution_id,
  action,
  reason = "",
  operator,
  organization_id = null,
  supabase = db()
}) {
  const normalized = resolveOperatorAction(action);
  const stages = [];
  const plan = buildCommitFlowPlan(normalized);

  stages.push(
    stageRecord(CANONICAL_STATE.REQUESTED, "RECEIVED", { execution_id, action: normalized }),
    stageRecord(CANONICAL_STATE.VALIDATED, "GOVERNED", { execution_id })
  );

  let executionRow = null;

  if (hasSupabaseEnv()) {
    executionRow = await fetchOperatorExecution(supabase, { execution_id, organization_id });
  } else {
    executionRow = {
      execution_id,
      id: execution_id,
      status: EXECUTIA_STATUSES.PENDING_REVIEW
    };
  }

  const previous_state = executionRow.status || EXECUTIA_STATUSES.PENDING_REVIEW;
  const transitionSpec = assertExecutionTransition(previous_state, normalized);

  stages.push(
    stageRecord(CANONICAL_STATE.PENDING_REVIEW, "ACTIVE", {
      from: previous_state,
      to: transitionSpec.to
    })
  );

  if (normalized === OPERATOR_ACTIONS.VERIFY_REPLAY) {
    const rpcExecutionId = canonicalExecutionId(executionRow);
    const replay = await assessReplaySafe(rpcExecutionId, organization_id);
    stages.push(
      stageRecord(CANONICAL_STATE.REPLAY_SAFE, replay.replay_safe ? REPLAY_SEMANTICS.RESULT_SAFE : REPLAY_SEMANTICS.RESULT_CHECK, replay)
    );
    const transition = buildTransitionPayload({
      action: normalized,
      previous_state,
      next_state: previous_state,
      actor: operator?.email || "operator",
      reason,
      extra: { commit_flow: stages, replay }
    });
    return {
      ok: true,
      execution_id: rpcExecutionId,
      action: normalized,
      previous_state,
      next_state: previous_state,
      verification_phase: replay.replay_safe ? EXECUTION_VERIFICATION_PHASE : null,
      semantics: transition.semantics,
      transition,
      commit_flow: { stages, plan },
      replay,
      execution: executionRow,
      materialized: false
    };
  }

  if (normalized === OPERATOR_ACTIONS.VERIFY_PROOF) {
    const rpcExecutionId = canonicalExecutionId(executionRow);
    const proof_event = await materializeProofGovernance(
      rpcExecutionId,
      operator,
      previous_state,
      previous_state
    );
    stages.push(
      stageRecord(CANONICAL_STATE.VERIFIED, PROOF_SEMANTICS.VERIFICATION, {
        proof_event_id: proof_event?.id,
        authority: PROOF_SEMANTICS.AUTHORITY
      })
    );
    const transition = buildTransitionPayload({
      action: normalized,
      previous_state,
      next_state: previous_state,
      actor: operator?.email || "operator",
      reason,
      extra: { commit_flow: stages, proof_event_id: proof_event?.id }
    });
    return {
      ok: true,
      execution_id: rpcExecutionId,
      action: normalized,
      previous_state,
      next_state: previous_state,
      verification_phase: EXECUTION_VERIFICATION_PHASE,
      semantics: transition.semantics,
      transition,
      commit_flow: { stages, plan },
      execution: executionRow,
      materialized: false
    };
  }

  let commitResult = null;
  let next_state = transitionSpec.to;
  let replay = null;
  let proof_event = null;

  if (normalized === OPERATOR_ACTIONS.COMMIT) {
    if (previous_state !== EXECUTIA_STATUSES.APPROVED) {
      throw new OperatorDecisionError(
        "INVALID_EXECUTION_STATUS",
        "Only APPROVED executions can commit to canonical record.",
        409
      );
    }

    if (hasSupabaseEnv()) {
      const { error: updateError } = await supabase
        .from("execution_results")
        .update({
          status: EXECUTIA_STATUSES.COMMITTED,
          decision: "APPROVE",
          reason: reason || "EXECUTION_COMMITTED",
          updated_at: new Date().toISOString()
        })
        .eq("id", executionRow.id);

      if (updateError) {
        throw new OperatorDecisionError("STATE_UPDATE_FAILED", updateError.message, 500);
      }

      executionRow = await fetchOperatorExecution(supabase, { execution_id, organization_id });
    }

    next_state = EXECUTIA_STATUSES.COMMITTED;
    const rpcExecutionId = canonicalExecutionId(executionRow);

    stages.push(
      stageRecord(CANONICAL_STATE.COMMITTED, "COMMITTED", { status: next_state }),
      stageRecord(CANONICAL_STATE.VERIFIED, PROOF_SEMANTICS.VERIFICATION, null)
    );

    replay = await assessReplaySafe(rpcExecutionId, organization_id);
    stages.push(
      stageRecord(CANONICAL_STATE.REPLAY_SAFE, replay.replay_safe ? REPLAY_SEMANTICS.RESULT_SAFE : REPLAY_SEMANTICS.RESULT_CHECK, {
        canonical_replay_result: replay.canonical_replay_result,
        mode: REPLAY_SEMANTICS.MODE
      })
    );

    const transition = buildTransitionPayload({
      action: normalized,
      previous_state,
      next_state,
      actor: operator?.email || "operator",
      reason,
      extra: { commit_flow: stages, replay }
    });

    return {
      ok: true,
      execution_id: rpcExecutionId,
      action: normalized,
      previous_state,
      next_state,
      verification_phase: EXECUTION_VERIFICATION_PHASE,
      semantics: transition.semantics,
      transition,
      commit_flow: { stages, plan },
      replay,
      execution: executionRow,
      materialized: true
    };
  }

  if (isTerminalOperatorAction(normalized)) {
    commitResult = await commitOperatorTerminalDecision({
      supabase,
      execution_id,
      decision: normalized === OPERATOR_ACTIONS.APPROVE ? "APPROVE" : "REJECT",
      actor: operator?.email || "operator",
      reason,
      organization_id,
      operator,
      enrichMetadata: true,
      supplementalAudit: true,
      materializeCoreLedger: normalized === OPERATOR_ACTIONS.APPROVE
    });

    next_state = commitResult.status;
    const rpcExecutionId = canonicalExecutionId(commitResult.execution);

    stages.push(
      stageRecord(CANONICAL_STATE.COMMITTED, "MATERIALIZED", {
        status: next_state,
        decision: commitResult.decision
      })
    );

    if (commitResult.core_ledger) {
      stages.push(
        stageRecord(CANONICAL_STATE.VERIFIED, PROOF_SEMANTICS.VERIFICATION, {
          core_ledger_id: commitResult.core_ledger?.id || null
        })
      );
    } else if (plan.includes(CANONICAL_STATE.VERIFIED)) {
      stages.push(stageRecord(CANONICAL_STATE.VERIFIED, "PENDING", null));
    }

    if (normalized === OPERATOR_ACTIONS.APPROVE) {
      proof_event = await materializeProofGovernance(
        rpcExecutionId,
        operator,
        previous_state,
        next_state
      );
      replay = await assessReplaySafe(rpcExecutionId, organization_id);
      stages.push(
        stageRecord(
          CANONICAL_STATE.REPLAY_SAFE,
          replay.replay_safe ? REPLAY_SEMANTICS.RESULT_SAFE : REPLAY_SEMANTICS.RESULT_CHECK,
          { canonical_replay_result: replay.canonical_replay_result, mode: REPLAY_SEMANTICS.MODE }
        )
      );
    }
  } else if (hasSupabaseEnv()) {
    const { error: updateError } = await supabase
      .from("execution_results")
      .update({ status: next_state })
      .eq("id", executionRow.id);

    if (updateError) {
      throw new OperatorDecisionError("STATE_UPDATE_FAILED", updateError.message, 500);
    }

    stages.push(stageRecord(CANONICAL_STATE.PENDING_REVIEW, "HELD", { status: next_state }));
  } else {
    stages.push(stageRecord(CANONICAL_STATE.PENDING_REVIEW, "DRY_RUN", { status: next_state }));
  }

  const verification_phase =
    next_state === EXECUTIA_STATUSES.APPROVED ||
    next_state === EXECUTIA_STATUSES.COMMITTED ||
    replay?.replay_safe
      ? EXECUTION_VERIFICATION_PHASE
      : executionRow.reconciliation_state === EXECUTION_VERIFICATION_PHASE
        ? EXECUTION_VERIFICATION_PHASE
        : null;

  const transition = buildTransitionPayload({
    action: normalized,
    previous_state,
    next_state,
    actor: operator?.email || "operator",
    reason,
    extra: {
      commit_flow: stages,
      replay,
      proof_event_id: proof_event?.id || null
    }
  });

  return {
    ok: true,
    execution_id: canonicalExecutionId(commitResult?.execution || executionRow),
    action: normalized,
    previous_state,
    next_state,
    verification_phase,
    semantics: transition.semantics,
    transition,
    commit_flow: {
      stages,
      plan
    },
    replay,
    execution: commitResult?.execution || executionRow,
    core_ledger: commitResult?.core_ledger || null,
    materialized: true
  };
}
