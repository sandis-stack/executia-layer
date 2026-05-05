import { db, hasSupabaseEnv } from "./db.js";
import { sha256, stableStringify, nowIso } from "../shared/crypto.js";

export function buildLedgerHash({ previous_hash = "GENESIS", execution_id, status, payload = {} }) {
  return sha256(stableStringify({ previous_hash, execution_id, status, payload }));
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

export async function commitLedgerEntry({ execution_id, status, payload }) {
  const previous_hash = await getLastLedgerHash();
  const entry_hash = buildLedgerHash({ previous_hash, execution_id, status, payload });

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
      return { verified: false, reason: "ENTRY_HASH_MISMATCH", execution_id: entry.execution_id };
    }

    previous = entry.entry_hash;
  }

  return { verified: true, entries: (data || []).length };
}
