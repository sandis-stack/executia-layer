import crypto from "crypto";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(data, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createJwt(payload = {}, ttlSeconds = 8 * 60 * 60) {
  const secret = process.env.EXECUTIA_JWT_SECRET;
  if (!secret) throw new Error("EXECUTIA_JWT_SECRET_MISSING");

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const body = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    iss: "EXECUTIA_ENGINE"
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedBody = base64url(JSON.stringify(body));
  const signature = sign(`${encodedHeader}.${encodedBody}`, secret);

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyJwt(token) {
  const secret = process.env.EXECUTIA_JWT_SECRET;
  if (!secret) throw new Error("EXECUTIA_JWT_SECRET_MISSING");

  const parts = String(token || "").split(".");
  if (parts.length !== 3) return { ok: false, error: "JWT_INVALID" };

  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, secret);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { ok: false, error: "JWT_SIGNATURE_INVALID" };
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    return { ok: false, error: "JWT_EXPIRED" };
  }

  return {
    ok: true,
    payload
  };
}
