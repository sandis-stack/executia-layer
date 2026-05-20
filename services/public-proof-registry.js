export async function insertPublicProofRegistry(record) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return {
      persisted: false,
      reason: "SUPABASE_ENV_MISSING"
    };
  }

  const response = await fetch(`${url}/rest/v1/execution_public_registry`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(record)
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      persisted: false,
      reason: text || "SUPABASE_INSERT_FAILED"
    };
  }

  try {
    return {
      persisted: true,
      row: text ? JSON.parse(text)?.[0] : null
    };
  } catch {
    return {
      persisted: true,
      row: null
    };
  }
}
