export async function dispatchExecution(input = {}) {
  const { decision } = input;

  if (decision === "BLOCK") {
    return {
      status: "REJECTED",
      action: "Execution blocked"
    };
  }

  if (decision === "ESCALATE") {
    return {
      status: "PENDING_REVIEW",
      action: "Sent for manual approval"
    };
  }

  return {
    status: "EXECUTED",
    action: "Execution completed"
  };
}
