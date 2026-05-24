import auditVerifyHandler from "./audit/verify.js";

export const LEDGER_VERIFY_COMPATIBILITY_MODE =
  "PHASE_3B2_LEGACY_WRAPPER";

export const LEDGER_VERIFY_AUTHORITY_MODE = "PHASE_3B2_AUDIT_VERIFY_PRIMARY";

export function resolveLedgerVerifyAuthority({
  ledger = {},
  executions = {},
  coreLedger = {},
  accountAudit = {}
} = {}) {
  const verified = Boolean(ledger.verified);

  return {
    verified,
    authority_mode: LEDGER_VERIFY_AUTHORITY_MODE,
    legacy_verified: {
      execution_projection: Boolean(executions.verified),
      core_ledger: Boolean(coreLedger.verified),
      account_audit: Boolean(accountAudit.verified),
      composite_all_chains: Boolean(
        ledger.verified &&
        executions.verified &&
        coreLedger.verified &&
        accountAudit.verified
      )
    },
    legacy_projection_warning:
      ledger.verified && !executions.verified
        ? {
            code: "LEGACY_PROJECTION_DRIFT",
            message:
              "execution_results projection drift detected. Canonical Phase 3B2 verification is /api/v1/audit/verify.",
            tampered_execution_id: executions.tampered_execution_id ?? null,
            entries: executions.entries ?? null
          }
        : null,
    legacy_core_ledger_warning:
      ledger.verified && !coreLedger.verified
        ? {
            code: "LEGACY_CORE_LEDGER_DRIFT",
            message:
              "core_ledger drift detected. Canonical Phase 3B2 verification is /api/v1/audit/verify.",
            tampered_id: coreLedger.tampered_id ?? null,
            entries: coreLedger.entries ?? null
          }
        : null
  };
}

export function buildLedgerVerifyResponse({
  ledger = {},
  executions = {},
  coreLedger = {},
  accountAudit = {},
  truthAnchors = {}
} = {}) {
  const authority = resolveLedgerVerifyAuthority({
    ledger,
    executions,
    coreLedger,
    accountAudit
  });

  return {
    verified: authority.verified,
    authority_mode: authority.authority_mode,
    compatibility_mode: LEDGER_VERIFY_COMPATIBILITY_MODE,
    legacy_verified: authority.legacy_verified,
    ...(authority.legacy_projection_warning
      ? { legacy_projection_warning: authority.legacy_projection_warning }
      : {}),
    ...(authority.legacy_core_ledger_warning
      ? { legacy_core_ledger_warning: authority.legacy_core_ledger_warning }
      : {}),
    ledger_chain: ledger,
    execution_chain: executions,
    core_ledger_chain: coreLedger,
    account_audit: accountAudit,
    truth_anchors: truthAnchors
  };
}


export default async function handler(req, res) {
  res.setHeader(
    "x-executia-verify-compatibility",
    LEDGER_VERIFY_COMPATIBILITY_MODE
  );

  return auditVerifyHandler(req, res);
}
