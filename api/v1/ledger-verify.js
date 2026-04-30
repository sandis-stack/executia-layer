/**
 * EXECUTIA™ — /api/v1/ledger-verify
 *
 * Verifies the integrity of the execution_ledger chain.
 *
 * For each entry, checks:
 *   1. truth_hash can be recreated from stored fields + hash_timestamp
 *   2. prev_hash matches the previous entry's truth_hash
 *   3. The full chain is unbroken
 *
 * Principle:
 *   audit_logs    = readable trace
 *   execution_ledger = immutable truth chain
 *   ledger-verify = proof that truth was not modified
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(payload);
}

function hash(input) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

function recreateHash(row) {
  // Must match the exact structure used in ledger.js writeLedgerEvent
  return hash({
    execution_id: row.execution_id,
    event_type:   row.event_type,
    actor:        row.actor,
    payload:      row.payload || {},
    prev_hash:    row.prev_hash,
    timestamp:    row.hash_timestamp
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")    return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { ok: false, error: "SUPABASE_ENV_MISSING" });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    // Optional: filter by execution_id
    const execution_id = req.query?.execution_id || null;

    let query = supabase
      .from("execution_ledger")
      .select("id, execution_id, event_type, actor, payload, prev_hash, truth_hash, hash_timestamp, created_at")
      .order("created_at", { ascending: true });

    if (execution_id) {
      query = query.eq("execution_id", execution_id);
    }

    const { data, error } = await query;

    if (error) {
      return json(res, 500, { ok: false, error: "LEDGER_READ_FAILED", message: error.message });
    }

    if (!data || data.length === 0) {
      return json(res, 200, {
        ok:            true,
        source:        "EXECUTIA_LEDGER",
        total_records: 0,
        chain_status:  "EMPTY"
      });
    }

    const errors = [];
    let previousHash = null;

    for (const row of data) {
      // Check 1: prev_hash links correctly to previous entry
      if (row.prev_hash !== previousHash) {
        errors.push({
          id:            row.id,
          execution_id:  row.execution_id,
          event_type:    row.event_type,
          created_at:    row.created_at,
          error:         "PREV_HASH_MISMATCH",
          expected:      previousHash,
          actual:        row.prev_hash
        });
      }

      // Check 2: truth_hash can be recreated from stored fields
      const recreated = recreateHash(row);
      if (recreated !== row.truth_hash) {
        errors.push({
          id:            row.id,
          execution_id:  row.execution_id,
          event_type:    row.event_type,
          created_at:    row.created_at,
          error:         "TRUTH_HASH_MISMATCH",
          recreated,
          stored:        row.truth_hash
        });
      }

      previousHash = row.truth_hash;
    }

    const valid = errors.length === 0;

    // Audit the verification itself — best-effort
    await supabase
      .from("audit_logs")
      .insert({
        execution_id:  execution_id || null,
        event_type:    valid ? "LEDGER_VERIFICATION_PASSED" : "LEDGER_VERIFICATION_FAILED",
        actor:         "EXECUTIA_LEDGER",
        message:       valid
          ? `Ledger chain verified: ${data.length} entries, chain intact.`
          : `Ledger chain verification failed: ${errors.length} error(s) in ${data.length} entries.`,
        payload:       { total_records: data.length, errors_count: errors.length, scoped_to: execution_id }
      })
      .catch(err => console.error("VERIFY_AUDIT_FAILED:", err.message));

    return json(res, 200, {
      ok:            valid,
      source:        "EXECUTIA_LEDGER",
      total_records: data.length,
      chain_status:  valid ? "VALID" : "BROKEN",
      ...(execution_id ? { execution_id } : {}),
      ...(errors.length > 0 ? { errors } : {})
    });

  } catch (err) {
    return json(res, 500, { ok: false, error: "VERIFY_ENGINE_ERROR", message: err.message });
  }
}
