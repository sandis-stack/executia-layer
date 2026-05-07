import { createClient } from "@supabase/supabase-js";
import ws from "ws";

function admin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws } }
  );
}

export default async function handler(req, res) {
  try {
    const supabase = admin();
    const email = "operator@executia.io";

    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let user = users.users.find(u => u.email === email);

    if (!user) {
      const created = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { role: "OPERATOR" }
      });
      if (created.error) throw created.error;
      user = created.data.user;
    }

    return res.status(200).json({
      ok: true,
      mode: "ENTERPRISE",
      operator: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || "OPERATOR"
      },
      note: "Operator exists. Use Supabase dashboard to reset password or create a session through the login endpoint."
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "OPERATOR_TOKEN_SETUP_FAILED",
        message: e.message
      }
    });
  }
}
