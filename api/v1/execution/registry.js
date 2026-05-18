async function supabaseRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_ENV_MISSING");
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.hint ||
      data?.details ||
      text ||
      "Supabase registry request failed.";

    throw new Error(message);
  }

  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Use GET."
        }
      });
    }

    const reviewId = String(req.query.review_id || "").trim();

    if (!reviewId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "REVIEW_ID_REQUIRED",
          message: "review_id is required."
        }
      });
    }

    const rows = await supabaseRequest(
      `execution_public_registry?review_id=eq.${encodeURIComponent(reviewId)}&select=*&limit=1`
    );

    const record = Array.isArray(rows) ? rows[0] : null;

    if (!record) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "PROOF_RECEIPT_NOT_FOUND",
          message: "No public execution receipt found for this review_id."
        }
      });
    }

    return res.status(200).json({
      ok: true,
      engine: "EXECUTIA_PUBLIC_EXECUTION_REGISTRY_V1",
      mode: "PUBLIC_REGISTRY_LOOKUP",
      receipt: record.receipt || {},
      record
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "PUBLIC_REGISTRY_LOOKUP_FAILED",
        message: error.message || "Public registry lookup failed."
      }
    });
  }
}
