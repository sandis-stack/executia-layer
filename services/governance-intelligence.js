export function classifyGovernanceIncident({
  replay = {},
  risk = {}
}) {

  const signals = risk.signals || [];
  const score = Number(risk.score || 0);

  const constitution =
    replay.constitution_triggered === true;

  const stopped =
    replay.stopped === true;

  const recovered =
    replay.recovered === true;

  let incident = "STABLE_RUNTIME";
  let severity = "LOW";
  let containment = "NONE";
  let quorum = "STANDARD";
  let survivability = "STABLE";

  if(score >= 20){
    severity = "MEDIUM";
  }

  if(score >= 40){
    severity = "HIGH";
  }

  if(score >= 70){
    severity = "CRITICAL";
  }

  if(constitution){
    incident = "CONSTITUTIONAL_BREACH";
    containment = "REVIEW_SCOPE";
    quorum = "SUPERVISOR_REQUIRED";
  }

  if(stopped){
    incident = "EXECUTION_CONTAINMENT_EVENT";
    containment = "FREEZE_ENFORCED";
    quorum = "MULTI_ACTOR";
  }

  if(
    constitution &&
    stopped &&
    score >= 40
  ){
    incident = "SYSTEMIC_EXECUTION_RISK";
    containment = "FORENSIC_LOCKDOWN";
    quorum = "FULL_GOVERNANCE_QUORUM";
    survivability = recovered
      ? "RECOVERED"
      : "DEGRADED";
  }

  if(
    severity === "CRITICAL" &&
    !recovered
  ){
    survivability = "UNSTABLE";
  }

  return {
    ok: true,

    incident,
    severity,

    containment,
    quorum,

    survivability,

    recommendations: [
      containment !== "NONE"
        ? `CONTAINMENT:${containment}`
        : null,

      quorum !== "STANDARD"
        ? `QUORUM:${quorum}`
        : null,

      severity === "CRITICAL"
        ? "FORENSIC_SUPERVISION_REQUIRED"
        : null
    ].filter(Boolean),

    signals
  };
}
