import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false
      }
    }
  );
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function loadExecutions(limit = 25) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("execution_ledger")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  try {
    sendEvent(res, "connected", {
      ok: true,
      status: "STREAM_CONNECTED",
      at: new Date().toISOString()
    });

    const executions = await loadExecutions(25);

    sendEvent(res, "execution", {
      ok: true,
      executions,
      at: new Date().toISOString()
    });

    const heartbeat = setInterval(async () => {
      try {
        sendEvent(res, "heartbeat", {
          ok: true,
          status: "REALTIME_ACTIVE",
          at: new Date().toISOString()
        });

        const latest = await loadExecutions(25);

        sendEvent(res, "execution", {
          ok: true,
          executions: latest,
          at: new Date().toISOString()
        });
      } catch (error) {
        sendEvent(res, "error", {
          ok: false,
          error: "STREAM_LOAD_FAILED",
          message: error.message,
          at: new Date().toISOString()
        });
      }
    }, 6000);

    req.on("close", () => {
      clearInterval(heartbeat);
      res.end();
    });
  } catch (error) {
    sendEvent(res, "error", {
      ok: false,
      error: "STREAM_FAILED",
      message: error.message,
      at: new Date().toISOString()
    });

    res.end();
  }
}
