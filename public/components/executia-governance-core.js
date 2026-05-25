/**
 * EXECUTIA Governance Core (Phase 5G).
 * Canonical presentation: language, execution identity, surfaces, hierarchy.
 * Presentation only — no runtime execution logic.
 */
(function (global) {
  const TERMS = Object.freeze({
    CANONICAL: "Canonical",
    VERIFIED: "Verified",
    GOVERNED: "Governed",
    REPLAY_SAFE: "Replay safe",
    DETERMINISTIC: "Deterministic",
    EXECUTION_AUTHORITY: "Execution authority",
    EXECUTION_INTEGRITY: "Execution integrity",
    EXECUTION_TRUTH: "Execution truth",
    READ_ONLY: "Read only",
    GOVERNANCE_STATUS: "Execution authority status",
    EXECUTION_SURFACE: "Execution surface",
    EXECUTION_STATE: "Execution state",
    OPERATIONAL_CONSEQUENCE: "Operational consequence"
  });

  const PHRASES = Object.freeze({
    BRAND_SUB: "Execution Authority",
    GOVERNANCE_STATUS: "EXECUTIA execution authority",
    CANONICAL_AUTHORITY: "Canonical execution authority",
    EXECUTION_INTELLIGENCE: "Execution integrity index",
    REPLAY_HISTORY: "Governance history · replayable consequence",
    EXECUTION_MEMORY: "Execution memory",
    CANONICAL_MEMORY: "Canonical memory",
    GOVERNANCE_HISTORY: "Governance history",
    DEPLOY_STATE: "Governed outcome scope",
    EXECUTION_OBJECTIVE: "Execution advances governed institutional outcomes.",
    INSTITUTIONAL_OBJECTIVE: "Institutional objective under canonical authority.",
    EXECUTION_RELIABILITY: "Structural execution reliability under governed continuity.",
    EXECUTION_JURISDICTION: "Canonical execution jurisdiction — authority above infrastructure.",
    FINDINGS: "Governed findings",
    PRESENCE: "Execution authority · canonical · governed · inevitable.",
    MATERIAL_TRUTH: "Execution truth anchored at canonical verify.",
    OPERATIONAL_UNAVAILABLE: "Execution authority state unavailable.",
    NO_FINDINGS: "No governed findings at this posture.",
    NO_LEDGER: "No execution continuity record at this posture.",
    READ_ONLY_SURFACE: "Read only · Governed · Deterministic execution",
    FRAME_INEVITABILITY: "Governed · calm · inevitable."
  });

  const NAV = Object.freeze({
    PRIMARY: Object.freeze([
      ["EXECUTION", "/dashboard"],
      ["GOVERNANCE", "/console/governance.html"],
      ["AUTHORITY", "/console/engineering.html"]
    ]),
    SECONDARY: Object.freeze([
      ["Governance history", "/console/ledger.html"],
      ["Audit verify", "/console/audit.html"],
      ["Audit chain", "/console/audit-ledger.html"],
      ["Operations", "/console/operations.html"],
      ["Public verify", "/console/proofs.html"],
      ["Authority health", "/api/v1/health", true]
    ])
  });

  const EXECUTION_STATES = Object.freeze({
    EXECUTION_VERIFIED: "EXECUTION VERIFIED",
    CANONICAL_STATE_ACTIVE: "CANONICAL STATE ACTIVE",
    REPLAY_SAFE: "REPLAY SAFE",
    GOVERNANCE_INTEGRITY_VERIFIED: "GOVERNANCE INTEGRITY VERIFIED",
    EXECUTION_SURFACE_GOVERNED: "EXECUTION SURFACE GOVERNED",
    EXECUTION_AUTHORITY_ACTIVE: "EXECUTION AUTHORITY ACTIVE",
    EXECUTION_INTEGRITY_MAINTAINED: "EXECUTION INTEGRITY MAINTAINED"
  });

  const HIERARCHY = Object.freeze({
    PRIMARY: "execution authority",
    SECONDARY: "governance state",
    TERTIARY: "diagnostics"
  });

  const SURFACES = Object.freeze({
    GOVERNANCE: "ex-op-surface--governance",
    AUTHORITY: "ex-op-surface--authority",
    INTELLIGENCE: "ex-op-surface--intelligence",
    REPLAY: "ex-op-surface--replay",
    DEPLOY: "ex-op-surface--deploy",
    FINDINGS: "ex-op-surface--findings",
    AUDIT: "ex-op-surface--audit",
    PUBLIC_VERIFY: "ex-op-surface--public-verify",
    RETENTION: "ex-op-surface--retention"
  });

  const TIER_CLASS = Object.freeze({
    primary: "ex-gov-tier-primary",
    secondary: "ex-gov-tier-secondary",
    tertiary: "ex-gov-tier-tertiary"
  });

  const STATE_DISPLAY_MAX = 5;

  const STATE_PRIORITY = Object.freeze([
    "EXECUTION_VERIFIED",
    "CANONICAL_STATE_ACTIVE",
    "EXECUTION_AUTHORITY_ACTIVE",
    "REPLAY_SAFE",
    "EXECUTION_INTEGRITY_MAINTAINED",
    "GOVERNANCE_INTEGRITY_VERIFIED",
    "EXECUTION_SURFACE_GOVERNED"
  ]);

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function tierClass(level) {
    return TIER_CLASS[level] || TIER_CLASS.tertiary;
  }

  function surfaceClass(kind) {
    const key = String(kind || "")
      .toUpperCase()
      .replace(/-/g, "_");
    return SURFACES[key] || `ex-op-surface--${kind}`;
  }

  function scoreAtLeast(value, min) {
    const n = Number(value);
    return Number.isFinite(n) && n >= min;
  }

  function compressed() {
    return global.EXECUTIA_CANONICAL_COMPRESSION?.isActive?.() === true;
  }

  function stateDisplayMax() {
    const cap = global.EXECUTIA_CANONICAL_COMPRESSION?.displayLimit;
    return cap ? cap(STATE_DISPLAY_MAX) : STATE_DISPLAY_MAX;
  }

  function deriveExecutionStates(ctx) {
    const intel = ctx?.intel || {};
    const ag = ctx?.ag || {};
    const data = ctx?.data || {};
    const sc = intel.stability || {};
    const active = [];

    if (
      scoreAtLeast(sc.overall_score, 85) ||
      intel.deploy_readiness === "READY" ||
      (intel.risk?.overall === "LOW" && scoreAtLeast(sc.verification_score, 80))
    ) {
      active.push("EXECUTION_VERIFIED");
    }
    if ((ag.canonical_authority || []).length > 0) active.push("CANONICAL_STATE_ACTIVE");
    if (scoreAtLeast(sc.replay_score, 75)) active.push("REPLAY_SAFE");
    if (
      scoreAtLeast(sc.governance_score, 75) ||
      !(intel.findings || []).some((f) => f.level === "HIGH")
    ) {
      active.push("GOVERNANCE_INTEGRITY_VERIFIED");
    }
    if (
      data.engineering_console_detected ||
      ag.engineering_console_detected ||
      data.engineering_console_authority?.GOVERNED
    ) {
      active.push("EXECUTION_SURFACE_GOVERNED");
    }
    if (
      data.engineering_console_authority?.ACTIVE === true ||
      data.engineering_console_detected === true ||
      ag.engineering_console_detected === true
    ) {
      active.push("EXECUTION_AUTHORITY_ACTIVE");
    }
    if (
      scoreAtLeast(sc.overall_score, 70) &&
      !(intel.findings || []).some((f) => f.level === "HIGH")
    ) {
      active.push("EXECUTION_INTEGRITY_MAINTAINED");
    }

    const ordered = STATE_PRIORITY.filter((key) => active.includes(key)).slice(0, stateDisplayMax());
    return ordered.map((key) => ({ key, label: EXECUTION_STATES[key], active: true }));
  }

  function buildAuthorityLines(ctx) {
    const intel = ctx?.intel || {};
    const ag = ctx?.ag || {};
    const readiness = intel.deploy_readiness ?? "—";
    const risk = intel.risk?.overall ?? "—";
    const n = (ag.canonical_authority || []).length;
    if (compressed()) {
      return {
        primary: `${TERMS.GOVERNED} · ${readiness} · ${risk}`,
        secondary: `${n} ${TERMS.CANONICAL.toLowerCase()} · ${TERMS.DETERMINISTIC}`
      };
    }
    return {
      primary: `${TERMS.GOVERNED} execution · readiness ${readiness} · consequence ${risk}`,
      secondary: `${n} ${TERMS.CANONICAL.toLowerCase()} verify · ${TERMS.DETERMINISTIC} chain`
    };
  }

  function statesHtml(states) {
    if (!states.length) return "";
    return states
      .map(
        (s) =>
          `<span class="ex-gov-state is-active" data-ex-state="${s.key}">${s.label}</span>`
      )
      .join("");
  }

  function isGovernedPage() {
    return (
      document.body.classList.contains("ex-gov-core-enabled") ||
      document.body.classList.contains("ex-ex-id-enabled") ||
      document.body.classList.contains("ex-op-shell")
    );
  }

  function mountAuthorityFrame() {
    if (!isGovernedPage()) return;
    if (document.querySelector(".ex-gov-authority-frame")) return;

    const header = document.querySelector(".ex-engine-header");
    const frame = document.createElement("div");
    frame.className = "ex-gov-authority-frame ex-op-authority";
    frame.setAttribute("role", "region");
    frame.setAttribute("aria-label", "Execution authority");
    frame.innerHTML = `
      <div class="ex-gov-authority-inner ex-op-authority-inner">
        <div class="ex-gov-authority-state ex-op-authority-state">
          <span class="ex-ds-institutional-label ex-gov-tier-tertiary">${TERMS.EXECUTION_AUTHORITY}</span>
          <span class="ex-op-state-value ex-gov-tier-secondary" id="exOpGovState">—</span>
        </div>
        <div class="ex-gov-authority-state ex-op-authority-state">
          <span class="ex-ds-institutional-label ex-gov-tier-tertiary">${TERMS.CANONICAL} execution state</span>
          <span class="ex-op-state-value ex-gov-tier-secondary" id="exOpCanonState">—</span>
        </div>
      </div>
      <p class="ex-gov-frame-line ex-gov-tier-tertiary">${PHRASES.FRAME_INEVITABILITY}</p>
      <div class="ex-gov-states ex-gov-tier-secondary" id="exGovExecutionStates" aria-label="Execution state"></div>
    `;

    if (header && header.parentNode) {
      header.insertAdjacentElement("afterend", frame);
    } else {
      document.body.prepend(frame);
    }
  }

  function setAuthorityState(primary, secondary) {
    const gov = document.getElementById("exOpGovState");
    const canon = document.getElementById("exOpCanonState");
    if (gov && primary != null) gov.textContent = primary;
    if (canon && secondary != null) canon.textContent = secondary;
  }

  function applyPresentation(ctx) {
    mountAuthorityFrame();
    const authority = buildAuthorityLines(ctx || {});
    const states = deriveExecutionStates(ctx || {});
    setAuthorityState(authority.primary, authority.secondary);
    const statesEl = document.getElementById("exGovExecutionStates");
    if (statesEl) statesEl.innerHTML = statesHtml(states);
    return { authority, states };
  }

  function opSurface(kind, heading, bodyHtml, mt = "") {
    const crown = kind === "governance" || kind === "public-verify";
    const title = heading
      ? crown
        ? `<h1 class="ex-ds-executive ${tierClass("primary")}">${esc(heading)}</h1>`
        : `<h2 class="ex-ds-governance-quiet ${tierClass("secondary")}">${esc(heading)}</h2>`
      : "";
    return `<section class="ex-op-surface ${surfaceClass(kind)} ex-ds-pad-block ${mt}">${title}${bodyHtml}</section>`;
  }

  function measureBlock(label, value) {
    return `<div class="ex-ds-measure"><span class="ex-ds-institutional-label ${tierClass("tertiary")}">${esc(label)}</span><span class="ex-ds-measure-value">${esc(value ?? "—")}</span></div>`;
  }

  const LANGUAGE = Object.freeze({ TERMS, PHRASES, NAV });

  const IDENTITY = Object.freeze({
    EXECUTION_STATES,
    HIERARCHY,
    deriveExecutionStates,
    buildAuthorityLines,
    applyPresentation,
    tierClass,
    mountAuthorityFrame,
    statesHtml
  });

  global.EXECUTIA_GOVERNANCE_CORE = Object.freeze({
    LANGUAGE,
    IDENTITY,
    SURFACES,
    TIER_CLASS,
    STATE_DISPLAY_MAX,
    esc,
    tierClass,
    surfaceClass,
    opSurface,
    measureBlock,
    applyPresentation,
    mountAuthorityFrame,
    setAuthorityState,
    deriveExecutionStates,
    buildAuthorityLines,
    statesHtml
  });

  global.EXECUTIA_GOVERNANCE_LANGUAGE = LANGUAGE;
  global.EXECUTIA_EXECUTION_IDENTITY = Object.freeze({
    EXECUTION_STATES,
    HIERARCHY,
    tierClass,
    applyIdentity: applyPresentation,
    applyPosture: applyPresentation,
    mountPostureBand: mountAuthorityFrame,
    mountAuthorityFrame,
    buildIdentityBundle: (ctx) => ({
      states: deriveExecutionStates(ctx),
      authority: buildAuthorityLines(ctx)
    })
  });
})(typeof window !== "undefined" ? window : globalThis);
