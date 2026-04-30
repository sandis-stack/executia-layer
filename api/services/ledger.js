/**
 * EXECUTIA™ — /api/services/ledger.js
 *
 * Centralized ledger service.
 * All execution events are written through this single function.
 *
 * Chain integrity:
 *   prev_hash = truth_hash of the last ledger entry (global, not per-execution)
 *   truth_hash = sha256(execution_id + event_type + actor + payload + prev_hash + timestamp)
 *
 * Principle:
 *   audit_logs = readable trace
 *   execution_ledger = immutable truth chain
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_ENV_MISSING");
  return createClient(url, key, { auth: { persistSession: false } });
}

function hash(input) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

/**
 * Writes a single event to the execution_ledger.
 * Resolves prev_hash from the last global ledger entry.
 * Returns the created ledger row.
 *
 * @param {object} params
 * @param {string} params.execution_id
 * @param {string} params.event_type
 * @param {string} params.actor
 * @param {object} [params.payload]
 * @returns {Promise<object>} ledger row
 */
export async function writeLedgerEvent({ execution_id, event_type, actor, payload = {} }) {
  const supabase      = getSupabase();
  const hash_timestamp = new Date().toISOString();  // captured before hash computation

  // Get last global entry for chain integrity
  const { data: last } = await supabase
    .from("execution_ledger")
    .select("truth_hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prev_hash = last?.truth_hash || null;

  // truth_hash uses hash_timestamp — must match ledger-verify reconstruction exactly
  const ledgerPayload = { execution_id, event_type, actor, payload, prev_hash, timestamp: hash_timestamp };
  const truth_hash    = hash(ledgerPayload);

  const { data, error } = await supabase
    .from("execution_ledger")
    .insert({ execution_id, event_type, actor, payload, prev_hash, truth_hash, hash_timestamp })
    .select("id, execution_id, event_type, actor, truth_hash, prev_hash, hash_timestamp, created_at")
    .single();

  if (error) throw new Error(`LEDGER_WRITE_FAILED: ${error.message}`);

  return data;
}
