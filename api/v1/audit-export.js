import { ok } from "../../shared/response.js";

export default function handler(req, res) {
  return ok(res, { exportReady: true, format: "json" });
}
