/**
 * EXECUTIA Operational Shell (Phase 5B / 5G).
 * Frame mount and surface rhythm — defers language and identity to governance core.
 */
(function (global) {
  const CORE = () => global.EXECUTIA_GOVERNANCE_CORE;

  function normalizeMain() {
    const main = document.querySelector("main");
    if (main && !main.classList.contains("ex-op-main")) {
      main.classList.add("ex-op-main");
    }
  }

  function hideLegacyHeaders() {
    document.querySelectorAll(".ex-header-shell").forEach((el) => {
      el.classList.add("ex-op-legacy-hidden");
    });
  }

  function mount() {
    if (!document.body.classList.contains("ex-op-shell")) return;
    hideLegacyHeaders();
    if (CORE()?.mountAuthorityFrame) {
      CORE().mountAuthorityFrame();
    }
    normalizeMain();
  }

  function setAuthorityState(primary, secondary) {
    if (CORE()?.setAuthorityState) {
      CORE().setAuthorityState(primary, secondary);
      return;
    }
    const gov = document.getElementById("exOpGovState");
    const canon = document.getElementById("exOpCanonState");
    if (gov && primary != null) gov.textContent = primary;
    if (canon && secondary != null) canon.textContent = secondary;
  }

  const surfaces = CORE()?.SURFACES || {
    GOVERNANCE: "ex-op-surface--governance",
    AUTHORITY: "ex-op-surface--authority",
    INTELLIGENCE: "ex-op-surface--intelligence",
    REPLAY: "ex-op-surface--replay",
    DEPLOY: "ex-op-surface--deploy",
    FINDINGS: "ex-op-surface--findings",
    AUDIT: "ex-op-surface--audit",
    PUBLIC_VERIFY: "ex-op-surface--public-verify",
    RETENTION: "ex-op-surface--retention"
  };

  global.EXECUTIA_OPERATIONAL_SHELL = Object.freeze({
    mount,
    setAuthorityState,
    SURFACES: Object.freeze(surfaces),
    TIERS: Object.freeze({
      PRIMARY: "ex-gov-tier-primary",
      SECONDARY: "ex-gov-tier-secondary",
      TERTIARY: "ex-gov-tier-tertiary"
    })
  });

  function init() {
    mount();
    document.addEventListener("executia:operational-shell:refresh", mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
