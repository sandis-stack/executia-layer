/**
 * EXECUTIA Execution Trust (Phase 5L).
 * Structural institutional reliability — presentation only, no execution logic changes.
 */
(function (global) {
  const TRUST = Object.freeze({
    TRUST_MAINTAINED: "TRUST MAINTAINED",
    GOVERNANCE_VERIFIED: "GOVERNANCE VERIFIED",
    EXECUTION_CONSISTENT: "EXECUTION CONSISTENT",
    CANONICAL_CONTINUITY: "CANONICAL CONTINUITY",
    STRUCTURAL_INTEGRITY_ACTIVE: "STRUCTURAL INTEGRITY ACTIVE",
    EXECUTION_RELIABILITY_VERIFIED: "EXECUTION RELIABILITY VERIFIED"
  });

  const HIERARCHY = Object.freeze({
    PRIMARY: "execution reliability",
    SECONDARY: "governance continuity",
    TERTIARY: "diagnostics"
  });

  const DESCRIPTORS = Object.freeze({
    RELIABILITY:
      "Execution behaves predictably under governance — reliability is structural, not asserted.",
    PREDICTABILITY: "Canonical continuity and governed consistency remove operational uncertainty.",
    STABILITY: "Institutional trust follows deterministic verify, replay, and consequence order.",
    INEVITABILITY: "Stable execution continuity is operationally inevitable at maintained posture."
  });

  const TRUST_DISPLAY_MAX = 5;

  function CMP() {
    return global.EXECUTIA_CANONICAL_COMPRESSION;
  }
  const RELIABILITY_STABLE_THRESHOLD = 85;

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

  function isTrustPage() {
    return (
      document.body.classList.contains("ex-trust-enabled") ||
      document.body.classList.contains("ex-gov-modes-enabled")
    );
  }

  function mountTrustBand() {
    if (!isTrustPage()) return;
    if (document.getElementById("exTrustBand")) return;

    const anchor =
      document.getElementById("exIntentBand") ||
      document.getElementById("exMemoryBand") ||
      document.getElementById("exConsequenceBand") ||
      document.querySelector(".ex-gov-mode-bar");
    const band = document.createElement("div");
    band.className = "ex-trust-band";
    band.id = "exTrustBand";
    band.setAttribute("role", "status");
    band.setAttribute("aria-live", "polite");
    band.setAttribute("aria-label", "Execution trust");
    band.innerHTML = `
      <div class="ex-trust-inner">
        <p class="ex-trust-primary ${tierClass("primary")}" id="exTrustPrimary">${TRUST.EXECUTION_RELIABILITY_VERIFIED}</p>
        <p class="ex-trust-secondary ${tierClass("secondary")}" id="exTrustSecondary">${TRUST.GOVERNANCE_VERIFIED}</p>
        <p class="ex-trust-tertiary ${tierClass("tertiary")}" id="exTrustMeta">${DESCRIPTORS.RELIABILITY}</p>
        <div class="ex-trust-frames ${tierClass("secondary")}" id="exTrustFrames" aria-label="Structural trust framing"></div>
      </div>
    `;

    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", band);
    } else {
      const main = document.querySelector("main");
      if (main) main.prepend(band);
    }
  }

  function deriveTrustState(ctx) {
    const intel = ctx?.intel || {};
    const data = ctx?.data || {};
    const sc = intel.stability || {};
    const overall = Number(sc.overall_score);
    const missing = (data?.missing_sources || []).length;
    const risk = intel.risk?.overall;
    const present = data?.sources_present || {};
    const scoreKnown = Number.isFinite(overall);

    const frames = [TRUST.EXECUTION_RELIABILITY_VERIFIED, TRUST.GOVERNANCE_VERIFIED];
    let primary = TRUST.EXECUTION_RELIABILITY_VERIFIED;
    let secondary = TRUST.GOVERNANCE_VERIFIED;
    let reliabilityLine =
      "Structural integrity active — execution consistency follows canonical governance order.";

    if (scoreKnown && overall >= RELIABILITY_STABLE_THRESHOLD && !missing) {
      frames.push(TRUST.TRUST_MAINTAINED, TRUST.EXECUTION_CONSISTENT, TRUST.CANONICAL_CONTINUITY);
      primary = TRUST.TRUST_MAINTAINED;
      secondary = TRUST.EXECUTION_CONSISTENT;
      reliabilityLine = `Execution reliability verified · integrity index ${overall} · predictable governed behavior.`;
    } else if (scoreKnown && overall >= RELIABILITY_STABLE_THRESHOLD) {
      frames.push(TRUST.STRUCTURAL_INTEGRITY_ACTIVE, TRUST.CANONICAL_CONTINUITY);
      primary = TRUST.STRUCTURAL_INTEGRITY_ACTIVE;
      secondary = TRUST.CANONICAL_CONTINUITY;
      reliabilityLine = `Structural integrity active · index ${overall} · ${missing} continuity source(s) pending canonical generation.`;
    } else {
      frames.push(TRUST.STRUCTURAL_INTEGRITY_ACTIVE, TRUST.EXECUTION_CONSISTENT);
      primary = TRUST.STRUCTURAL_INTEGRITY_ACTIVE;
      secondary = TRUST.EXECUTION_CONSISTENT;
      reliabilityLine = scoreKnown
        ? `Governed consistency under verification · integrity index ${overall}.`
        : "Governed consistency under verification — integrity index pending.";
    }

    if (present.architecture_graph && present.execution_intelligence) {
      frames.push(TRUST.CANONICAL_CONTINUITY);
    }

    const predictabilityLine = `${DESCRIPTORS.PREDICTABILITY} · ${DESCRIPTORS.INEVITABILITY}`;
    const stabilityLine = risk
      ? `${TRUST.GOVERNANCE_VERIFIED} · risk posture ${risk} · ${TRUST.EXECUTION_CONSISTENT}`
      : `${TRUST.GOVERNANCE_VERIFIED} · ${TRUST.EXECUTION_CONSISTENT}`;

    const compressed = CMP()?.isActive?.() === true;
    const cap = CMP()?.displayLimit?.(TRUST_DISPLAY_MAX) ?? TRUST_DISPLAY_MAX;
    return {
      primary,
      secondary,
      meta: CMP()?.compressMeta?.("TRUST", `${DESCRIPTORS.RELIABILITY} · ${DESCRIPTORS.STABILITY}`) ?? `${DESCRIPTORS.RELIABILITY} · ${DESCRIPTORS.STABILITY}`,
      frames: [...new Set(frames)].slice(0, cap),
      reliabilityLine: compressed
        ? `${primary} · index ${scoreKnown ? overall : "—"}`
        : reliabilityLine,
      predictabilityLine: compressed ? "Predictable · governed" : predictabilityLine,
      stabilityLine: compressed ? stabilityLine.split(" · ")[0] : stabilityLine,
      integrityIndex: scoreKnown ? overall : "—"
    };
  }

  function trustFramesHtml(frames, active) {
    return frames
      .map((label) => {
        const on = label === active ? " is-active" : "";
        return `<span class="ex-trust-frame${on}">${esc(label)}</span>`;
      })
      .join("");
  }

  function applyTrust(ctx) {
    mountTrustBand();
    const state = deriveTrustState(ctx || {});

    const primaryEl = document.getElementById("exTrustPrimary");
    const secondaryEl = document.getElementById("exTrustSecondary");
    const metaEl = document.getElementById("exTrustMeta");
    const framesEl = document.getElementById("exTrustFrames");

    if (primaryEl) primaryEl.textContent = state.primary;
    if (secondaryEl) secondaryEl.textContent = state.secondary;
    if (metaEl) metaEl.textContent = state.meta;
    if (framesEl) framesEl.innerHTML = trustFramesHtml(state.frames, state.primary);

    document.body.classList.toggle("ex-trust-stable", state.primary === TRUST.TRUST_MAINTAINED);
    document.body.classList.toggle("ex-trust-active", Boolean(ctx?.intel || ctx?.data));
    return state;
  }

  function reliabilityFramingHtml(ctx) {
    if (CMP()?.isActive?.()) return "";
    const state = deriveTrustState(ctx || {});
    return `
      <div class="ex-trust-reliability-block ${tierClass("primary")}">
        <p class="ex-trust-reliability-label">${esc(TRUST.EXECUTION_RELIABILITY_VERIFIED)}</p>
        <p class="ex-trust-reliability-line ${tierClass("secondary")}">${esc(state.reliabilityLine)}</p>
        <p class="ex-trust-predictability-line ${tierClass("tertiary")}">${esc(state.predictabilityLine)}</p>
        <p class="ex-trust-stability-line ${tierClass("tertiary")}">${esc(state.stabilityLine)} · index ${esc(state.integrityIndex)}.</p>
      </div>
    `;
  }

  function reliabilitySurfaceTitle() {
    return CMP()?.isActive?.() ? "Execution reliability" : "Structural execution reliability";
  }

  global.EXECUTIA_EXECUTION_TRUST = Object.freeze({
    TRUST,
    HIERARCHY,
    DESCRIPTORS,
    RELIABILITY_STABLE_THRESHOLD,
    mountTrustBand,
    applyTrust,
    deriveTrustState,
    reliabilityFramingHtml,
    reliabilitySurfaceTitle
  });
})(typeof window !== "undefined" ? window : globalThis);
