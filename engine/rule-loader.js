export function loadRules() {
  return [
    {
      id: "ACTOR_REQUIRED",
      severity: "BLOCKING",
      description: "Every execution request must define actor."
    },
    {
      id: "SUBJECT_REQUIRED",
      severity: "BLOCKING",
      description: "Every execution request must define subject."
    },
    {
      id: "APPROVAL_LIMIT",
      severity: "BLOCKING",
      description: "Amount cannot exceed authorized approval limit."
    },
    {
      id: "OPERATOR_REVIEW",
      severity: "REVIEW",
      description: "Unclear execution request moves to operator queue."
    }
  ];
}
