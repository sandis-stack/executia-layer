export function calculateGovernanceRisk({
  verification = {},
  replay = {},
  operations = {},
  events = []
} = {}) {
  const signals = [];

  let score = 0;

  const chainBroken = verification?.verified === false;
  const constitutionTriggered =
    replay?.constitution_triggered === true ||
    events.some((event) =>
      String(event.event_type || event.type || "").includes("CONSTITUTION_BLOCK")
    );

  const stopped =
    replay?.stopped === true ||
    events.some((event) =>
      String(event.event_type || event.type || "").includes("BLOCKED")
    );

  const recovered = replay?.recovered === true;

  const activeFreeze =
    Number(operations?.emergency?.active_freeze_count || 0) > 0;

  const quorumPending =
    Number(operations?.governance?.quorum_pending || 0) > 0;

  const highRisk =
    Number(operations?.governance?.high_risk || 0) > 0;

  if (chainBroken) {
    score += 40;
    signals.push({
      code: "CHAIN_INTEGRITY_RISK",
      severity: "CRITICAL",
      message: "Governance hash-chain verification failed."
    });
  }

  if (constitutionTriggered) {
    score += 30;
    signals.push({
      code: "CONSTITUTION_BREACH_RISK",
      severity: "HIGH",
      message: "Constitution rule breach detected."
    });
  }

  if (stopped) {
    score += 20;
    signals.push({
      code: "EXECUTION_STOP_RISK",
      severity: "HIGH",
      message: "Execution stop or containment event detected."
    });
  }

  if (activeFreeze) {
    score += 20;
    signals.push({
      code: "ACTIVE_FREEZE_RISK",
      severity: "HIGH",
      message: "Active governance freeze is present."
    });
  }

  if (quorumPending) {
    score += 10;
    signals.push({
      code: "QUORUM_PENDING_RISK",
      severity: "MEDIUM",
      message: "Governance quorum pending."
    });
  }

  if (highRisk) {
    score += 10;
    signals.push({
      code: "HIGH_RISK_REVIEW_PRESSURE",
      severity: "MEDIUM",
      message: "High-risk governance reviews are active."
    });
  }

  if (recovered && score > 0) {
    score = Math.max(0, score - 15);
    signals.push({
      code: "RECOVERY_SIGNAL",
      severity: "INFO",
      message: "Recovery evidence detected; total risk reduced."
    });
  }

  const normalized = Math.min(100, score);

  let level = "LOW";
  if (normalized >= 80) level = "CRITICAL";
  else if (normalized >= 50) level = "HIGH";
  else if (normalized >= 25) level = "MEDIUM";

  return {
    ok: true,
    score: normalized,
    level,
    signals,
    summary:
      normalized >= 80
        ? "Critical governance risk requiring containment."
        : normalized >= 50
        ? "High governance risk requiring supervision."
        : normalized >= 25
        ? "Medium governance risk requiring monitoring."
        : "Low governance risk."
  };
}
