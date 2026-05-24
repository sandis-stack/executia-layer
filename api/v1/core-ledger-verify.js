import auditVerifyHandler from "./audit/verify.js";

export const CORE_LEDGER_VERIFY_COMPATIBILITY_MODE =
  "PHASE_3B2_LEGACY_WRAPPER";

export default async function handler(req, res) {
  res.setHeader(
    "x-executia-core-ledger-verify-compatibility",
    CORE_LEDGER_VERIFY_COMPATIBILITY_MODE
  );

  return auditVerifyHandler(req, res);
}
