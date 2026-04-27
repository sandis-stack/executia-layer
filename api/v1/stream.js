import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ ok: false, error: "SUPABASE_ENV_MISSING" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  let closed = false;
  let previousRows = [];
  let previousHash = null;

  const startedAt = Date.now();
  const MAX_STREAM_MS = 25_000;
  const INTERVAL_MS = 2_000;

  function send(event, payload) {
    if (closed) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  function rowId(row) {
    return row?.execution_id || row?.id || row?.request_id || null;
  }

  function normalizeRow(row) {
    return {
      id: row.id,
      execution_id: row.execution_id,
      status: row.status,
      decision: row.decision,
      result_status: row.result_status,
      ledger_decision: row.ledger_decision,
      authorized: row.authorized,
      hold_pending: row.hold_pending,
      reason: row.reason,
      updated_at: row.updated_at,
      created_at: row.created_at,
      truth_hash: row.truth_hash,
      payload: row.payload
    };
  }

  function stableHash(rows) {
    return JSON.stringify((rows || []).map(normalizeRow));
  }

  function findChangedRow(previous, current) {
    const prevMap = new Map(
      (previous || []).map((row) => [rowId(row), JSON.stringify(normalizeRow(row))])
    );

    for (const row of current || []) {
      const id = rowId(row);
      const oldHash = prevMap.get(id);
      const newHash = JSON.stringify(normalizeRow(row));

      if (!oldHash || oldHash !== newHash) return row;
    }

    return current?.[0] || null;
  }

  async function fetchExecutions(limit = 50) {
    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async function checkForChanges() {
    if (closed) return;

    if (Date.now() - startedAt > MAX_STREAM_MS) {
      send("stream_restart", {
        ok: true,
        type: "stream_restart",
        reason: "VERCEL_STREAM_LIFETIME_LIMIT",
        reconnect: true,
        timestamp: new Date().toISOString()
      });

      closed = true;
      try { res.end(); } catch {}
      return;
    }

    try {
      const executions = await fetchExecutions(50);
      const currentHash = stableHash(executions);

      if (previousHash === null) {
        previousHash = currentHash;
        previousRows = executions;

        send("execution", {
          ok: true,
          type: "initial_snapshot",
          mode: "merge_snapshot",
          executions,
          timestamp: new Date().toISOString()
        });

        return;
      }

      if (currentHash !== previousHash) {
        const changedRow = findChangedRow(previousRows, executions);

        previousHash = currentHash;
        previousRows = executions;

        send("change", {
          ok: true,
          type: "deterministic_db_change",
          mode: "merge_change",
          table: "executions",
          execution: changedRow,
          execution_id: rowId(changedRow),
          status: changedRow?.status || changedRow?.result_status || changedRow?.decision || null,
          reason: changedRow?.reason || changedRow?.payload?.reason || null,
          timestamp: new Date().toISOString()
        });

        send("execution", {
          ok: true,
          type: "change_snapshot",
          mode: "merge_snapshot",
          executions,
          timestamp: new Date().toISOString()
        });

        return;
      }

      send("heartbeat", {
        ok: true,
        type: "heartbeat",
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      send("error", {
        ok: false,
        error: "STREAM_CHECK_FAILED",
        detail: err.message || String(err),
        timestamp: new Date().toISOString()
      });
    }
  }

  send("connected", {
    ok: true,
    service: "EXECUTIA STREAM",
    mode: "deterministic-db-diff-stream",
    events: ["connected", "execution", "change", "heartbeat", "error", "stream_restart"],
    interval_ms: INTERVAL_MS,
    max_stream_ms: MAX_STREAM_MS,
    timestamp: new Date().toISOString()
  });

  await checkForChanges();

  const interval = setInterval(checkForChanges, INTERVAL_MS);

  req.on("close", () => {
    closed = true;
    clearInterval(interval);
    try { res.end(); } catch {}
  });
}
