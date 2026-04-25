import crypto from "crypto";

export function createTruthHash(payload = {}) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload, Object.keys(payload).sort()))
    .digest("hex");
}
