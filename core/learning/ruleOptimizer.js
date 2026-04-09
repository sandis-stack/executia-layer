/**
 * EXECUTIA™ — /core/learning/ruleOptimizer.js
 * Self-learning execution system: analyzes outcomes → proposes rule improvements.
 *
 * SAFETY: Never auto-updates rules. Always writes to proposed_rules table.
 * Human approval required before any rule change takes effect.
 *
 * Flow:
 *   analyzeAndPropose(supabase, projectId)
 *     → fetches recent events + current rules
 *     → sends to Claude for analysis
 *     → writes proposals to proposed_rules table
 *     → returns proposals for review
 */

import Anthropic from "@anthropic-ai/sdk";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── SYSTEM PROMPT ────────────────────────────────────────────
const OPTIMIZER_PROMPT = `You are the EXECUTIA Rule Optimizer.

Analyze execution events and current rules. Identify patterns where rules are causing:
- Repeated delays (delay_count > 2 for same rule)
- Negative money impact
- High risk levels
- Compliance failures

Propose SPECIFIC rule improvements. Be concrete and conservative.

OUTPUT: Valid JSON array only. No explanation. No markdown.

Each proposal:
{
  "rule_id": number,         // ID of rule to improve (from provided rules)
  "reason": string,          // why this rule needs improvement (max 100 chars)
  "confidence": number,      // 0.0-1.0 how confident you are
  "proposed_changes": {
    "action_json"?: {...},   // new action_json if action needs changing
    "condition_json"?: {...}, // new condition if condition needs tightening
    "priority"?: number,     // new priority if needs reordering
    "active"?: boolean       // set false to disable a harmful rule
  },
  "expected_improvement": string  // what outcome should improve
}

RULES:
- Only propose changes you are confident about (confidence > 0.7)
- Never propose to delete rules — set active:false instead
- Conservative changes preferred over aggressive ones
- If no improvements needed, return empty array: []`;

// ── SCORING ──────────────────────────────────────────────────
/**
 * Score a rule based on its event outcomes.
 * Higher score = rule is performing well.
 */
export function scoreRule(events, ruleKey) {
  const ruleEvents = events.filter(e =>
    e.decision?.rule === ruleKey ||
    e.event_type === ruleKey.replace("_default", "").replace("_fallback", "")
  );

  if (ruleEvents.length === 0) return null; // no data yet

  let score = 100;

  for (const e of ruleEvents) {
    // Risk penalties
    if (e.risk?.level === "HIGH")   score -= 10;
    if (e.risk?.level === "MEDIUM") score -= 5;

    // Money impact
    const impact = e.money?.impact || 0;
    if (impact < 0) score -= Math.min(Math.abs(impact) / 1000, 20); // cap at -20

    // Compliance failure
    if (e.compliance?.allowed === false) score -= 15;

    // Positive outcomes
    if (impact > 0) score += Math.min(impact / 2000, 5); // cap at +5
    if (e.risk?.level === "LOW") score += 2;
  }

  return {
    ruleKey,
    score:       Math.max(0, Math.min(100, Math.round(score))),
    sampleSize:  ruleEvents.length,
    needsReview: score < 60,
  };
}

// ── MAIN ANALYSIS ────────────────────────────────────────────
/**
 * Analyze recent events and propose rule improvements.
 * Writes proposals to proposed_rules table (requires human approval).
 */
export async function analyzeAndPropose(supabase, projectId, options = {}) {
  const limit = options.eventLimit || 100;

  // 1. Fetch recent events
  let eventQuery = supabase
    .from("events")
    .select("id, event_type, decision, risk, money, compliance, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (projectId) eventQuery = eventQuery.eq("project_id", projectId);

  const { data: events, error: evErr } = await eventQuery;
  if (evErr) throw new Error(`Failed to fetch events: ${evErr.message}`);

  if (!events || events.length < 5) {
    return { proposals: [], reason: "Insufficient data — need at least 5 events" };
  }

  // 2. Fetch current rules
  let ruleQuery = supabase
    .from("execution_rules")
    .select("id, rule_key, event_type, label, priority, condition_json, action_json, active");

  if (projectId) ruleQuery = ruleQuery.eq("project_id", projectId);

  const { data: rules, error: ruleErr } = await ruleQuery;
  if (ruleErr) throw new Error(`Failed to fetch rules: ${ruleErr.message}`);

  // 3. Score each rule
  const scores = (rules || [])
    .map(r => scoreRule(events, r.rule_key))
    .filter(Boolean);

  const lowPerformers = scores.filter(s => s.needsReview);

  // If no rules need review — skip AI call
  if (lowPerformers.length === 0) {
    return {
      proposals:    [],
      scores,
      reason:       "All rules performing well — no optimization needed",
      eventsAnalyzed: events.length,
    };
  }

  // 4. Send to Claude for analysis
  let proposals = [];
  try {
    const message = await claude.messages.create({
      model:      "claude-opus-4-5",
      max_tokens: 2048,
      system:     OPTIMIZER_PROMPT,
      messages:   [{
        role:    "user",
        content: JSON.stringify({
          recentEvents:    events.slice(0, 50), // limit payload
          currentRules:    rules,
          lowPerformers,
          projectId,
        }),
      }],
    });

    const raw = message.content[0]?.text?.trim();
    if (raw) {
      const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
      proposals = JSON.parse(clean);
    }
  } catch (err) {
    console.error("[EXECUTIA] optimizer AI error:", err.message);
    // Continue without AI — return scores only
  }

  // 5. Filter to high-confidence proposals only
  const safeProposals = proposals.filter(p => p.confidence >= 0.7);

  // 6. Write to proposed_rules (NEVER auto-update execution_rules)
  if (safeProposals.length > 0) {
    await supabase.from("proposed_rules").insert(
      safeProposals.map(p => ({
        original_rule_id: p.rule_id,
        new_rule:         p.proposed_changes,
        reason:           p.reason,
        confidence:       p.confidence,
        expected_improvement: p.expected_improvement,
        project_id:       projectId,
        approved:         false,
        created_by:       "ai_optimizer",
      }))
    );
  }

  return {
    proposals:      safeProposals,
    scores,
    lowPerformers,
    eventsAnalyzed: events.length,
    note:           "Proposals written to proposed_rules — require human approval",
  };
}

// ── APPLY APPROVED PROPOSAL ──────────────────────────────────
/**
 * Apply a human-approved proposal to execution_rules.
 * Call only after human reviews and approves proposed_rules.approved = true.
 */
export async function applyApprovedProposal(supabase, proposalId) {
  // Fetch proposal
  const { data: proposal, error } = await supabase
    .from("proposed_rules")
    .select("*")
    .eq("id", proposalId)
    .eq("approved", true)
    .single();

  if (error || !proposal) {
    throw new Error("Proposal not found or not approved");
  }

  // Apply to execution_rules
  const { error: updateErr } = await supabase
    .from("execution_rules")
    .update({
      ...proposal.new_rule,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.original_rule_id);

  if (updateErr) throw new Error(`Failed to apply proposal: ${updateErr.message}`);

  return { applied: true, proposalId, ruleId: proposal.original_rule_id };
}
