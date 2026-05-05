import { createHash, randomUUID } from "crypto";

export function sha256(input) {
  return createHash("sha256").update(String(input)).digest("hex");
}

export function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

export function createExecutionId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
