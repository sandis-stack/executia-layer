import { ok } from "../../shared/response.js";

export default function handler(req, res) {
  return ok(res, { audit: "READY", scope: "PROJECT" });
}
