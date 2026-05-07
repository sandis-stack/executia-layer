import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const ALLOWED = ["COMMITTED","BLOCKED","PENDING_REVIEW","FAILED","APPROVED"];

function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_ENV_MISSING");
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    realtime: { transport: ws }
  });
}

export async function requireOperator(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) throw new Error("OPERATOR_TOKEN_MISSING");

  const supabase = db();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error("OPERATOR_UNAUTHORIZED");

  return {
    supabase,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || "OPERATOR"
    }
  };
}

export async function listExecutions(supabase) {
  const { data, error } = await supabase
    .from("execution_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data || []).map(x => ({
    ...x,
    status: ALLOWED.includes(x.status) ? x.status : "PENDING_REVIEW",
    validation_result: x.validation_result || x.validation || "UNCLEAR",
    ledger_state: x.ledger_state || "HASH_LINKED",
    audit_state: x.audit_state || "RECORDED",
    reconciliation_state: x.reconciliation_state || "PENDING",
    hash_verified: Boolean(x.hash || x.ledger_hash)
  }));
}

export async function recordOperatorAction(supabase, user, body) {
  const execution_id = body?.execution_id;
  const action = body?.action;

  if (!execution_id) throw new Error("EXECUTION_ID_REQUIRED");
  if (!action) throw new Error("ACTION_REQUIRED");

  const actionMap = {
    APPROVE: "APPROVED",
    REJECT: "BLOCKED",
    ESCALATE: "PENDING_REVIEW",
    FREEZE: "PENDING_REVIEW",
    REPLAY: "PENDING_REVIEW",
    ROLLBACK_BLOCK: "BLOCKED"
  };

  const nextStatus = actionMap[action];
  if (!nextStatus) throw new Error("INVALID_OPERATOR_ACTION");

  const { data: current, error: readError } = await supabase
    .from("execution_results")
    .select("*")
    .eq("id", execution_id)
    .single();

  if (readError || !current) throw new Error("EXECUTION_NOT_FOUND");

  const { error: updateError } = await supabase
    .from("execution_results")
    .update({
      status: nextStatus,
      operator_action: action,
      operator_id: user.id,
      operator_email: user.email,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", execution_id);

  if (updateError) throw new Error(updateError.message);

  await supabase.from("audit_events").insert({
    execution_id,
    event_type: "OPERATOR_ACTION",
    operator_id: user.id,
    operator_email: user.email,
    action,
    status_before: current.status || "PENDING_REVIEW",
    status_after: nextStatus,
    payload: body,
    created_at: new Date().toISOString()
  });

  return { execution_id, action, status: nextStatus };
}
