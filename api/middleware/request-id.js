/**
 * EXECUTIA™ — /middleware/request-id.js
 * Attach unique request ID. Every request, every response.
 */

import { randomBytes } from "crypto";

export function attachRequestId(req, res, next) {
  req.executia          = req.executia || {};
  req.executia.requestId = `req_${randomBytes(6).toString("hex")}`;
  res.setHeader("x-request-id", req.executia.requestId);
  next();
}
