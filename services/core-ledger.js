import { sha256, stableStringify } from "../shared/crypto.js";
import { db } from "./db.js";

export function calculateLedgerAmounts({ amount, tax_rate = 0 }) {
  const net_amount   = Number(amount || 0);
  const tax_amount   = Number(((net_amount * Number(tax_rate || 0)) / 100).toFixed(2));
  const gross_amount = Number((net_amount + tax_amount).toFixed(2));
  return { net_amount, tax_amount, gross_amount };
}

export function buildLedgerHash(entry, prevHash = "GENESIS") {
  return sha256(stableStringify({
    execution_id:     entry.execution_id     || null,
    transaction_type: entry.transaction_type || null,
    actor:            entry.actor            || null,
    counterparty:     entry.counterparty     || null,
    amount:           entry.amount           ?? 0,
    currency:         entry.currency         || "EUR",
    debit_account:    entry.debit_account    || null,
    credit_account:   entry.credit_account   || null,
    tax_type:         entry.tax_type         || null,
    tax_rate:         entry.tax_rate         ?? 0,
    tax_amount:       entry.tax_amount       ?? 0,
    net_amount:       entry.net_amount       ?? 0,
    gross_amount:     entry.gross_amount     ?? 0,
    status:           entry.status           || null,
    decision:         entry.decision         || null,
    prev_hash:        prevHash
  }));
}

export async function commitCoreLedgerTransaction(input) {
  const amounts = calculateLedgerAmounts(input);

  const { data: previousRows, error: previousError } = await db()
    .from("core_ledger")
    .select("hash")
    .order("created_at", { ascending: false })
    .limit(1);

  if (previousError) throw previousError;

  const prev_hash = previousRows?.[0]?.hash || "GENESIS";

  const entry = {
    execution_id:     input.execution_id     || null,
    organization_id:  input.organization_id  || null,
    transaction_type: input.transaction_type || "EXECUTION_TRANSACTION",
    actor:            input.actor,
    counterparty:     input.counterparty     || null,
    subject:          input.subject          || null,
    amount:           Number(input.amount    || 0),
    currency:         input.currency         || "EUR",
    debit_account:    input.debit_account    || null,
    credit_account:   input.credit_account   || null,
    tax_type:         input.tax_type         || null,
    tax_rate:         Number(input.tax_rate  || 0),
    net_amount:       amounts.net_amount,
    tax_amount:       amounts.tax_amount,
    gross_amount:     amounts.gross_amount,
    status:           input.status           || "COMMITTED",
    decision:         input.decision         || "APPROVE",
    payload:          {
      ...(input.payload || {}),
      reconciliation_state: input.reconciliation_state || input.payload?.reconciliation_state || "PENDING"
    },
    settlement_status: input.settlement_status || input.payload?.settlement_state || "PENDING",
    prev_hash
  };

  entry.hash = buildLedgerHash(entry, prev_hash);

  let { data, error } = await db()
    .from("core_ledger")
    .insert(entry)
    .select()
    .single();

  if (error && String(error.message || "").includes("organization_id")) {
    const fallbackEntry = { ...entry };
    delete fallbackEntry.organization_id;

    const fallback = await db()
      .from("core_ledger")
      .insert(fallbackEntry)
      .select()
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  return data;
}

export async function verifyCoreLedgerChain() {
  const { data, error } = await db()
    .from("core_ledger")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  let tampered = null;

  for (const row of data || []) {
    const expected = buildLedgerHash(row, row.prev_hash || "GENESIS");
    if (row.hash !== expected) {
      tampered = row.id;
      break;
    }
  }

  return {
    verified: tampered === null,
    entries:  (data || []).length,
    ...(tampered ? { tampered_id: tampered } : {})
  };
}
