import { requireInternalKey } from "../../services/auth.js";
import { db } from "../../services/db.js";
import { buildLedgerHash } from "../../services/ledger.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, {
        ok: false,
        error: { code: "METHOD_NOT_ALLOWED", message: "POST required." }
      });
    }

    const auth = requireInternalKey(req);
    if (!auth.ok) {
      return json(res, 401, {
        ok: false,
        error: { code: auth.error || "UNAUTHORIZED", message: "Invalid EXECUTIA internal key." }
      });
    }

    const supabase = db();
    const body = req.body || {};
    const execution_id = body.execution_id;

    if (!execution_id) {
      return json(res, 400, {
        ok: false,
        error: { code: "EXECUTION_ID_REQUIRED", message: "execution_id is required." }
      });
    }

    // --- 1. Fetch execution ---
    const { data: execution, error: executionError } = await supabase
      .from("execution_results")
      .select("*")
      .eq("execution_id", execution_id)
      .single();

    if (executionError || !execution) {
      return json(res, 404, {
        ok: false,
        error: {
          code: "EXECUTION_NOT_FOUND",
          message: executionError?.message || "Execution not found."
        }
      });
    }

    if (execution.status !== "APPROVED") {
      return json(res, 409, {
        ok: false,
        error: {
          code: "EXECUTION_NOT_APPROVED",
          message: "Only APPROVED executions can be committed.",
          status: execution.status
        }
      });
    }

    // --- 2. Resolve amount / currency from nested payload ---
    const payload      = execution.payload || {};
    const amount       = Number(payload?.payload?.amount)   || Number(payload?.amount)   || Number(body.amount)   || 0;
    const currency     = payload?.payload?.currency         || payload?.currency         || body.currency         || "EUR";
    const debit_account  = body.debit_account  || "INFRA_EXP";
    const credit_account = body.credit_account || "BANK";

    // --- 3. ledger_entries (schema: execution_id, status, previous_hash, entry_hash, payload) ---
    const { data: previousLedger } = await supabase
      .from("ledger_entries")
      .select("entry_hash")
      .order("created_at", { ascending: false })
      .limit(1);

    const previous_hash = previousLedger?.[0]?.entry_hash || "GENESIS";

    const ledgerPayload = {
      execution_id,
      actor:         execution.actor,
      subject:       execution.subject,
      status:        "COMMITTED",
      decision:      "APPROVE",
      debit_account,
      credit_account,
      amount,
      currency,
      previous_hash,
      committed_at:  new Date().toISOString()
    };

    const entry_hash = buildLedgerHash({ previous_hash, execution_id, status: "COMMITTED", payload: ledgerPayload, decision: "APPROVE" });

    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from("ledger_entries")
      .insert({
        execution_id,
        status:        "COMMITTED",
        previous_hash,
        entry_hash,
        payload:       ledgerPayload
      })
      .select()
      .single();

    if (ledgerError) throw ledgerError;

    // --- 4. core_ledger (schema: execution_id, transaction_type, actor, amount, currency,
    //        debit_account, credit_account, status, decision, hash, prev_hash, ...) ---
    const { data: prevCore } = await supabase
      .from("core_ledger")
      .select("hash")
      .order("created_at", { ascending: false })
      .limit(1);

    const prev_hash = prevCore?.[0]?.hash || "GENESIS";

    const coreEntry = {
      execution_id,
      organization_id:  execution.organization_id || null,
      transaction_type: "EXECUTION_COMMIT",
      actor:            execution.actor,
      subject:          execution.subject,
      amount,
      currency,
      debit_account,
      credit_account,
      status:           "COMMITTED",
      decision:         "APPROVE",
      settlement_status: "PENDING",
      prev_hash,
      payload:          ledgerPayload
    };
    coreEntry.hash = buildLedgerHash({ previous_hash: prev_hash, execution_id, status: "COMMITTED", payload: coreEntry, decision: "APPROVE" });

    const { data: coreLedger, error: coreError } = await supabase
      .from("core_ledger")
      .insert(coreEntry)
      .select()
      .single();

    if (coreError) throw coreError;

    // --- 5. truth_anchors (schema: source_table, source_id, source_hash, anchor_payload) ---
    const anchor_hash = buildLedgerHash({ previous_hash: entry_hash, execution_id, status: "COMMITTED", payload: { ledger_entry_id: ledgerEntry.id, core_ledger_id: coreLedger.id }, decision: "APPROVE" });

    const { data: truthAnchor, error: anchorError } = await supabase
      .from("truth_anchors")
      .insert({
        anchor_type:   "COMMIT_PROOF",
        source_table:  "core_ledger",
        source_id:     coreLedger.id,
        source_hash:   coreLedger.hash,
        anchor_payload: {
          execution_id,
          ledger_entry_id: ledgerEntry.id,
          entry_hash,
          anchor_hash
        }
      })
      .select()
      .single();

    if (anchorError) throw anchorError;

    // --- 6. audit_events (schema: event_type, execution_id, actor, payload) ---
    await supabase.from("audit_events").insert({
      event_type:   "EXECUTION_COMMITTED",
      execution_id,
      actor:        body.actor || "EXECUTIA_COMMIT_ENGINE",
      payload: {
        ledger_entry_id:  ledgerEntry.id,
        core_ledger_id:   coreLedger.id,
        truth_anchor_id:  truthAnchor.id,
        entry_hash,
        anchor_hash
      }
    });

    // --- 7. Update execution_results status → COMMITTED ---
    const { data: updatedExecution, error: updateError } = await supabase
      .from("execution_results")
      .update({
        status:     "COMMITTED",
        decision:   "APPROVE",
        reason:     "COMMITTED_TO_LEDGER",
        updated_at: new Date().toISOString()
      })
      .eq("execution_id", execution_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return json(res, 200, {
      ok:          true,
      committed:   true,
      execution:   updatedExecution,
      ledger:      ledgerEntry,
      core_ledger: coreLedger,
      truth_anchor: truthAnchor
    });

  } catch (error) {
    console.error("[EXECUTIA COMMIT ERROR]", error.message);
    return json(res, 500, {
      ok: false,
      error: {
        code:    "COMMIT_EXECUTION_FAILED",
        message: error.message
      }
    });
  }
}
