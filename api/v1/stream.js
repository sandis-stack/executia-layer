import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs"
};

const STREAM_INTERVAL_MS = 2000;
const STREAM_MAX_AGE_MS = 25000;
const EXECUTION_LIMIT = 25;

function send(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function rowId(row) {
  return row?.execution_id || row?.id || row?.request_id || null;
}

function stableExecutionState(rows) {
  return JSON.stringify(
    (rows || []).map((row) => ({
      id: row.id,
      execution_id: row.execution_id,
      request_id: row.request_id,
      status: row.status,
      result_status: row.result_status,
      decision: row.decision,
      authorized: row.authorized,
      hold_pending: row.hold_pending,
      reason: row.reason,
      truth_hash: row.truth_hash || row.payload?.truth_hash || null,
      updated_at: row.updated_at,
      created_at: row.created_at
    }))
  );
}

function findChangedRow(previousRows, currentRows) {
  const previousMap = new Map(
    (previousRows || []).map((row) => [
      rowId(row),
      JSON.stringify(row)
    ])
  );

  for (const row of currentRows || []) {
    const id = rowId(row);
    const oldHash = previousMap.get(id);
    const newHash = JSON.stringify(row);

    if (!oldHash || oldHash !== newHash) {
      return row;
    }
  }

  return (currentRows || [])[0] || null;
}

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
    "Content-Type": "text/event-stream; charset=utf-8",
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
  const startedAt = Date.now();

  async function fetchExecutions() {
    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(EXECUTION_LIMIT);

    if (error) throw error;
    return data || [];
  }

  async function tick() {
    if (closed) return;

    const age = Date.now() - startedAt;

    if (age >= STREAM_MAX_AGE_MS) {
      send(res, "stream_restart", {
        ok: true,
        type: "stream_restart",
        reason: "controlled_stream_rotation",
        max_stream_ms: STREAM_MAX_AGE_MS,
        timestamp: new Date().toISOString()
      });

      closed = true;
      clearInterval(interval);

      try {
        res.end();
      } catch {}

      return;
    }

    try {
      const executions = await fetchExecutions();
      const currentHash = stableExecutionState(executions);

      if (previousHash === null) {
        previousHash = currentHash;
        previousRows = executions;

        send(res, "execution", {
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

        send(res, "change", {
          ok: true,
          type: "deterministic_db_change",
          table: "executions",
          execution: changedRow,
          execution_id: rowId(changedRow),
          status: changedRow?.status || changedRow?.result_status || changedRow?.decision || null,
          reason: changedRow?.reason || changedRow?.payload?.reason || null,
          timestamp: new Date().toISOString()
        });

        send(res, "execution", {
          ok: true,
          type: "change_snapshot",
          executions,
          timestamp: new Date().toISOString()
        });

        return;
      }

      send(res, "heartbeat", {
        ok: true,
        type: "heartbeat",
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      send(res, "error", {
        ok: false,
        error: "STREAM_CHECK_FAILED",
        detail: err.message || String(err),
        timestamp: new Date().toISOString()
      });
    }
  }

  send(res, "connected", {
    ok: true,
    service: "EXECUTIA STREAM",
    mode: "controlled-db-diff-stream",
    events: [
      "connected",
      "execution",
      "change",
      "heartbeat",
      "stream_restart",
      "error"
    ],
    interval_ms: STREAM_INTERVAL_MS,
    max_stream_ms: STREAM_MAX_AGE_MS,
    timestamp: new Date().toISOString()
  });

  await tick();

  const interval = setInterval(tick, STREAM_INTERVAL_MS);

  req.on("close", () => {
    closed = true;
    clearInterval(interval);

    try {
      res.end();
    } catch {}
  });
}
