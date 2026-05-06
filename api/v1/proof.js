import { ok } from "../../shared/response.js";

export default function handler(req, res) {
  return ok(res, {
    proof: "LEDGER_HASH_CHAIN",
    standard: "EXECUTION_TIME_TRUTH",
    audit: "ENABLED"
  });
}
