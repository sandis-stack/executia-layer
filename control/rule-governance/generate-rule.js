/**
 * EXECUTIA™ — /governance/generate-rule.js
 * AI rule generator. Enforces canonical schema in prompt and validates output.
 */

import Anthropic from "@anthropic-ai/sdk";
import { validateConditionSchema } from "../engine/strict-condition-engine.js";
import { PROPOSAL_STATES } from "../engine/decision-states.js";
import { ERROR_CODES } from "../engine/error-codes.js";
import { withEngine } from "../middleware/with-engine.js";
import { ALLOWED_FIELD_NAMES } from "../engine/canonical-context.js";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the EXECUTIA Rule Engine AI.

Convert natural language into a valid EXECUTIA execution rule JSON.
OUTPUT: Valid JSON only. No markdown. No explanation. No backticks.

SCHEMA:
{
  "event_type": string,
  "name": string,
  "priority": number,
  "effect": "ALLOW" | "ESCALATE" | "BLOCK",
  "condition_json": object | null
}

CONDITION FORMAT — STRICT:
Use ONLY these structures:
  null                                                     (always applies)
  { "field": "...", "op": "...", "value": ... }            (leaf)
  { "all": [ ...conditions ] }                             (AND)
  { "any": [ ...conditions ] }                             (OR)
  { "not": { ...condition } }                              (NOT)

Allowed operators (EXACT strings): eq, neq, gt, gte, lt, lte, in, not_in, is_null, is_not_null
Allowed fields (EXACT strings): ${[...ALLOWED_FIELD_NAMES].join(", ")}

NEVER USE:
  "op": "AND" — wrong. Use "all": [...]
  "op": "OR"  — wrong. Use "any": [...]
  "op": "NOT" — wrong. Use "not": {...}
  "conditions": [...] — wrong key
  Any field not in the allowed list above

EVENT TYPES: payment | worker_unavailable | material_delayed | task_completed | crew_available | delay_detected | or any snake_case

EFFECTS:
  ALLOW    — permit execution
  ESCALATE — require human review
  BLOCK    — prevent execution`;

export default withEngine(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return res.status(400).json({ ok: false, error_code: ERROR_CODES.MISSING_REQUIRED_FIELD, error_message: "prompt (string, min 5 chars) required" });
  }

  try {
    const message = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt.trim() }],
    });

    const raw = message.content[0]?.text?.trim();
    if (!raw) return res.status(500).json({ ok: false, error_message: "Empty AI response" });

    let rule;
    try {
      rule = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim());
    } catch {
      return res.status(422).json({
        ok: false,
        proposal_state: PROPOSAL_STATES.INVALID,
        error_code: ERROR_CODES.INVALID_RULE_SCHEMA,
        error_message: "AI returned invalid JSON",
        raw,
      });
    }

    if (rule.condition_json !== null) {
      try {
        validateConditionSchema(rule.condition_json);
      } catch (err) {
        return res.status(422).json({
          ok: false,
          proposal_state: PROPOSAL_STATES.INVALID,
          error_code: ERROR_CODES.INVALID_RULE_SCHEMA,
          error_message: err.message,
          rule,
        });
      }
    }

    if (!["ALLOW", "ESCALATE", "BLOCK"].includes(rule.effect)) {
      return res.status(422).json({
        ok: false,
        proposal_state: PROPOSAL_STATES.INVALID,
        error_code: ERROR_CODES.INVALID_RULE_SCHEMA,
        error_message: `Invalid effect "${rule.effect}" — must be ALLOW, ESCALATE, or BLOCK`,
        rule,
      });
    }

    const slug = (rule.name || rule.event_type || "rule").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    let h = 2166136261;
    for (const c of slug) { h ^= c.charCodeAt(0); h = (h * 16777619) >>> 0; }
    rule.rule_key = `${rule.event_type}_ai_${h.toString(36)}`;
    rule.status = PROPOSAL_STATES.GENERATED;
    rule.created_by = "ai_generator";

    return res.status(200).json({
      ok: true,
      proposal_state: PROPOSAL_STATES.VALIDATED,
      rule,
      note: "Schema valid. Requires human review before publication.",
      tokens: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error_code: ERROR_CODES.ENGINE_ERROR, error_message: err.message });
  }
}, { methods: ["POST"], requireAuth: true, rateLimit: true });
