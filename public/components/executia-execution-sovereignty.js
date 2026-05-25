/**
 * EXECUTIA Execution Sovereignty (Phase 5M).
 * Institutional execution jurisdiction — presentation only, no execution logic changes.
 */
(function (global) {
  const SOVEREIGNTY = Object.freeze({
    EXECUTION_AUTHORITY_ACTIVE: "EXECUTION AUTHORITY ACTIVE",
    CANONICAL_JURISDICTION_VERIFIED: "CANONICAL JURISDICTION VERIFIED",
    EXECUTION_GOVERNANCE_SOVEREIGN: "EXECUTION GOVERNANCE SOVEREIGN",
    STRUCTURAL_EXECUTION_AUTHORITY: "STRUCTURAL EXECUTION AUTHORITY",
    EXECUTION_SUPREMACY_MAINTAINED: "EXECUTION SUPREMACY MAINTAINED"
  });

  const HIERARCHY = Object.freeze({
    PRIMARY: "execution authority",
    SECONDARY: "governance continuity",
    TERTIARY: "diagnostics"
  });

  const DESCRIPTORS = Object.freeze({
    SUPREMACY:
      "Execution authority sits above infrastructure — governance is sovereign, not subordinate to systems.",
    JURISDICTION: "Canonical jurisdiction is permanent; execution truth survives system change.",
    INDEPENDENCE: "Deterministic jurisdiction binds verify, replay, and consequence without platform dependency.",
    PERMANENCE: "Institutional execution jurisdiction maintains supremacy across governed transitions."
  });

  const SOVEREIGNTY_DISPLAY_MAX = 5;

  function CMP() {
    return global.EXECUTIA_CANONICAL_COMPRESSION;
  }

  function esc(s) {
    const core = global.EXECUTIA_GOVERNANCE_CORE;
    if (core?.esc) return core.esc(s);
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function tierClass(level) {
    const core = global.EXECUTIA_GOVERNANCE_CORE;
    if (core?.tierClass) return core.tierClass(level);
    if (level === "primary") return "ex-gov-tier-primary";
    if (level === "secondary") return "ex-gov-tier-secondary";
    return "ex-gov-tier-tertiary";
  }

  function isSovereigntyPage() {
    return (
      document.body.classList.contains("ex-sovereignty-enabled") ||
      document.body.classList.contains("ex-gov-modes-enabled")
    );
  }

  function mountSovereigntyBand() {
    if (!isSovereigntyPage()) return;
    if (document.getElementById("exSovereigntyBand")) return;

    const anchor =
      document.getElementById("exTrustBand") ||
      document.getElementById("exIntentBand") ||
      document.querySelector(".ex-gov-mode-bar");
    const band = document.createElement("div");
    band.className = "ex-sovereignty-band";
    band.id = "exSovereigntyBand";
    band.setAttribute("role", "status");
    band.setAttribute("aria-live", "polite");
    band.setAttribute("aria-label", "Execution sovereignty");
    band.innerHTML = `
      <div class="ex-sovereignty-inner">
        <p class="ex-sovereignty-primary ${tierClass("primary")}" id="exSovereigntyPrimary">${SOVEREIGNTY.EXECUTION_AUTHORITY_ACTIVE}</p>
        <p class="ex-sovereignty-secondary ${tierClass("secondary")}" id="exSovereigntySecondary">${SOVEREIGNTY.CANONICAL_JURISDICTION_VERIFIED}</p>
        <p class="ex-sovereignty-tertiary ${tierClass("tertiary")}" id="exSovereigntyMeta">${DESCRIPTORS.SUPREMACY}</p>
        <div class="ex-sovereignty-frames ${tierClass("secondary")}" id="exSovereigntyFrames" aria-label="Execution sovereignty framing"></div>
      </div>
    `;

    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", band);
    } else {
      const main = document.querySelector("main");
      if (main) main.prepend(band);
    }
  }

  function deriveSovereigntyState(ctx) {
    const data = ctx?.data || {};
    const ag = ctx?.ag || {};
    const auth = data?.engineering_console_authority || {};
    const canonical = (ag?.canonical_authority || []).length;
    const replay = (ag?.replay_layer || []).length;
    const present = data?.sources_present || {};
    const authorityActive = auth.ACTIVE === true || auth.active === true;

    const frames = [
      SOVEREIGNTY.STRUCTURAL_EXECUTION_AUTHORITY,
      SOVEREIGNTY.EXECUTION_GOVERNANCE_SOVEREIGN
    ];
    let primary = SOVEREIGNTY.STRUCTURAL_EXECUTION_AUTHORITY;
    let secondary = SOVEREIGNTY.CANONICAL_JURISDICTION_VERIFIED;

    if (authorityActive) {
      frames.push(SOVEREIGNTY.EXECUTION_AUTHORITY_ACTIVE, SOVEREIGNTY.EXECUTION_SUPREMACY_MAINTAINED);
      primary = SOVEREIGNTY.EXECUTION_AUTHORITY_ACTIVE;
    }
    if (canonical > 0) {
      frames.push(SOVEREIGNTY.CANONICAL_JURISDICTION_VERIFIED);
      secondary = SOVEREIGNTY.CANONICAL_JURISDICTION_VERIFIED;
    }
    if (present.architecture_graph && present.execution_intelligence) {
      frames.push(SOVEREIGNTY.EXECUTION_SUPREMACY_MAINTAINED);
    }

    const jurisdictionLine = authorityActive
      ? "Execution authority active — jurisdiction supreme above infrastructure and deployment change."
      : "Structural execution authority — jurisdiction under canonical verify before supremacy attaches.";

    const independenceLine = `${DESCRIPTORS.INDEPENDENCE} · ${canonical} canonical anchor${canonical === 1 ? "" : "s"} · ${replay} replay path${replay === 1 ? "" : "s"}.`;

    const compressed = CMP()?.isActive?.() === true;
    const cap = CMP()?.displayLimit?.(SOVEREIGNTY_DISPLAY_MAX) ?? SOVEREIGNTY_DISPLAY_MAX;
    return {
      primary,
      secondary,
      meta: CMP()?.compressMeta?.("SOVEREIGNTY", `${DESCRIPTORS.SUPREMACY} · ${DESCRIPTORS.PERMANENCE}`) ?? `${DESCRIPTORS.SUPREMACY} · ${DESCRIPTORS.PERMANENCE}`,
      frames: [...new Set(frames)].slice(0, cap),
      jurisdictionLine: compressed
        ? `${primary} · ${canonical} canonical`
        : jurisdictionLine,
      independenceLine: compressed ? `${canonical} · ${replay} paths` : independenceLine,
      continuityLine: compressed ? "Jurisdiction permanent" : DESCRIPTORS.JURISDICTION,
      supremacyLine: authorityActive
        ? SOVEREIGNTY.EXECUTION_SUPREMACY_MAINTAINED
        : SOVEREIGNTY.EXECUTION_GOVERNANCE_SOVEREIGN
    };
  }

  function sovereigntyFramesHtml(frames, active) {
    return frames
      .map((label) => {
        const on = label === active ? " is-active" : "";
        return `<span class="ex-sovereignty-frame${on}">${esc(label)}</span>`;
      })
      .join("");
  }

  function applySovereignty(ctx) {
    mountSovereigntyBand();
    const state = deriveSovereigntyState(ctx || {});

    const primaryEl = document.getElementById("exSovereigntyPrimary");
    const secondaryEl = document.getElementById("exSovereigntySecondary");
    const metaEl = document.getElementById("exSovereigntyMeta");
    const framesEl = document.getElementById("exSovereigntyFrames");

    if (primaryEl) primaryEl.textContent = state.primary;
    if (secondaryEl) secondaryEl.textContent = state.secondary;
    if (metaEl) metaEl.textContent = state.meta;
    if (framesEl) framesEl.innerHTML = sovereigntyFramesHtml(state.frames, state.primary);

    document.body.classList.toggle(
      "ex-sovereignty-supreme",
      state.primary === SOVEREIGNTY.EXECUTION_AUTHORITY_ACTIVE
    );
    document.body.classList.toggle("ex-sovereignty-active", Boolean(ctx?.data || ctx?.ag));
    return state;
  }

  function jurisdictionFramingHtml(ctx) {
    if (CMP()?.isActive?.()) return "";
    const state = deriveSovereigntyState(ctx || {});
    return `
      <div class="ex-sovereignty-jurisdiction-block ${tierClass("primary")}">
        <p class="ex-sovereignty-jurisdiction-label">${esc(SOVEREIGNTY.CANONICAL_JURISDICTION_VERIFIED)}</p>
        <p class="ex-sovereignty-jurisdiction-line ${tierClass("secondary")}">${esc(state.jurisdictionLine)}</p>
        <p class="ex-sovereignty-independence-line ${tierClass("tertiary")}">${esc(state.independenceLine)}</p>
        <p class="ex-sovereignty-continuity-line ${tierClass("tertiary")}">${esc(state.continuityLine)} · ${esc(state.supremacyLine)}.</p>
      </div>
    `;
  }

  function jurisdictionSurfaceTitle() {
    return CMP()?.isActive?.() ? "Execution jurisdiction" : "Canonical execution jurisdiction";
  }

  function authoritySurfaceTitle() {
    return CMP()?.isActive?.() ? "Execution authority" : "Structural execution authority";
  }

  global.EXECUTIA_EXECUTION_SOVEREIGNTY = Object.freeze({
    SOVEREIGNTY,
    HIERARCHY,
    DESCRIPTORS,
    mountSovereigntyBand,
    applySovereignty,
    deriveSovereigntyState,
    jurisdictionFramingHtml,
    jurisdictionSurfaceTitle,
    authoritySurfaceTitle
  });
})(typeof window !== "undefined" ? window : globalThis);
