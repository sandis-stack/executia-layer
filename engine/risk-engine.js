export function calculateRiskScore(body = {}) {
  let score = 0;

  const amount = Number(body.amount || 0);

  if (amount >= 1000000) score += 80;
  else if (amount >= 100000) score += 50;
  else if (amount >= 10000) score += 25;

  if (body.rule_context?.requires_operator === true) {
    score += 40;
  }

  if (!body.actor) score += 20;
  if (!body.subject) score += 20;

  let level = "LOW";

  if (score >= 80) level = "HIGH";
  else if (score >= 40) level = "MEDIUM";

  return {
    score,
    level
  };
}
