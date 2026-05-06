import { db } from "./db.js";
import { runRealTimeAudit } from "./real-time-audit.js";
import { anchorTruth } from "./truth-anchor.js";
import { nowIso } from "../shared/crypto.js";

async function getBalance(account_code) {
  const { data, error } = await db()
    .from("ledger_accounts")
    .select("balance")
    .eq("account_code", account_code)
    .single();

  if (error) throw new Error(`Account not found: ${account_code}`);
  return Number(data.balance);
}

async function setBalance(account_code, balance) {
  const { error } = await db()
    .from("ledger_accounts")
    .update({ balance })
    .eq("account_code", account_code);

  if (error) throw error;
}

export async function settleLedgerEntry(ledgerId) {
  const { data: entry, error: entryError } = await db()
    .from("core_ledger")
    .select("*")
    .eq("id", ledgerId)
    .single();

  if (entryError) throw entryError;
  if (!entry) throw new Error("LEDGER_ENTRY_NOT_FOUND");

  if (entry.settlement_status === "SETTLED") {
    return entry;
  }

  if (!entry.debit_account || !entry.credit_account) {
    throw new Error("DEBIT_CREDIT_REQUIRED");
  }

  const amount = Number(entry.gross_amount || entry.amount || 0);

  // Snapshot balances before mutation — needed for rollback
  const debitBefore  = await getBalance(entry.debit_account);
  const creditBefore = await getBalance(entry.credit_account);

  try {
    // Double-entry: debit account increases, credit account decreases
    await setBalance(entry.debit_account,  debitBefore  + amount);
    await setBalance(entry.credit_account, creditBefore - amount);

    const { data: settled, error: settleError } = await db()
      .from("core_ledger")
      .update({
        settlement_status: "SETTLED",
        settled_at:        nowIso()
      })
      .eq("id", ledgerId)
      .select()
      .single();

    if (settleError) throw settleError;

    // TRUTH ANCHOR — only on confirmed SETTLED entries, never on pending/committed
    anchorTruth({
      source_table:   "core_ledger",
      source_id:      settled.id,
      source_hash:    settled.hash,
      anchor_type:    "INTERNAL_TIMESTAMP",
      anchor_payload: {
        transaction_type: settled.transaction_type,
        execution_id:     settled.execution_id,
        status:           "SETTLED",
        settled_at:       settled.settled_at
      }
    }).catch(() => {});

    // Post-settlement audit — best-effort, never blocks return
    runRealTimeAudit({ source: "SETTLEMENT", actor: "system" }).catch(() => {});

    return settled;

  } catch (err) {
    // Rollback: restore both balances to pre-mutation state
    await setBalance(entry.debit_account,  debitBefore).catch(() => {});
    await setBalance(entry.credit_account, creditBefore).catch(() => {});
    throw err;
  }
}

export async function getAccountBalances() {
  const { data, error } = await db()
    .from("ledger_accounts")
    .select("*")
    .order("account_type", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPendingSettlements() {
  const { data, error } = await db()
    .from("core_ledger")
    .select("*")
    .eq("settlement_status", "PENDING")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}
