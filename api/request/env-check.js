export default async function handler(req, res){
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    ok: true,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    OPERATOR_EMAIL: !!process.env.OPERATOR_EMAIL,
    FROM_EMAIL: !!process.env.FROM_EMAIL,
    NODE_ENV: process.env.NODE_ENV || null
  });
}
