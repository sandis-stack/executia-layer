/**
 * EXECUTIA Execution Intent (Phase 5K).
 * Institutional purpose and directional outcomes — presentation only, no execution logic changes.
 */
(function (global) {
  const INTENT = Object.freeze({
    EXECUTION_OBJECTIVE: "EXECUTION OBJECTIVE",
    GOVERNED_OUTCOME: "GOVERNED OUTCOME",
    CANONICAL_INTENT: "CANONICAL INTENT",
    EXECUTION_DIRECTION: "EXECUTION DIRECTION",
    INSTITUTIONAL_OBJECTIVE: "INSTITUTIONAL OBJECTIVE",
    DETERMINISTIC_PURPOSE: "DETERMINISTIC PURPOSE"
  });

  const HIERARCHY = Object.freeze({
    PRIMARY: "execution objective",
    SECONDARY: "governance continuity",
    TERTIARY: "diagnostics"
  });

  const DESCRIPTORS = Object.freeze({
    PURPOSE:
      "Execution exists to advance governed outcomes — institutional direction precedes operational motion.",
    DIRECTION:
      "Execution moves toward canonical intent; consequence and memory preserve objective continuity.",
    OUTCOME: "Governed outcomes remain deterministic — purpose binds authority, replay, and verify.",
    MISSION: "Deterministic purpose sustains mission continuity across governance transitions."
  });

  const INTENT_DISPLAY_MAX = 5;

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

  function isIntentPage() {
    return (
      document.body.classList.contains("ex-intent-enabled") ||
      document.body.classList.contains("ex-gov-modes-enabled")
    );
  }

  function mountIntentBand() {
    if (!isIntentPage()) return;
    if (document.getElementById("exIntentBand")) return;

    const anchor =
      document.getElementById("exMemoryBand") ||
      document.getElementById("exConsequenceBand") ||
      document.getElementById("exRhythmBand") ||
      document.querySelector(".ex-gov-mode-bar");
    const band = document.createElement("div");
    band.className = "ex-intent-band";
    band.id = "exIntentBand";
    band.setAttribute("role", "status");
    band.setAttribute("aria-live", "polite");
    band.setAttribute("aria-label", "Execution intent");
    band.innerHTML = `
      <div class="ex-intent-inner">
        <p class="ex-intent-primary ${tierClass("primary")}" id="exIntentPrimary">${INTENT.EXECUTION_OBJECTIVE}</p>
        <p class="ex-intent-secondary ${tierClass("secondary")}" id="exIntentSecondary">${INTENT.EXECUTION_DIRECTION}</p>
        <p class="ex-intent-tertiary ${tierClass("tertiary")}" id="exIntentMeta">${DESCRIPTORS.PURPOSE}</p>
        <div class="ex-intent-frames ${tierClass("secondary")}" id="exIntentFrames" aria-label="Institutional intent framing"></div>
      </div>
    `;

    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", band);
    } else {
      const main = document.querySelector("main");
      if (main) main.prepend(band);
    }
  }

  function deriveIntentState(ctx) {
    const intel = ctx?.intel || {};
    const ag = ctx?.ag || {};
    const readiness = intel.deploy_readiness;
    const risk = intel.risk?.overall;
    const recs = (intel.recommendations || []).length;
    const canonical = (ag?.canonical_authority || []).length;

    const frames = [INTENT.EXECUTION_OBJECTIVE, INTENT.EXECUTION_DIRECTION];
    let secondary = INTENT.INSTITUTIONAL_OBJECTIVE;
    let objectiveLine =
      "Advance governed outcomes under canonical authority — execution toward institutional objective.";

    if (readiness === "APPROVED" || readiness === "READY") {
      frames.push(INTENT.GOVERNED_OUTCOME, INTENT.CANONICAL_INTENT);
      secondary = INTENT.GOVERNED_OUTCOME;
      objectiveLine = "Governed outcome in scope — canonical intent aligned with execution objective.";
    } else if (readiness === "REVIEW_REQUIRED") {
      frames.push(INTENT.INSTITUTIONAL_OBJECTIVE, INTENT.DETERMINISTIC_PURPOSE);
      secondary = INTENT.INSTITUTIONAL_OBJECTIVE;
      objectiveLine = "Institutional objective under review — execution direction holds until authority confirms.";
    } else {
      frames.push(INTENT.DETERMINISTIC_PURPOSE);
      secondary = INTENT.CANONICAL_INTENT;
    }

    if (canonical > 0) frames.push(INTENT.CANONICAL_INTENT);
    if (risk) frames.push(INTENT.DETERMINISTIC_PURPOSE);

    const readinessLine = readiness
      ? `${INTENT.GOVERNED_OUTCOME} posture · ${readiness}`
      : `${INTENT.EXECUTION_DIRECTION} · posture pending`;

    const compressed = CMP()?.isActive?.() === true;
    const cap = CMP()?.displayLimit?.(INTENT_DISPLAY_MAX) ?? INTENT_DISPLAY_MAX;
    return {
      primary: INTENT.EXECUTION_OBJECTIVE,
      secondary: compressed ? `${secondary} · ${readiness ?? "—"}` : `${secondary} · ${readinessLine}`,
      meta: CMP()?.compressMeta?.("INTENT", `${DESCRIPTORS.PURPOSE} · ${DESCRIPTORS.MISSION}`) ?? `${DESCRIPTORS.PURPOSE} · ${DESCRIPTORS.MISSION}`,
      frames: [...new Set(frames)].slice(0, cap),
      objectiveLine: compressed ? `${INTENT.GOVERNED_OUTCOME} · ${readiness ?? "—"}` : objectiveLine,
      directionLine: compressed ? "Direction governed" : DESCRIPTORS.DIRECTION,
      outcomeLine: compressed
        ? `${INTENT.EXECUTION_DIRECTION} · ${risk ?? "—"}`
        : readiness
          ? `${INTENT.GOVERNED_OUTCOME}: ${readiness} · risk ${risk ?? "—"}`
          : `${INTENT.EXECUTION_DIRECTION}: institutional objective continuity`,
      recommendationNote: compressed
        ? (recs ? `${recs} signals` : "—")
        : recs
          ? `${recs} institutional objective signal${recs === 1 ? "" : "s"} under governance`
          : "No additional objective signals at this posture"
    };
  }

  function intentFramesHtml(frames, active) {
    return frames
      .map((label) => {
        const on = label === active ? " is-active" : "";
        return `<span class="ex-intent-frame${on}">${esc(label)}</span>`;
      })
      .join("");
  }

  function applyIntent(ctx) {
    mountIntentBand();
    const state = deriveIntentState(ctx || {});

    const primaryEl = document.getElementById("exIntentPrimary");
    const secondaryEl = document.getElementById("exIntentSecondary");
    const metaEl = document.getElementById("exIntentMeta");
    const framesEl = document.getElementById("exIntentFrames");

    if (primaryEl) primaryEl.textContent = state.primary;
    if (secondaryEl) secondaryEl.textContent = state.secondary;
    if (metaEl) metaEl.textContent = state.meta;
    if (framesEl) framesEl.innerHTML = intentFramesHtml(state.frames, state.primary);

    document.body.classList.toggle("ex-intent-active", Boolean(ctx?.intel || ctx?.data));
    return state;
  }

  function objectiveFramingHtml(ctx) {
    if (CMP()?.isActive?.() && CMP()?.canonicalPostureBlock) {
      return "";
    }
    const state = deriveIntentState(ctx || {});
    return `
      <div class="ex-intent-objective-block ${tierClass("primary")}">
        <p class="ex-intent-objective-label">${esc(INTENT.EXECUTION_OBJECTIVE)}</p>
        <p class="ex-intent-objective-line ${tierClass("secondary")}">${esc(state.objectiveLine)}</p>
        <p class="ex-intent-direction-line ${tierClass("tertiary")}">${esc(state.directionLine)}</p>
        <p class="ex-intent-outcome-line ${tierClass("tertiary")}">${esc(state.outcomeLine)} · ${esc(state.recommendationNote)}.</p>
      </div>
    `;
  }

  function governedOutcomeLabel() {
    return INTENT.GOVERNED_OUTCOME;
  }

  global.EXECUTIA_EXECUTION_INTENT = Object.freeze({
    INTENT,
    HIERARCHY,
    DESCRIPTORS,
    mountIntentBand,
    applyIntent,
    deriveIntentState,
    objectiveFramingHtml,
    governedOutcomeLabel
  });
})(typeof window !== "undefined" ? window : globalThis);
