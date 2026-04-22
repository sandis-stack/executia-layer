/**
 * EXECUTIA™ — /engine/required-context.js
 *
 * Per-event required context fields.
 * Engine cannot make a valid decision on incomplete reality.
 *
 * assertRequiredContext(eventType, ctx) throws if any required field is null.
 * Call AFTER enrichment, BEFORE rule evaluation.
 *
 * Principle: "realitāte ir zināma" before any rule fires.
 */

/**
 * Required fields per event type.
 * null value = unknown = engine cannot proceed.
 *
 * To add a new event type: add its required fields here.
 * The engine will enforce them automatically.
 */
const REQUIRED_BY_EVENT = Object.freeze({
  payment: [
    "budgetRemaining",
    "supplierVerified",
    "contractValid",
  ],

  worker_unavailable: [
    "workersAvailable",
  ],

  material_delayed: [
    "workersAvailable",
  ],

  task_completed: [
    "completedTasks",
    "pendingTasks",
  ],

  crew_available: [
    "workersAvailable",
  ],

  delay_detected: [
    "workersAvailable",
    "pendingTasks",
  ],
});

/**
 * Fields required for ALL events regardless of type.
 */
const ALWAYS_REQUIRED = Object.freeze([
  "eventType",
  "organizationId",
]);

/**
 * Assert that all required fields for this event type are non-null.
 * Throws with specific error if any required field is null or undefined.
 *
 * @param {string} eventType - Canonical event type (snake_case)
 * @param {object} ctx       - Canonical context (after all enrichment)
 * @throws {Error}           - MISSING_REQUIRED_CONTEXT:fieldName
 */
export function assertRequiredContext(eventType, ctx) {
  // Always-required fields
  for (const field of ALWAYS_REQUIRED) {
    if (ctx[field] == null) {
      throw new Error(`MISSING_REQUIRED_CONTEXT:${field} (required for all events)`);
    }
  }

  // Event-specific required fields
  const required = REQUIRED_BY_EVENT[eventType] || [];
  for (const field of required) {
    if (ctx[field] == null) {
      throw new Error(
        `MISSING_REQUIRED_CONTEXT:${field} ` +
        `(required for event "${eventType}" — enrich context before evaluation)`
      );
    }
  }

  return true;
}

/**
 * Get the required fields for a given event type.
 * Useful for API documentation and client-side validation.
 */
export function getRequiredFields(eventType) {
  return {
    always:     [...ALWAYS_REQUIRED],
    forEvent:   [...(REQUIRED_BY_EVENT[eventType] || [])],
    eventType,
    known:      eventType in REQUIRED_BY_EVENT,
  };
}

/**
 * List all known event types with their required fields.
 * Used by governance to validate AI-generated rules reference known events.
 */
export function listKnownEventTypes() {
  return Object.keys(REQUIRED_BY_EVENT);
}
