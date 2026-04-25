export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  return res.status(200).json({
    ok: true,
    status: "healthy",
    route: "/api/v1/health",
    service: "EXECUTIA",
    timestamp: new Date().toISOString()
  });
}
