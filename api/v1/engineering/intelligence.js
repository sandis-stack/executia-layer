import { ok, fail, methodGuard } from "../../../shared/response.js";
import { buildEngineeringIntelligencePayload } from "../../../services/engineering-intelligence-loader.js";

export const ENGINEERING_INTELLIGENCE_MODE = "READ_ONLY_GOVERNED_LOCAL";

/**
 * Phase 4A — Read-only engineering intelligence aggregate.
 * No DB writes, no external APIs. Serves local graph / intelligence / ledger JSON.
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;

  try {
    const payload = buildEngineeringIntelligencePayload();

    return ok(res, {
      state: payload.state,
      mode: ENGINEERING_INTELLIGENCE_MODE,
      engineering_console_detected: payload.engineering_console_detected,
      engineering_console_authority: payload.engineering_console_authority,
      architecture_graph: payload.architecture_graph,
      execution_intelligence: payload.execution_intelligence,
      engineering_ledger: payload.engineering_ledger,
      sources_present: payload.sources_present,
      missing_sources: payload.missing_sources,
      generated_at: payload.generated_at
    });
  } catch (err) {
    return fail(
      res,
      "ENGINEERING_INTELLIGENCE_FAILED",
      err.message || "Failed to load engineering intelligence.",
      500
    );
  }
}
