/**
 * EXECUTIA™ — /engine/canonical-context.js
 * Single source of truth for all context fields.
 * Object.freeze — immutable at runtime.
 */

export const CANONICAL_FIELDS = Object.freeze({
  eventType:        "string",
  organizationId:   "string",
  projectId:        "string|null",

  amount:           "number|null",
  currency:         "string|null",

  budgetRemaining:  "number|null",
  budgetAllocated:  "number|null",

  workersAvailable: "number|null",
  hoursSinceRest:   "number|null",

  supplierVerified: "boolean|null",
  contractValid:    "boolean|null",

  weatherRisk:      "number|null",
  legalBlock:       "boolean|null",

  completedTasks:   "number|null",
  pendingTasks:     "number|null",
});

export function assertKnownField(field) {
  if (!Object.prototype.hasOwnProperty.call(CANONICAL_FIELDS, field)) {
    throw new Error(`UNKNOWN_CONTEXT_FIELD:${field}`);
  }
}

export function normalizeEventInput(raw = {}) {
  const event = {
    eventType:      raw.eventType      ?? raw.event_type      ?? null,
    organizationId: raw.organizationId ?? raw.organization_id ?? null,
    projectId:      raw.projectId      ?? raw.project_id      ?? null,
    amount:         raw.amount != null  ? Number(raw.amount)  : null,
    currency:       raw.currency        ?? null,
    // Non-canonical engine meta — not part of context
    sessionId:      raw.sessionId      ?? raw.session_id      ?? null,
    countryCode:    raw.countryCode     ?? raw.country_code   ?? "NO",
    strategy:       raw.strategy        ?? "TIME",
    simulate:       raw.simulate        === true,
  };

  if (!event.eventType) {
    throw new Error("INVALID_EVENT: eventType is required");
  }
  if (!event.organizationId) {
    throw new Error("INVALID_EVENT: organizationId is required");
  }
  if (!event.sessionId) {
    throw new Error("INVALID_EVENT: sessionId is required");
  }

  // Normalize eventType to snake_case
  event.eventType = event.eventType.toLowerCase().replace(/[- ]/g, "_");

  return event;
}

export function buildBaseContext(event) {
  return {
    eventType:        event.eventType,
    organizationId:   event.organizationId,
    projectId:        event.projectId,

    amount:           event.amount,
    currency:         event.currency,

    budgetRemaining:  null,
    budgetAllocated:  null,

    workersAvailable: null,
    hoursSinceRest:   null,

    supplierVerified: null,
    contractValid:    null,

    weatherRisk:      null,
    legalBlock:       false,   // default false — must be explicitly set to block

    completedTasks:   null,
    pendingTasks:     null,
  };
}

/**
 * Assert every key in ctx is a known canonical field.
 * Call after all enrichment is complete, before rule evaluation.
 * Throws immediately on first unknown field.
 */
export function assertCanonicalContext(ctx) {
  for (const key of Object.keys(ctx)) {
    assertKnownField(key);
  }
  return true;
}

/**
 * Merge enrichment into context — strict mode.
 * Unknown fields throw immediately. No warn-and-drop.
 */
export function mergeEnrichment(ctx, enrichment = {}) {
  for (const key of Object.keys(enrichment)) {
    assertKnownField(key); // throws on unknown
  }
  return { ...ctx, ...enrichment };
}


export const ALLOWED_FIELD_NAMES = Object.freeze(Object.keys(CANONICAL_FIELDS));
