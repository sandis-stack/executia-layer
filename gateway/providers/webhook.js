/**
 * EXECUTIA™ — /gateway/providers/webhook.js
 *
 * Signed webhook provider for live execution dispatch.
 * Uses institutional env names aligned with V4 runtime safety.
 */

import { createHmac } from "crypto";

export const name = "webhook";

const DEFAULT_TIMEOUT_MS = 5000;

function requireUrl() {
  const url = process.env.EXECUTIA_PROVIDER_WEBHOOK_URL;
  if (!url) {
    throw new Error("PROVIDER_MISCONFIGURED: EXECUTIA_PROVIDER_WEBHOOK_URL required");
  }
  return url;
}

function requireSecret() {
  const secret = process.env.WEBHOOK_CALLBACK_SECRET;
  if (!secret) {
    throw new Error("PROVIDER_MISCONFIGURED: WEBHOOK_CALLBACK_SECRET required");
  }
  return secret;
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function toWireBody({ ticket, payload }) {
  return JSON.stringify({
    executia_event: "execution_approved",
    ticket_id: ticket.id,
    ledger_id: ticket.ledger_id || null,
    truth_hash: ticket.truth_hash || null,
    allowed_action: ticket.allowed_action || null,
    organization_id: ticket.organization_id || null,
    idempotency_key: ticket.idempotency_key || ticket.id,
    payload,
    timestamp: new Date().toISOString(),
  });
}

function signBody(body, secret) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function normalizeHeaders(response) {
  return {
    transaction_id: response.headers.get("x-transaction-id") || null,
  };
}

export function validateRequest({ ticket }) {
  if (!ticket?.id) throw new Error("PROVIDER_INVALID_TICKET");
  return true;
}

export async function dispatch({ ticket, payload }) {
  const url = requireUrl();
  const secret = requireSecret();
  const body = toWireBody({ ticket, payload });
  const signature = signBody(body, secret);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-executia-sig": `sha256=${signature}`,
        "x-executia-ticket-id": ticket.id,
        "x-idempotency-key": ticket.idempotency_key || ticket.id,
      },
      body,
      signal: timeoutSignal(DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error(`WEBHOOK_TIMEOUT: endpoint did not respond within ${DEFAULT_TIMEOUT_MS}ms`);
    }
    throw new Error(`WEBHOOK_NETWORK_ERROR: ${err?.message || String(err)}`);
  }

  const responseText = await response.text().catch(() => "");
  let raw;
  try {
    raw = responseText ? JSON.parse(responseText) : {};
  } catch {
    raw = { body: responseText };
  }

  return {
    ok: response.ok,
    accepted: response.ok,
    raw_response: {
      status: response.status,
      headers: normalizeHeaders(response),
      body: raw,
    },
    status_code: response.status,
  };
}

export function verifyResponse(result) {
  return typeof result === "object" && result !== null && typeof result.accepted === "boolean";
}

export function normalizeResult(result) {
  return {
    accepted: !!result.accepted,
    provider_status: `http_${result.status_code || 0}`,
    provider_transaction_id: result.raw_response?.headers?.transaction_id || null,
    raw_response: result.raw_response || result,
  };
}

export async function execute({ ticket, payload }) {
  validateRequest({ ticket, payload });
  const dispatched = await dispatch({ ticket, payload });
  if (!verifyResponse(dispatched)) {
    throw new Error("PROVIDER_INVALID_RESPONSE");
  }
  return normalizeResult(dispatched);
}

export async function reconcile() {
  throw new Error("RECONCILE_NOT_SUPPORTED: webhook provider requires callback or manual reconciliation");
}

export default {
  name,
  validateRequest,
  dispatch,
  verifyResponse,
  normalizeResult,
  execute,
  reconcile,
};
