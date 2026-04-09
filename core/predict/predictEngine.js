/**
 * EXECUTIA™ — /core/predict/predictEngine.js
 * AI-powered outcome prediction using Claude.
 *
 * Input:  feature vector from featureBuilder.js
 * Output: structured forecast with confidence intervals
 *
 * Uses Claude (Anthropic) — deterministic at temperature 0.
 */

import Anthropic from "@anthropic-ai/sdk";
import { quickRiskScreen } from "./featureBuilder.js";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── SYSTEM PROMPT ────────────────────────────────────────────
const PREDICT_PROMPT = `You are the EXECUTIA Predictive Engine.

Analyze project execution features and forecast outcomes.

OUTPUT: Valid JSON only. No explanation. No markdown. No backticks.

SCHEMA:
{
  "delay_risk":        "LOW" | "MEDIUM" | "HIGH",
  "delay_days":        number,           // expected delay in days (0 if none)
  "delay_probability": number,           // 0.0 to 1.0
  "cost_overrun":      number,           // expected additional cost in EUR
  "cost_overrun_range": { "low": number, "high": number },
  "risk_level":        "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "compliance_breach_risk": "LOW" | "MEDIUM" | "HIGH",
  "critical_window":   number | null,    // days until situation becomes critical (null if not applicable)
  "top_risks": [
    { "risk": string, "probability": number, "impact_eur": number }
  ],
  "confidence":        number,           // 0.0 to 1.0 (AI confidence in this forecast)
  "basis":             string            // brief explanation of key drivers (max 100 chars)
}

RULES:
- Base predictions on patterns in the data, not assumptions
- If data is insufficient (< 5 events), set confidence < 0.5
- delay_days should be proportional to delay_count and blockage_rate
- cost_overrun should reflect totalNegImpact trend
- Be conservative — underestimate rather than panic
- top_risks: max 3 items, sorted by probability DESC`;

// ── MAIN PREDICTION ──────────────────────────────────────────
/**
 * Generate AI-powered outcome prediction.
 * Falls back to rule-based prediction if AI unavailable.
 */
export async function predictOutcome(features, options = {}) {
  // Quick screen — skip AI if risk is LOW and no anomalies
  const screen = quickRiskScreen(features);

  if (!screen.requiresAI && !options.forceAI) {
    return buildRuleBasedForecast(features, screen);
  }

  try {
    const message = await claude.messages.create({
      model:       "claude-opus-4-5",
      max_tokens:  1024,
      temperature: 0,   // deterministic — same input = same output
      system:      PREDICT_PROMPT,
      messages:    [{
        role:    "user",
        content: JSON.stringify(features),
      }],
    });

    const raw = message.content[0]?.text?.trim();
    if (!raw) throw new Error("Empty AI response");

    const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const prediction = JSON.parse(clean);

    return {
      ...prediction,
      source:    "ai",
      screen,
      timestamp: new Date().toISOString(),
    };

  } catch (err) {
    console.warn("[EXECUTIA] AI prediction failed, using rule-based fallback:", err.message);
    return buildRuleBasedForecast(features, screen);
  }
}

// ── RULE-BASED FALLBACK ──────────────────────────────────────
/**
 * Deterministic rule-based forecast — no AI cost, always available.
 * Used when: LOW risk, AI unavailable, or options.ruleOnly = true.
 */
function buildRuleBasedForecast(features, screen) {
  const {
    delayCount, blockageRate, highRiskCount,
    totalNegImpact, avgMoneyImpact, complianceRate,
    daysRemaining, workersAvailable, criticalTasks,
  } = features;

  // Delay forecast
  const delayProbability = Math.min(
    (delayCount * 0.2) + (blockageRate / 100 * 0.4) + (workersAvailable === 0 ? 0.3 : 0),
    0.95
  );
  const delayDays = Math.round(delayCount * 1.5 + (blockageRate > 30 ? 2 : 0));

  // Cost overrun forecast
  const baseCostOverrun = Math.abs(totalNegImpact) * 0.15; // 15% more expected
  const costRange = {
    low:  Math.round(baseCostOverrun * 0.7),
    high: Math.round(baseCostOverrun * 1.5),
  };

  // Critical window
  const criticalWindow = daysRemaining !== null && criticalTasks > 0
    ? Math.max(1, Math.round(daysRemaining * 0.3))
    : null;

  // Top risks
  const topRisks = [];
  if (delayProbability > 0.3)
    topRisks.push({ risk: "Schedule delay", probability: delayProbability, impact_eur: delayDays * 120 });
  if (complianceRate > 10)
    topRisks.push({ risk: "Compliance breach", probability: complianceRate / 100, impact_eur: 5000 });
  if (workersAvailable === 0)
    topRisks.push({ risk: "Workforce shortage", probability: 0.9, impact_eur: 45 * 8 });

  return {
    delay_risk:             screen.level,
    delay_days:             delayDays,
    delay_probability:      Math.round(delayProbability * 100) / 100,
    cost_overrun:           Math.round(baseCostOverrun),
    cost_overrun_range:     costRange,
    risk_level:             screen.riskScore >= 70 ? "CRITICAL" : screen.level,
    compliance_breach_risk: complianceRate > 20 ? "HIGH" : complianceRate > 10 ? "MEDIUM" : "LOW",
    critical_window:        criticalWindow,
    top_risks:              topRisks.slice(0, 3),
    confidence:             features.totalEventsAnalyzed >= 10 ? 0.75 : 0.50,
    basis:                  `Rule-based: ${screen.signals.join(", ") || "stable conditions"}`,
    source:                 "rule_based",
    screen,
    timestamp:              new Date().toISOString(),
  };
}
