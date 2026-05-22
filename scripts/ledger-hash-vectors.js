#!/usr/bin/env node
/**
 * Phase 3A ledger hash parity vectors (JS authority).
 * SQL executia_ledger_entry_hash must produce identical entry_hash values.
 *
 * Usage: node scripts/ledger-hash-vectors.js
 */
import { buildLedgerHash, LEDGER_HASH_FORMULA_ID } from "../services/ledger.js";

const EXECUTION_ID = "550e8400-e29b-41d4-a716-446655440000";

const vectors = [
  {
    name: "GENESIS_APPROVED_APPROVE",
    input: {
      previous_hash: "GENESIS",
      execution_id: EXECUTION_ID,
      status: "APPROVED",
      decision: "APPROVE"
    }
  },
  {
    name: "GENESIS_BLOCKED_BLOCK",
    input: {
      previous_hash: "GENESIS",
      execution_id: EXECUTION_ID,
      status: "BLOCKED",
      decision: "BLOCK"
    }
  },
  {
    name: "GENESIS_PENDING_REVIEW",
    input: {
      previous_hash: "GENESIS",
      execution_id: EXECUTION_ID,
      status: "PENDING_REVIEW",
      decision: "REVIEW"
    }
  },
  {
    name: "GENESIS_COMMITTED_APPROVE",
    input: {
      previous_hash: "GENESIS",
      execution_id: EXECUTION_ID,
      status: "COMMITTED",
      decision: "APPROVE"
    }
  },
  {
    name: "CHAIN_SECOND_LINK",
    input: {
      previous_hash: null,
      execution_id: EXECUTION_ID,
      status: "BLOCKED",
      decision: "BLOCK"
    },
    chainFrom: "GENESIS_APPROVED_APPROVE"
  },
  {
    name: "OPERATOR_NORMALIZED_BLOCK",
    input: {
      previous_hash: "GENESIS",
      execution_id: EXECUTION_ID,
      status: "BLOCKED",
      decision: "BLOCK"
    }
  }
];

const computed = new Map();

for (const vector of vectors) {
  let previous_hash = vector.input.previous_hash;

  if (vector.chainFrom) {
    const prior = computed.get(vector.chainFrom);
    if (!prior) throw new Error(`Missing chain parent: ${vector.chainFrom}`);
    previous_hash = prior;
  }

  const entry_hash = buildLedgerHash({
    ...vector.input,
    previous_hash: previous_hash || "GENESIS",
    payload: vector.input.payload || {}
  });

  if (!entry_hash || entry_hash.length !== 64) {
    throw new Error(`${vector.name}: invalid hash length`);
  }

  computed.set(vector.name, entry_hash);
  console.log(`${vector.name}=${entry_hash}`);
}

if (computed.get("GENESIS_BLOCKED_BLOCK") === computed.get("OPERATOR_NORMALIZED_BLOCK")) {
  console.log("parity=BLOCKED_BLOCK_MATCH");
}

console.log(`formula=${LEDGER_HASH_FORMULA_ID}`);
console.log("LEDGER_HASH_VECTORS_OK");
