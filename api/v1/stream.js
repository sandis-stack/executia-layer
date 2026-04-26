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

  function send(event, payload) {
    if (closed) return;

    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  async function sendSnapshot(reason = "snapshot") {
    try {
      const { data, error } = await supabase
        .from("executions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) {
        send("error", {
          ok: false,
          error: "SNAPSHOT_QUERY_FAILED",
          detail: error.message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      send("execution", {
        ok: true,
        type: reason,
        executions: data || [],
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      send("error", {
        ok: false,
        error: "SNAPSHOT_INTERNAL_ERROR",
        detail: err.message || String(err),
        timestamp: new Date().toISOString()
      });
    }
  }

  send("connected", {
    ok: true,
    service: "EXECUTIA STREAM",
    mode: "supabase-realtime",
    events: ["connected", "execution", "change", "heartbeat", "realtime_status", "error"],
    timestamp: new Date().toISOString()
  });

  await sendSnapshot("initial_snapshot");

  const channel = supabase
    .channel("executia-executions-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "executions"
      },
      async (payload) => {
        if (closed) return;

        const row = payload.new || payload.old || null;

        send("change", {
          ok: true,
          type: "postgres_change",
          eventType: payload.eventType,
          table: "executions",
          execution: row,
          old: payload.old || null,
          new: payload.new || null,
          execution_id: row?.execution_id || row?.id || null,
          status: row?.status || row?.result_status || null,
          reason: row?.reason || row?.payload?.reason || null,
          timestamp: new Date().toISOString()
        });

        await sendSnapshot("change_snapshot");
      }
    )
    .subscribe((status, err) => {
      send("realtime_status", {
        ok: !err,
        status,
        error: err?.message || null,
        timestamp: new Date().toISOString()
      });
    });

  const heartbeat = setInterval(() => {
    send("heartbeat", {
      ok: true,
      type: "heartbeat",
      timestamp: new Date().toISOString()
    });
  }, 20000);

  req.on("close", async () => {
    closed = true;
    clearInterval(heartbeat);

    try {
      await supabase.removeChannel(channel);
    } catch {}

    try {
      res.end();
    } catch {}
  });
}
