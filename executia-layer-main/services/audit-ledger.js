import { db } from "./db.js";

export async function auditLedgerIntegrity() {
  // 1. Rebuild expected balances from settled ledger entries (source of truth)
  const { data: ledger, error: ledgerError } = await db()
    .from("core_ledger")
    .select("*")
    .order("created_at", { ascending: true });

  if (ledgerError) throw ledgerError;

  const expectedBalances = {};
  let totalDebited  = 0;
  let totalCredited = 0;
  let settledCount  = 0;

  for (const row of ledger || []) {
    if (row.settlement_status !== "SETTLED") continue;
    if (!row.debit_account && !row.credit_account) continue;

    const amount = Number(row.gross_amount || row.amount || 0);
    if (!isFinite(amount)) continue;

    settledCount++;

    if (row.debit_account) {
      expectedBalances[row.debit_account]  = (expectedBalances[row.debit_account]  || 0) + amount;
      totalDebited += amount;
    }
    if (row.credit_account) {
      expectedBalances[row.credit_account] = (expectedBalances[row.credit_account] || 0) - amount;
      totalCredited += amount;
    }
  }

  // 2. Double-entry invariant: total debits must equal total credits
  const doubleEntryValid = Math.abs(totalDebited - totalCredited) < 0.001;

  // 3. Compare expected vs actual account balances
  const { data: accounts, error: accError } = await db()
    .from("ledger_accounts")
    .select("*");

  if (accError) throw accError;

  const mismatches = [];

  for (const acc of accounts || []) {
    const ledgerDelta = Number(expectedBalances[acc.account_code] || 0);
    const opening     = Number(acc.opening_balance || 0);
    const expected    = opening + ledgerDelta;
    const actual      = Number(acc.balance || 0);

    if (Math.abs(expected - actual) > 0.001) {
      mismatches.push({
        account:          acc.account_code,
        type:             acc.account_type,
        opening_balance:  Number(opening.toFixed(2)),
        ledger_movement:  Number(ledgerDelta.toFixed(2)),
        expected_balance: Number(expected.toFixed(2)),
        actual_balance:   Number(actual.toFixed(2)),
        delta:            Number((actual - expected).toFixed(2))
      });
    }
  }

  return {
    ok:               true,
    verified:         mismatches.length === 0 && doubleEntryValid,
    double_entry:     doubleEntryValid,
    settled_entries:  settledCount,
    total_entries:    (ledger || []).length,
    accounts_checked: (accounts || []).length,
    total_debited:    Number(totalDebited.toFixed(2)),
    total_credited:   Number(totalCredited.toFixed(2)),
    mismatches
  };
}
