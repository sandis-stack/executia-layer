/**
 * EXECUTIA™ — /services/signature.js
 * HMAC signing / verification for provider callbacks.
 */
import { createHmac, timingSafeEqual } from "crypto";

export function signPayload(body, secret) {
  return createHmac("sha256", String(secret)).update(String(body)).digest("hex");
}

export function verifySignature(body, headerValue, secret) {
  if (!headerValue || !secret) return false;
  const normalized = String(headerValue).replace(/^sha256=/i, "").trim();
  const expected = signPayload(body, secret);
  const a = Buffer.from(normalized);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
