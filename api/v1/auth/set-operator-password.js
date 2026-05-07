export default async function handler(req, res) {
  return res.status(403).json({
    ok: false,
    error: {
      code: "ENDPOINT_DISABLED",
      message: "Temporary operator password endpoint is disabled in production."
    }
  });
}
