export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  return res.status(200).json({
    ok: true,
    status: "healthy",
    service: "EXECUTIA API",
    version: "v1",
    timestamp: new Date().toISOString()
  });
}
