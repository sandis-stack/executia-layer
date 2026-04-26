import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Content-Type", "application/json");
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    send("error", {
      ok: false,
      error: "SUPABASE_ENV_MISSING"
    });
    res.end();
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let closed = false;
  let lastId = null;

  async function poll() {
    if (closed) return;

    try {
      let query = supabase
        .from("executions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const { data, error } = await query;

      if (error) {
        send("error", {
          ok: false,
          error: "STREAM_QUERY_FAILED",
          detail: error.message
        });
        return;
      }

      const latest = data?.[0] || null;

      if (latest && latest.id !== lastId) {
        lastId = latest.id;

        send("execution", {
          ok: true,
          type: "execution",
          execution: latest,
          executions: data || [],
          timestamp: new Date().toISOString()
        });
      } else {
        send("heartbeat", {
          ok: true,
          type: "heartbeat",
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      send("error", {
        ok: false,
        error: "STREAM_INTERNAL_ERROR",
        detail: err.message || String(err)
      });
    }
  }

  send("connected", {
    ok: true,
    service: "EXECUTIA STREAM",
    mode: "polling-sse",
    timestamp: new Date().toISOString()
  });

  await poll();

  const interval = setInterval(poll, 5000);

  req.on("close", () => {
    closed = true;
    clearInterval(interval);
    res.end();
  });
}
