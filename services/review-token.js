import crypto from "crypto";

const SECRET =
  process.env.EXECUTIA_JWT_SECRET ||
  process.env.JWT_SECRET;

export function createReviewToken(review_id){

  const exp =
    Math.floor(Date.now()/1000) +
    (60 * 60 * 24 * 7);

  const payload = {
    review_id,
    scope:"review.read",
    exp
  };

  const encoded =
    Buffer
      .from(JSON.stringify(payload))
      .toString("base64url");

  const sig =
    crypto
      .createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");

  return `${encoded}.${sig}`;
}

export function verifyReviewToken(token){

  if(!token) return { ok:false };

  const [encoded, sig] =
    token.split(".");

  if(!encoded || !sig){
    return { ok:false };
  }

  const expected =
    crypto
      .createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");

  if(expected !== sig){
    return { ok:false };
  }

  const payload =
    JSON.parse(
      Buffer
        .from(encoded, "base64url")
        .toString()
    );

  if(
    payload.exp <
    Math.floor(Date.now()/1000)
  ){
    return {
      ok:false,
      error:"TOKEN_EXPIRED"
    };
  }

  return {
    ok:true,
    payload
  };
}
