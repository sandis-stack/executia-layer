/**
 * EXECUTIA™ — /engine/decision-engine.js
 *
 * LEGAL BLOCK > BLOCK > ESCALATE > APPROVE.
 * Deterministic. No scoring. No ambiguity. Every outcome provably explained.
 *
 * Replaces conflict-resolver.js + compliance-decision.js.
 * One function. One model.
 */

export const DECISIONS = Object.freeze({
  APPROVE:  "APPROVE",
  ESCALATE: "ESCALATE",
  BLOCK:    "BLOCK",
});

/**
 * Make final decision from canonical context + evaluated rules.
 *
 * Priority:
 *   1. ctx.legalBlock === true  → BLOCK (legal override, no rules consulted)
 *   2. Any matched rule with effect BLOCK → BLOCK
 *   3. Any matched rule with effect ESCALATE → ESCALATE
 *   4. Otherwise → APPROVE
 *
 * Within same effect: lowest priority number wins, then id lexicographic.
 *
 * @param {object}       ctx            - Canonical context
 * @param {RuleResult[]} evaluatedRules - Output of evaluateRules().results
 * @returns {{ decision, reason_codes, winning_rules }}
 */
export function makeDecision(ctx, evaluatedRules) {
  const matched = evaluatedRules.filter(r => r.matched);

  // Legal block overrides all rules — context wins absolutely
  if (ctx.legalBlock === true) {
    return {
      decision:      DECISIONS.BLOCK,
      reason_codes:  ["LEGAL_BLOCK"],
      winning_rules: [],
    };
  }

  // Sort matched: effect DESC (BLOCK > ESCALATE > ALLOW), then priority ASC, then id ASC
  const sorted = [...matched].sort((a, b) => {
    const effectOrder = { BLOCK: 3, ESCALATE: 2, ALLOW: 1 };
    const eDiff = (effectOrder[b.effect] || 0) - (effectOrder[a.effect] || 0);
    if (eDiff !== 0) return eDiff;
    const pDiff = (a.priority ?? 100) - (b.priority ?? 100);
    if (pDiff !== 0) return pDiff;
    return String(a.rule_id).localeCompare(String(b.rule_id));
  });

  const winner = sorted[0];

  if (!winner) {
    return {
      decision:      DECISIONS.APPROVE,
      reason_codes:  ["NO_MATCHED_RULES"],
      winning_rules: [],
    };
  }

  switch (winner.effect) {
    case "BLOCK":
      return {
        decision:      DECISIONS.BLOCK,
        reason_codes:  sorted.filter(r => r.effect === "BLOCK").map(r => `RULE_${r.rule_id}`),
        winning_rules: sorted,
      };
    case "ESCALATE":
      return {
        decision:      DECISIONS.ESCALATE,
        reason_codes:  sorted.filter(r => r.effect === "ESCALATE").map(r => `RULE_${r.rule_id}`),
        winning_rules: sorted,
      };
    default: // ALLOW
      return {
        decision:      DECISIONS.APPROVE,
        reason_codes:  sorted.map(r => `RULE_${r.rule_id}`),
        winning_rules: sorted,
      };
  }
}
