export function ok(res, payload = {}, statusCode = 200) {
  return res.status(statusCode).json({ ok: true, ...payload });
}

export function fail(res, code, message, statusCode = 400, details = undefined) {
  return res.status(statusCode).json({
    ok: false,
    error: { code, message, ...(details ? { details } : {}) }
  });
}

export function methodGuard(req, res, allowed = ["GET"]) {
  if (!allowed.includes(req.method)) {
    res.setHeader("Allow", allowed.join(", "));
    fail(res, "METHOD_NOT_ALLOWED", `Use ${allowed.join(" or ")}.`, 405);
    return false;
  }
  return true;
}
