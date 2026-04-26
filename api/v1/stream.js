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
  let lastStateHash = null;
  let lastLatestId = null;

  function send(event, payload) {
    if (closed) return;

    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  function createStateHash(rows) {
    return JSON.stringify(
      (rows || []).map((e) => ({
        id: e.id,
        execution_id: e.execution_id,
        status: e.status,
        result_status: e.result_status,
        authorized: e.authorized,
        hold_pending: e.hold_pending,
        reason: e.reason,
        updated_at: e.updated_at,
        created_at: e.created_at
      }))
    );
  }

  async function fetchExecutions(limit = 25) {
    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function emitSnapshot(type = "snapshot") {
    try {
      const executions = await fetchExecutions(25);

      send("execution", {
        ok: true,
        type,
        executions,
        timestamp: new Date().toISOString()
      });

      return executions;
    } catch (err) {
      send("error", {
        ok: false,
        error: "SNAPSHOT_FAILED",
        detail: err.message || String(err),
        timestamp: new Date().toISOString()
      });

      return [];
    }
  }

  async function checkForChanges() {
    if (closed) return;

    try {
      const executions = await fetchExecutions(25);
      const currentHash = createStateHash(executions);
      const latest = executions[0] || null;
      const latestId = latest?.execution_id || latest?.id || null;

      if (lastStateHash === null) {
        lastStateHash = currentHash;
        lastLatestId = latestId;

        send("execution", {
          ok: true,
          type: "initial_snapshot",
          executions,
          timestamp: new Date().toISOString()
        });

        return;
      }

      if (currentHash !== lastStateHash) {
        const previousHash = lastStateHash;
        const previousLatestId = lastLatestId;

        lastStateHash = currentHash;
        lastLatestId = latestId;

        send("change", {
          ok: true,
          type: "deterministic_db_change",
          table: "executions",
          execution: latest,
          execution_id: latestId,
          previous_latest_id: previousLatestId,
          status: latest?.status || latest?.result_status || null,
          reason: latest?.reason || latest?.payload?.reason || null,
          previous_hash: previousHash,
          current_hash: currentHash,
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
        latest_id: latestId,
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
    mode: "deterministic-db-change-stream",
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
