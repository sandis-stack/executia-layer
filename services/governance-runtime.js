import { db } from "./db.js";

import {
  verifyGovernanceHashChain
} from "./governance-hash.js";

import {
  calculateGovernanceRisk
} from "./governance-risk.js";

import {
  classifyGovernanceIncident
} from "./governance-intelligence.js";

import {
  assessGovernanceStability
} from "./governance-stability.js";

import {
  buildGovernanceContainmentPlan
} from "./governance-containment.js";

import {
  buildGovernanceRecoveryPlan
} from "./governance-recovery.js";

import {
  orchestrateGovernanceCycle
} from "./governance-orchestrator.js";

function stageForEvent(event) {
  const type = String(event.event_type || "").toUpperCase();

  if (type.includes("CONSTITUTION_BLOCK")) return "CONSTITUTION";
  if (type.includes("FREEZE_CREATED")) return "CONTAINMENT";
  if (type.includes("BLOCKED_BY_FREEZE")) return "STOP";
  if (type.includes("FREEZE_RELEASED")) return "RECOVERY";
  if (type.includes("REVIEW_CREATED")) return "REQUEST";
  if (type.includes("APPROVAL_RECORDED")) return "QUORUM";
  if (type.includes("APPROVED")) return "DECISION";
  if (type.includes("RESUMED")) return "COMMIT";
  if (type.includes("REJECTED")) return "REJECTION";
  if (type.includes("OVERRIDDEN")) return "OVERRIDE";

  return "EVENT";
}

function normalizeGovernanceEvent(event) {
  return {
    source: "governance",
    id: event.id,
    stage: stageForEvent(event),
    type: event.event_type,
    review_id: event.review_id || null,
    execution_id: event.execution_id || null,
    actor: event.actor || null,
    sequence_no: event.sequence_no || null,
    hash: event.hash || null,
    prev_hash: event.prev_hash || null,
    created_at: event.created_at || null,
    payload: event.payload || {}
  };
}

function normalizeFreezeEvent(event) {
  return {
    source: "freeze",
    id: event.id,
    stage: stageForEvent(event),
    type: event.event_type,
    freeze_id: event.freeze_id || null,
    review_id: event.details?.review_id || null,
    execution_id: event.details?.execution_id || null,
    actor: event.actor_email || event.actor_id || null,
    sequence_no: null,
    hash: null,
    prev_hash: null,
    created_at: event.created_at || null,
    payload: event.details || {}
  };
}

function buildReplayPath(events) {
  const order = [
    "REQUEST",
    "CONSTITUTION",
    "CONTAINMENT",
    "STOP",
    "QUORUM",
    "DECISION",
    "RECOVERY",
    "COMMIT"
  ];

  return order
    .map((stage) => {
      const event = events.find((item) => item.stage === stage);
      if (!event) return null;

      return {
        stage,
        type: event.type,
        actor: event.actor,
        time: event.created_at,
        review_id: event.review_id || null,
        execution_id: event.execution_id || null,
        freeze_id: event.freeze_id || null,
        hash: event.hash || null
      };
    })
    .filter(Boolean);
}

export async function buildGovernanceRuntime({
  review_id = null,
  execution_id = null
} = {}) {
  const supabase = db();

  let reviewQuery = supabase
    .from("governance_review_events")
    .select("*")
    .order("created_at", { ascending: true });

  if (review_id) {
    reviewQuery = reviewQuery.eq("review_id", review_id);
  }

  if (execution_id) {
    reviewQuery = reviewQuery.eq("execution_id", execution_id);
  }

  const { data: governanceEvents, error: governanceError } =
    await reviewQuery.limit(500);

  if (governanceError) throw governanceError;

  let freezeQuery = supabase
    .from("governance_freeze_events")
    .select("*")
    .order("created_at", { ascending: true });

  if (review_id) {
    freezeQuery = freezeQuery.or(`details->>review_id.eq.${review_id}`);
  }

  if (execution_id) {
    freezeQuery = freezeQuery.or(`details->>execution_id.eq.${execution_id}`);
  }

  const { data: freezeEvents, error: freezeError } =
    await freezeQuery.limit(500);

  if (freezeError) throw freezeError;

  const replayEvents = [
    ...(governanceEvents || []).map(normalizeGovernanceEvent),
    ...(freezeEvents || []).map(normalizeFreezeEvent)
  ].sort((a, b) =>
    String(a.created_at || "").localeCompare(String(b.created_at || ""))
  );

  const verification = await verifyGovernanceHashChain({
    supabase,
    review_id: review_id || "GLOBAL"
  });

  const replay = {
    stages: buildReplayPath(replayEvents),
    events: replayEvents,
    event_count: replayEvents.length,
    recovered: replayEvents.some((event) => event.stage === "RECOVERY"),
    stopped: replayEvents.some((event) => event.stage === "STOP"),
    constitution_triggered: replayEvents.some((event) => event.stage === "CONSTITUTION")
  };

  const risk = calculateGovernanceRisk({
    verification,
    replay,
    events: replayEvents
  });

  const intelligence = classifyGovernanceIncident({
    replay,
    risk
  });

  const stability = assessGovernanceStability({
    risk,
    intelligence,
    verification,
    replay
  });

  const containment_plan = buildGovernanceContainmentPlan({
    risk,
    intelligence,
    stability,
    verification,
    replay
  });

  const recovery_plan = buildGovernanceRecoveryPlan({
    verification,
    risk,
    intelligence,
    stability,
    containment_plan,
    replay
  });

  const orchestrator = orchestrateGovernanceCycle({
    verification,
    risk,
    intelligence,
    stability,
    containment_plan,
    recovery_plan,
    replay
  });

  return {
    verification,
    risk,
    intelligence,
    stability,
    containment_plan,
    recovery_plan,
    orchestrator,
    replay
  };
}
