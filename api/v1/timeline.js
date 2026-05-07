import { db } from "../../services/db.js";
import { resolveJwtContext, requireJwtPermission } from "../../services/jwt-auth.js";

export default async function handler(req, res) {
  try {
    const context = await resolveJwtContext(req);
    const permission = requireJwtPermission(context, "view");

    if (!permission.ok) {
      return res.status(permission.status || 401).json(permission);
    }

    const execution_id = req.query?.execution_id;

    if (!execution_id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "EXECUTION_ID_REQUIRED",
          message: "execution_id is required."
        }
      });
    }

    const supabase = db();
    const organization_id = context.organization_id;

    const { data: execution, error: execError } = await supabase
      .from("execution_results")
      .select("id, execution_id, organization_id")
      .eq("execution_id", execution_id)
      .eq("organization_id", organization_id)
      .single();

    if (execError || !execution) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "EXECUTION_NOT_FOUND",
          message: "Execution not found for this organization."
        }
      });
    }

    const { data, error } = await supabase
      .from("audit_events")
      .select("*")
      .eq("execution_id", execution_id)
      .eq("organization_id", organization_id)
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "TIMELINE_QUERY_FAILED",
          message: error.message
        }
      });
    }

    return res.status(200).json({
      ok: true,
      mode: context.mode,
      organization_id,
      user: context.user,
      execution_id,
      timeline: data || []
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message
      }
    });
  }
}
