import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Content-Type", "application/json");
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({
      ok: false,
      error: "SUPABASE_ENV_MISSING"
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
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

  function send(event, payload) {
    if (closed) return;

    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  function rowId(row) {
    return row?.execution_id || row?.id || null;
  }

  function stableStringify(value) {
    return JSON.stringify(value);
  }

  function createStateHash(rows) {
    return stableStringify(
      (rows || []).map((row) => ({
        id: row.id,
        execution_id: row.execution_id,
        status: row.status,
        result_status: row.result_status,
        authorized: row.authorized,
        hold_pending: row.hold_pending,
        reason: row.reason,
        updated_at: row.updated_at,
        created_at: row.created_at,
        payload: row.payload
      }))
    );
  }

  function findChangedRow(previous, current) {
    const prevMap = new Map(
      (previous || []).map((row) => [
        rowId(row),
        stableStringify(row)
      ])
    );

    for (const row of current || []) {
      const id = rowId(row);
      const oldHash = prevMap.get(id);
      const newHash = stableStringify(row);

      if (!oldHash || oldHash !== newHash) {
        return row;
      }
    }

    return (current || [])[0] || null;
  }

  async function fetchExecutions(limit = 25) {
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

    try {
      const executions = await fetchExecutions(25);
      const currentHash = createStateHash(executions);

      if (previousHash === null) {
        previousHash = currentHash;
        previousRows = executions;

        send("execution", {
          ok: true,
          type: "initial_snapshot",
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
          table: "executions",
          execution: changedRow,
          execution_id: rowId(changedRow),
          status: changedRow?.status || changedRow?.result_status || null,
          reason: changedRow?.reason || changedRow?.payload?.reason || null,
          timestamp: new Date().toISOString()
        });

        send("execution", {
          ok: true,
          type: "change_snapshot",
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
    events: ["connected", "execution", "change", "heartbeat", "error"],
    interval_ms: 2000,
    timestamp: new Date().toISOString()
  });

  await checkForChanges();

  const interval = setInterval(checkForChanges, 2000);

  req.on("close", () => {
    closed = true;
    clearInterval(interval);

    try {
      res.end();
    } catch {}
  });
}
