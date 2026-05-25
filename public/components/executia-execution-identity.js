/**
 * @deprecated Load executia-governance-core.js instead. Thin re-export for compatibility.
 */
(function (global) {
  if (!global.EXECUTIA_EXECUTION_IDENTITY && global.EXECUTIA_GOVERNANCE_CORE?.IDENTITY) {
    const id = global.EXECUTIA_GOVERNANCE_CORE.IDENTITY;
    global.EXECUTIA_EXECUTION_IDENTITY = Object.freeze({
      ...id,
      applyIdentity: global.EXECUTIA_GOVERNANCE_CORE.applyPresentation,
      applyPosture: global.EXECUTIA_GOVERNANCE_CORE.applyPresentation,
      mountPostureBand: global.EXECUTIA_GOVERNANCE_CORE.mountAuthorityFrame
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
