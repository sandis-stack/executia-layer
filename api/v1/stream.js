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

  const send = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  let closed = false;

  async function sendSnapshot() {
    const { data, error } = await supabase
      .from("executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      send("error", {
        ok: false,
        error: "SNAPSHOT_QUERY_FAILED",
        detail: error.message
      });
      return;
    }

    send("execution", {
      ok: true,
      type: "snapshot",
      executions: data || [],
      timestamp: new Date().toISOString()
    });
  }

  send("connected", {
    ok: true,
    service: "EXECUTIA STREAM",
    mode: "supabase-realtime",
    timestamp: new Date().toISOString()
  });

  await sendSnapshot();

  const channel = supabase
    .channel("executia-executions-stream")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "executions"
      },
      async (payload) => {
        if (closed) return;

        send("change", {
          ok: true,
          type: "postgres_change",
          eventType: payload.eventType,
          execution: payload.new || payload.old || null,
          old: payload.old || null,
          timestamp: new Date().toISOString()
        });

        await sendSnapshot();
      }
    )
    .subscribe((status) => {
      send("realtime_status", {
        ok: true,
        status,
        timestamp: new Date().toISOString()
      });
    });

  const heartbeat = setInterval(() => {
    if (!closed) {
      send("heartbeat", {
        ok: true,
        type: "heartbeat",
        timestamp: new Date().toISOString()
      });
    }
  }, 25000);

  req.on("close", async () => {
    closed = true;
    clearInterval(heartbeat);

    try {
      await supabase.removeChannel(channel);
    } catch {}

    res.end();
  });
}
