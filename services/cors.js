export function applyCors(req, res, methods = "GET,POST,OPTIONS") {
  const origin = req.headers.origin;

  // 👉 paņem no ENV
  const allowed = process.env.ALLOWED_ORIGIN?.split(",") || [];

  if (
    origin &&
    (allowed.includes(origin) || origin.includes("vercel.app"))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-key"
  );

  // preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
}
