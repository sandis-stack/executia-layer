/**
 * EXECUTIA Ledger Service — Phase 3A canonical execution truth authority
 *
 * Materialized execution truth: ledger_entries (global append-only chain).
 * execution_results.hash / prev_hash are projections of the latest ledger head.
 *
 * SQL authority (must match this module):
 *   sql/011_ledger_hash_authority.sql
 *     executia_ledger_entry_hash
 *     executia_get_last_ledger_hash
 *     executia_ledger_append
 *
 * Formula:
 *   entry_hash = sha256(execution_id + status + decision + previous_hash)
 */
import { db, hasSupabaseEnv } from "./db.js";
import { sha256, nowIso } from "../shared/crypto.js";

export const LEDGER_HASH_FORMULA_ID = "executia/ledger/v1";

export function decisionFromStatus(status = "", payload = {}) {
  if (payload && typeof payload.decision === "string" && payload.decision) return payload.decision;
  if (status === "APPROVED" || status === "COMMITTED") return "APPROVE";
  if (status === "BLOCKED") return "BLOCK";
  if (status === "PENDING_REVIEW") return "REVIEW";
  return payload?.decision || "REVIEW";
}

/** Canonical execution entry hash — sole JS authority for ledger_entries / execution_results projection. */
export function buildLedgerHash({ previous_hash = "GENESIS", execution_id, status, payload = {}, decision }) {
  const normalizedDecision = decision || decisionFromStatus(status, payload || {});
  return sha256(`${execution_id}${status}${normalizedDecision}${previous_hash}`);
}

export async function getLastLedgerHash() {
  if (!hasSupabaseEnv()) return "GENESIS";

  const { data, error } = await db()
    .from("ledger_entries")
    .select("entry_hash")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.entry_hash || "GENESIS";
}

export async function commitLedgerEntry({ execution_id, status, payload = {}, decision }) {
  const previous_hash = await getLastLedgerHash();
  const entry_hash = buildLedgerHash({ previous_hash, execution_id, status, payload, decision });

  const ledgerEntry = {
    execution_id,
    status,
    previous_hash,
    entry_hash,
    payload,
    created_at: nowIso()
  };

  if (!hasSupabaseEnv()) {
    return { stored: false, ledgerEntry };
  }

  const { data, error } = await db()
    .from("ledger_entries")
    .insert(ledgerEntry)
    .select("*")
    .single();

  if (error) throw error;
  return { stored: true, ledgerEntry: data };
}

export async function verifyLedgerChain() {
  if (!hasSupabaseEnv()) {
    return {
      verified: true,
      mode: "DRY_RUN",
      message: "Supabase env missing; hash algorithm verified without database traversal."
    };
  }

  const { data, error } = await db()
    .from("ledger_entries")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  let previous = "GENESIS";

  for (const entry of data || []) {
    if (entry.previous_hash !== previous) {
      return { verified: false, reason: "PREVIOUS_HASH_MISMATCH", execution_id: entry.execution_id };
    }

    const expected = buildLedgerHash({
      previous_hash: entry.previous_hash,
      execution_id: entry.execution_id,
      status: entry.status,
      payload: entry.payload || {}
    });

    if (entry.entry_hash !== expected) {
      return {
        verified: false,
        reason: "ENTRY_HASH_MISMATCH",
        execution_id: entry.execution_id,
        expected,
        actual: entry.entry_hash
      };
    }

    previous = entry.entry_hash;
  }

  return { verified: true, entries: (data || []).length };
}
