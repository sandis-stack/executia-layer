/**
 * EXECUTIA™ — /api/generate-rule.js
 * AI-powered rule generator: natural language → execution rule JSON.
 *
 * POST /api/generate-rule
 * Body: { prompt: "If material is delayed, reassign crew to facade work" }
 *
 * Response: { rule: { event_type, condition_json, action_json } }
 *
 * Uses Claude (Anthropic) — no OpenAI dependency.
 */

import Anthropic from "@anthropic-ai/sdk";
import { requireApiKey } from "../core/api/auth.js";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── SYSTEM PROMPT ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the EXECUTIA Rule Engine AI.

Convert user intent into an EXECUTIA execution rule JSON object.

OUTPUT: Valid JSON only. No explanation. No markdown. No backticks.

SCHEMA:
{
  "event_type": string,         // one of: material_delayed, worker_unavailable, task_completed, crew_available, delay_detected, or custom snake_case
  "label": string,              // short human-readable name
  "priority": number,           // 10=system, 50=org, 100=project
  "condition_json": object | null,  // null = always apply
  "action_json": {
    "updates": [                // modify existing tasks
      {
        "match": { "status": "do_now" },  // match by any task field
        "set":   { "status": "blocked", "reason": "...", "priority": "P1" }
      }
    ],
    "create": [                 // create new tasks
      {
        "title": "Task Name",
        "status": "do_now",
        "reason": "...",
        "action": "...",
        "priority": "P1"
      }
    ],
    "remove": []                // remove tasks (usually empty)
  }
}

CONDITION FORMAT (if condition needed):
Single: { "field": "workersAvailable", "op": "<=", "value": 0 }
AND:    { "op": "AND", "conditions": [...] }
OR:     { "op": "OR", "conditions": [...] }
NOT:    { "op": "NOT", "condition": {...} }

Available context fields: workersAvailable, blockedTasks, completedTasks, alternativeTasks,
height, safetyBarrier, workHours, ppeVerified, materialAvailable, complexity.

Task statuses: do_now, blocked, waiting, done
Task priorities: P1 (critical), P2 (important), P3 (low)

EXAMPLES:

Input: "If no workers, pause all active tasks"
Output: {
  "event_type": "worker_unavailable",
  "label": "No Workers — Pause Active",
  "priority": 100,
  "condition_json": { "field": "workersAvailable", "op": "<=", "value": 0 },
  "action_json": {
    "updates": [{ "match": { "status": "do_now" }, "set": { "status": "waiting", "reason": "No workers available", "action": "Find replacement", "priority": "P1" } }],
    "create": [],
    "remove": []
  }
}

Input: "When task is done, unlock next phase"
Output: {
  "event_type": "task_completed",
  "label": "Task Done — Unlock Next Phase",
  "priority": 100,
  "condition_json": null,
  "action_json": {
    "updates": [],
    "create": [{ "title": "Next Phase", "status": "do_now", "reason": "Previous phase complete", "action": "Assign team lead", "priority": "P2" }],
    "remove": []
  }
}`;

// ── VALIDATION ───────────────────────────────────────────────
function validateRule(rule) {
  const errors = [];

  if (!rule.event_type || typeof rule.event_type !== "string") {
    errors.push("event_type is required and must be a string");
  }
  if (!rule.action_json || typeof rule.action_json !== "object") {
    errors.push("action_json is required");
  } else {
    if (!Array.isArray(rule.action_json.updates)) errors.push("action_json.updates must be an array");
    if (!Array.isArray(rule.action_json.create))  errors.push("action_json.create must be an array");
  }

  return errors;
}

// ── HANDLER ──────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireApiKey(req, res)) return;

  const { prompt, projectId, orgId } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return res.status(400).json({ error: "prompt required (min 5 chars)" });
  }

  try {
    const message = await claude.messages.create({
      model:      "claude-opus-4-5",
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: prompt.trim() }],
    });

    const raw = message.content[0]?.text?.trim();
    if (!raw) {
      return res.status(500).json({ error: "Empty AI response" });
    }

    // Parse JSON — strip accidental backticks
    let rule;
    try {
      const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
      rule = JSON.parse(clean);
    } catch {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw,
      });
    }

    // Validate
    const errors = validateRule(rule);
    if (errors.length > 0) {
      return res.status(422).json({ error: "Rule validation failed", errors, rule });
    }

    // Add metadata
    rule.project_id      = projectId || null;
    rule.organization_id = orgId     || null;
    rule.active          = false; // requires human approval before activation
    rule.created_by      = "ai_generator";

    // Deterministic rule_key: hash of event_type + label (no Date.now)
    const slug = (rule.label || rule.event_type).toLowerCase().replace(/[^a-z0-9]+/g, "_");
    let h = 2166136261;
    for (const c of slug) { h ^= c.charCodeAt(0); h = (h * 16777619) >>> 0; }
    rule.rule_key = `${rule.event_type}_ai_${h.toString(36)}`;

    return res.status(200).json({
      ok:     true,
      rule,
      note:   "Rule generated — set active:true to enable after review",
      tokens: message.usage?.input_tokens + message.usage?.output_tokens,
    });

  } catch (err) {
    console.error("[EXECUTIA] generate-rule error:", err);
    return res.status(500).json({ error: err.message });
  }
}
