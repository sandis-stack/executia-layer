/**
 * EXECUTIA™ — /gateway/providers/mock-bank.js
 *
 * Mock bank provider for development and testing.
 * Simulates all real-world scenarios: accepted, rejected, timeout, unknown.
 *
 * Standard provider interface:
 *   execute({ ticket, payload }) → { accepted, provider_status, provider_transaction_id, raw_response }
 *   reconcile({ ticket })       → { confirmed, rejected, provider_transaction_id }
 *
 * Set MOCK_BANK_SCENARIO env var to control behavior:
 *   accepted (default), rejected, timeout, unknown
 */

export const name = "mock_bank";

const SCENARIOS = {
  accepted: async (ticket, payload) => ({
    accepted:               true,
    provider_status:        "payment_accepted",
    provider_transaction_id: `mock_txn_${Date.now()}`,
    raw_response: {
      status:           "ACCEPTED",
      amount:           payload.amount,
      currency:         payload.currency || "EUR",
      reference:        ticket.idempotency_key,
      processing_time:  "T+2",
    },
  }),

  rejected: async (ticket, payload) => ({
    accepted:               false,
    provider_status:        "payment_rejected",
    provider_transaction_id: null,
    raw_response: {
      status:  "REJECTED",
      reason:  "INSUFFICIENT_FUNDS",
      amount:  payload.amount,
    },
  }),

  timeout: async () => {
    await new Promise(r => setTimeout(r, 100)); // small delay in mock
    throw new Error("timeout: provider did not respond within limit (ETIMEDOUT)");
  },

  unknown: async () => {
    throw new Error("UNKNOWN: provider response was ambiguous — manual check required");
  },
};

/**
 * Execute a payment via mock bank.
 * @param {{ ticket, payload }} params
 */
export async function execute({ ticket, payload }) {
  const scenario = process.env.MOCK_BANK_SCENARIO || "accepted";
  const fn = SCENARIOS[scenario];

  if (!fn) throw new Error(`MOCK_BANK: unknown scenario "${scenario}"`);

  return fn(ticket, payload);
}

/**
 * Reconcile an unknown transaction.
 * In mock: always confirms if idempotency key matches.
 */
export async function reconcile({ ticket }) {
  const scenario = process.env.MOCK_BANK_RECONCILE || "confirmed";

  if (scenario === "confirmed") {
    return {
      confirmed:              true,
      rejected:               false,
      provider_transaction_id: `mock_txn_reconciled_${ticket.idempotency_key.slice(0, 8)}`,
    };
  }

  return { confirmed: false, rejected: true, provider_transaction_id: null };
}
