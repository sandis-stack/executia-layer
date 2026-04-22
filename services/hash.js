/**
 * EXECUTIA™ — /services/hash.js
 * Deterministic SHA-256 hash for ledger entries.
 * Same payload → same hash. Order-independent via sorted keys.
 */

import { createHash as nodeCreateHash } from "crypto";

/**
 * Hash any JSON-serializable payload deterministically.
 * @param {object} payload
 * @returns {string} hex SHA-256
 */
export function hashPayload(payload) {
  const sorted = JSON.stringify(payload, sortedReplacer());
  return nodeCreateHash("sha256").update(sorted).digest("hex");
}

function sortedReplacer() {
  const seen = new WeakSet();
  return function(key, value) {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
      if (!Array.isArray(value)) {
        return Object.keys(value).sort().reduce((sorted, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
      }
    }
    return value;
  };
}
