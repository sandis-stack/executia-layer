export default async function handler(req, res) {
  return res.status(403).json({
    ok: false,
    error: {
      code: "ENDPOINT_DISABLED",
      message: "Operator setup endpoint is disabled in production."
    }
  });
}
