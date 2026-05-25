/**
 * EXECUTIA Governance Modes (Phase 5D / 5E).
 * Role-based perspectives with real surface separation.
 */
(function (global) {
  const MODES = Object.freeze({
    EXECUTIVE: "executive",
    OPERATIONAL: "operational",
    ENGINEERING: "engineering",
    AUDIT: "audit",
    PUBLIC_VERIFY: "public-verify"
  });

  const MODE_LABELS = Object.freeze({
    [MODES.EXECUTIVE]: "Executive authority",
    [MODES.OPERATIONAL]: "Operational consequence",
    [MODES.ENGINEERING]: "Execution authority",
    [MODES.AUDIT]: "Audit verify",
    [MODES.PUBLIC_VERIFY]: "Public verify"
  });

  const MODE_DEFINITIONS = Object.freeze({
    [MODES.EXECUTIVE]: Object.freeze({ density: "lowest" }),
    [MODES.OPERATIONAL]: Object.freeze({ density: "moderate" }),
    [MODES.ENGINEERING]: Object.freeze({ density: "highest" }),
    [MODES.AUDIT]: Object.freeze({ density: "moderate" }),
    [MODES.PUBLIC_VERIFY]: Object.freeze({ density: "minimal" })
  });

  const STORAGE_KEY = "executia_governance_mode";
  const MODE_CLASS_PREFIX = "ex-gov-mode-";
  const MODE_CHANGE_EVENT = "executia:governance-mode-change";

  const PAGE_DEFAULTS = Object.freeze({
    engineering: MODES.ENGINEERING,
    proofs: MODES.PUBLIC_VERIFY,
    audit: MODES.AUDIT,
    "audit-ledger": MODES.AUDIT,
    ledger: MODES.OPERATIONAL,
    operations: MODES.OPERATIONAL
  });

  function allModeClasses() {
    return Object.values(MODES).map((m) => `${MODE_CLASS_PREFIX}${m}`);
  }

  function resolveDefaultMode() {
    const page = document.body?.dataset?.opPage;
    if (page && PAGE_DEFAULTS[page]) return PAGE_DEFAULTS[page];
    return MODES.ENGINEERING;
  }

  function readStoredMode() {
    try {
      const hash = new URLSearchParams(location.hash.replace(/^#/, "")).get("mode");
      if (hash && Object.values(MODES).includes(hash)) return hash;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && Object.values(MODES).includes(stored)) return stored;
    } catch {
      /* ignore */
    }
    return resolveDefaultMode();
  }

  function applyMode(mode) {
    const valid = Object.values(MODES).includes(mode) ? mode : resolveDefaultMode();
    document.body.classList.remove(...allModeClasses());
    document.body.classList.add(`${MODE_CLASS_PREFIX}${valid}`);
    document.body.dataset.governanceMode = valid;
    try {
      localStorage.setItem(STORAGE_KEY, valid);
    } catch {
      /* ignore */
    }
    document.querySelectorAll(".ex-gov-mode-bar a").forEach((link) => {
      const active = link.dataset.mode === valid;
      link.classList.toggle("is-active", active);
      link.setAttribute("aria-current", active ? "true" : "false");
    });
    document.dispatchEvent(
      new CustomEvent(MODE_CHANGE_EVENT, { detail: { mode: valid } })
    );
    return valid;
  }

  function mountModeBar() {
    if (!document.body.classList.contains("ex-gov-modes-enabled")) return;
    if (document.querySelector(".ex-gov-mode-bar")) return;

    const anchor =
      document.querySelector(".ex-gov-authority-frame") ||
      document.querySelector(".ex-op-authority");
    const nav = document.createElement("nav");
    nav.className = "ex-gov-mode-bar";
    nav.setAttribute("aria-label", "Execution perspective");
    nav.innerHTML = `
      <span class="ex-gov-mode-label">Perspective</span>
      <div class="ex-gov-mode-rail" role="group">
        ${Object.values(MODES)
          .map(
            (mode) =>
              `<a href="#mode=${mode}" data-mode="${mode}">${MODE_LABELS[mode]}</a>`
          )
          .join("")}
      </div>
    `;

    nav.addEventListener("click", (e) => {
      const link = e.target.closest("[data-mode]");
      if (!link) return;
      e.preventDefault();
      applyMode(link.dataset.mode);
    });

    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", nav);
    } else {
      const main = document.querySelector("main");
      if (main) main.prepend(nav);
      else document.body.prepend(nav);
    }
  }

  function init() {
    if (!document.body.classList.contains("ex-gov-modes-enabled")) return;
    mountModeBar();
    applyMode(readStoredMode());
  }

  global.EXECUTIA_GOVERNANCE_MODES = Object.freeze({
    MODES,
    MODE_LABELS,
    MODE_DEFINITIONS,
    MODE_CHANGE_EVENT,
    applyMode,
    readStoredMode,
    resolveDefaultMode,
    init
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
