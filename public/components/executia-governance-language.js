/**
 * @deprecated Load executia-governance-core.js instead. Thin re-export for compatibility.
 */
(function (global) {
  if (global.EXECUTIA_GOVERNANCE_CORE?.LANGUAGE) {
    global.EXECUTIA_GOVERNANCE_LANGUAGE = global.EXECUTIA_GOVERNANCE_CORE.LANGUAGE;
  }
})(typeof window !== "undefined" ? window : globalThis);
