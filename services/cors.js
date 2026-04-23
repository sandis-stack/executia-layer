export function applyCors(req, res, methods = "GET,POST,OPTIONS") {
  const origin = req.headers.origin;

  if (
    origin &&
    (
      origin.includes("vercel.app") ||
      origin === "https://executia.io" ||
      origin === "https://execution.executia.io" ||
      origin === "http://localhost:3000"
    )
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
}
