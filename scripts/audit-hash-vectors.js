#!/usr/bin/env node
/**
 * Phase 3B.1 supplemental audit hash vectors (JS authority).
 * SQL executia_audit_event_hash must produce identical event_hash values.
 *
 * Usage: node scripts/audit-hash-vectors.js
 */
import { buildAuditHash, AUDIT_HASH_FORMULA_ID } from "../services/audit.js";

const EXECUTION_ID = "550e8400-e29b-41d4-a716-446655440000";

const vectors = [
  {
    name: "GENESIS_EXECUTION_SUBMITTED",
    event: {
      execution_id: EXECUTION_ID,
      event_type: "EXECUTION_SUBMITTED",
      actor: "system",
      payload: {
        chain_era: "3B1",
        reference_only: true,
        ledger_head_hash: "0693b41131bba5eaf2521eeb0973e6306b8d3fc5b444e31cad49889cbac3c02e",
        status: "PENDING_REVIEW",
        decision: "REVIEW",
        reason: "OPERATOR_REQUIRED"
      }
    },
    prev: "GENESIS"
  },
  {
    name: "GENESIS_OPERATOR_DECISION_RECORDED",
    event: {
      execution_id: EXECUTION_ID,
      event_type: "OPERATOR_DECISION_RECORDED",
      actor: "operator",
      payload: {
        chain_era: "3B1",
        reference_only: true,
        ledger_head_hash: "0693b41131bba5eaf2521eeb0973e6306b8d3fc5b444e31cad49889cbac3c02e",
        status: "APPROVED",
        decision: "APPROVE",
        reason: "OPERATOR_APPROVE"
      }
    },
    prev: "GENESIS"
  },
  {
    name: "CHAIN_SECOND_LINK",
    event: {
      execution_id: EXECUTION_ID,
      event_type: "OPERATOR_ACTION",
      actor: "operator@executia.io",
      payload: { chain_era: "3B1", action: "NOTE" }
    },
    chainFrom: "GENESIS_EXECUTION_SUBMITTED"
  }
];

const computed = new Map();

for (const vector of vectors) {
  let prev = vector.prev || "GENESIS";

  if (vector.chainFrom) {
    const prior = computed.get(vector.chainFrom);
    if (!prior) throw new Error(`Missing chain parent: ${vector.chainFrom}`);
    prev = prior;
  }

  const event_hash = buildAuditHash(vector.event, prev);

  if (!event_hash || event_hash.length !== 64) {
    throw new Error(`${vector.name}: invalid hash length`);
  }

  computed.set(vector.name, event_hash);
  console.log(`${vector.name}=${event_hash}`);
}

if (computed.get("GENESIS_EXECUTION_SUBMITTED") === computed.get("GENESIS_OPERATOR_DECISION_RECORDED")) {
  throw new Error("Distinct event types must not collide at GENESIS");
}

const chained = computed.get("CHAIN_SECOND_LINK");
const genesis = computed.get("GENESIS_EXECUTION_SUBMITTED");
if (chained === genesis) {
  throw new Error("Chained audit hash must differ from GENESIS head");
}

console.log(`formula=${AUDIT_HASH_FORMULA_ID}`);
console.log("AUDIT_HASH_VECTORS_OK");
