import { createClient } from "@supabase/supabase-js";
import ws from "ws";

function admin() {
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
    const password = "ChangeMe-EXECUTIA-2026!";

    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.users.find(u => u.email === email);
    if (!user) throw new Error("OPERATOR_NOT_FOUND");

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { role: "OPERATOR" }
    });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      email,
      temporary_password: password,
      note: "Use this password once, then change it in Supabase."
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { code: "SET_OPERATOR_PASSWORD_FAILED", message: e.message }
    });
  }
}
