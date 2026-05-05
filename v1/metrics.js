import { ok } from "../../shared/response.js";

export default function handler(req, res) {
  return ok(res, {
    validationIntegrity: 99.2,
    liveRequests: 12,
    pendingReview: 3,
    ledgerBreaks: 0,
    mode: "FINAL_FULL_LAYER"
  });
}
