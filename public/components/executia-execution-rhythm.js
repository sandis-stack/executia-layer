/**
 * EXECUTIA Execution Rhythm (Phase 5H).
 * Deterministic temporal continuity — presentation only, no execution logic changes.
 */
(function (global) {
  const DEFAULT_CADENCE_MS = 30000;
  const TICK_EVENT = "executia:execution-rhythm-tick";
  const SYNC_EVENT = "executia:execution-rhythm-sync";

  const CONTINUITY = Object.freeze({
    EXECUTION_CONTINUITY: "EXECUTION CONTINUITY MAINTAINED",
    GOVERNANCE_SYNCHRONIZED: "GOVERNANCE SYNCHRONIZED",
    CANONICAL_RHYTHM: "CANONICAL RHYTHM ACTIVE",
    EXECUTION_CONTINUOUS: "EXECUTION STATE CONTINUOUS",
    SURFACE_SYNCHRONIZED: "EXECUTION SURFACE SYNCHRONIZED"
  });

  const CONTINUITY_DISPLAY_MAX = 5;

  function CMP() {
    return global.EXECUTIA_CANONICAL_COMPRESSION;
  }

  function continuityCap() {
    return CMP()?.displayLimit?.(CONTINUITY_DISPLAY_MAX) ?? CONTINUITY_DISPLAY_MAX;
  }

  const TEMPORAL_HIERARCHY = Object.freeze({
    PRIMARY: "execution continuity",
    SECONDARY: "governance state",
    TERTIARY: "diagnostics"
  });

  const TIMING_LANGUAGE = Object.freeze({
    SYNCHRONIZED: "synchronized",
    CANONICAL: "canonical",
    DETERMINISTIC: "deterministic",
    GOVERNED: "governed",
    CONTINUITY: "continuity maintained"
  });

  let timerId = null;
  let cadenceMs = DEFAULT_CADENCE_MS;
  let lastSyncAt = null;
  let cycleIndex = 0;
  let activeController = null;

  function formatSyncTime(date) {
    try {
      return date.toLocaleString(undefined, {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return "—";
    }
  }

  function formatCadenceLabel(ms) {
    const sec = Math.round(ms / 1000);
    if (sec >= 60) return `${Math.round(sec / 60)}m ${TIMING_LANGUAGE.GOVERNED} cadence`;
    return `${sec}s ${TIMING_LANGUAGE.DETERMINISTIC} cadence`;
  }

  function isRhythmPage() {
    return (
      document.body.classList.contains("ex-rhythm-enabled") ||
      document.body.classList.contains("ex-gov-modes-enabled")
    );
  }

  function mountRhythmBand() {
    if (!isRhythmPage()) return;
    if (document.getElementById("exRhythmBand")) return;

    const anchor =
      document.querySelector(".ex-gov-mode-bar") ||
      document.querySelector(".ex-gov-authority-frame") ||
      document.querySelector(".ex-op-authority");
    const band = document.createElement("div");
    band.className = "ex-rhythm-band";
    band.id = "exRhythmBand";
    band.setAttribute("role", "status");
    band.setAttribute("aria-live", "polite");
    band.setAttribute("aria-label", "Execution rhythm");
    band.innerHTML = `
      <div class="ex-rhythm-inner">
        <div class="ex-rhythm-primary ex-gov-tier-primary">
          <span class="ex-rhythm-pulse" aria-hidden="true"></span>
          <span id="exRhythmContinuity">${CONTINUITY.EXECUTION_CONTINUITY}</span>
        </div>
        <p class="ex-rhythm-secondary ex-gov-tier-secondary" id="exRhythmGovernance">${CONTINUITY.GOVERNANCE_SYNCHRONIZED}</p>
        <p class="ex-rhythm-tertiary ex-gov-tier-tertiary" id="exRhythmTiming">Governed refresh · ${formatCadenceLabel(DEFAULT_CADENCE_MS)}</p>
        <div class="ex-rhythm-continuity-row ex-gov-tier-secondary" id="exRhythmContinuityStates" aria-label="Continuity framing"></div>
      </div>
    `;

    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", band);
    } else {
      const main = document.querySelector("main");
      if (main) main.prepend(band);
    }
  }

  function continuityFrames(ctx) {
    const frames = [CONTINUITY.EXECUTION_CONTINUITY, CONTINUITY.GOVERNANCE_SYNCHRONIZED];
    const intel = ctx?.intel;
    const data = ctx?.data || {};
    const ag = ctx?.ag || {};
    if (intel?.deploy_readiness === "READY" || data?.state === "OK") {
      frames.push(CONTINUITY.CANONICAL_RHYTHM);
    }
    if (intel?.stability?.overall_score != null || (ag.canonical_authority || []).length > 0) {
      frames.push(CONTINUITY.EXECUTION_CONTINUOUS);
    }
    if (
      data.engineering_console_detected ||
      ag.engineering_console_detected ||
      data.engineering_console_authority?.GOVERNED
    ) {
      frames.push(CONTINUITY.SURFACE_SYNCHRONIZED);
    }
    return frames.slice(0, continuityCap());
  }

  function primaryContinuityLine(ctx) {
    const lines = continuityFrames(ctx);
    return lines[cycleIndex % lines.length] || CONTINUITY.EXECUTION_CONTINUITY;
  }

  function continuityStatesHtml(frames, activeLabel) {
    return frames
      .map((label) => {
        const active = label === activeLabel ? " is-active" : "";
        return `<span class="ex-rhythm-continuity${active}">${label}</span>`;
      })
      .join("");
  }

  function formatTimingPresentation() {
    if (CMP()?.isActive?.()) {
      const syncPart = lastSyncAt ? formatSyncTime(lastSyncAt) : "—";
      return `Governed refresh · ${syncPart}`;
    }
    const syncPart = lastSyncAt
      ? `Last ${TIMING_LANGUAGE.SYNCHRONIZED} ${formatSyncTime(lastSyncAt)}`
      : `Awaiting ${TIMING_LANGUAGE.CANONICAL} sync`;
    return `${TIMING_LANGUAGE.DETERMINISTIC} refresh · ${formatCadenceLabel(cadenceMs)} · ${syncPart} · ${TIMING_LANGUAGE.CONTINUITY}`;
  }

  function applyRhythm(ctx, options = {}) {
    mountRhythmBand();
    const syncing = options.syncing === true;
    const failed = options.failed === true;

    const continuityEl = document.getElementById("exRhythmContinuity");
    const govEl = document.getElementById("exRhythmGovernance");
    const timingEl = document.getElementById("exRhythmTiming");
    const statesEl = document.getElementById("exRhythmContinuityStates");

    const frames = continuityFrames(ctx || {});
    const primaryLine = primaryContinuityLine(ctx || {});

    if (continuityEl && !syncing) {
      continuityEl.textContent = primaryLine;
    }
    if (govEl) {
      govEl.textContent = failed
        ? "Governance resynchronizing"
        : syncing
          ? "Governance synchronizing"
          : CONTINUITY.GOVERNANCE_SYNCHRONIZED;
    }
    if (timingEl) {
      timingEl.textContent = formatTimingPresentation();
    }
    if (statesEl && !syncing) {
      statesEl.innerHTML = continuityStatesHtml(frames, primaryLine);
    }

    document.body.classList.toggle("ex-rhythm-syncing", syncing);
    document.body.classList.toggle("ex-rhythm-stable", !syncing && !failed);
  }

  function markSynchronized() {
    lastSyncAt = new Date();
    cycleIndex += 1;
    document.body.classList.remove("ex-rhythm-syncing");
    document.dispatchEvent(
      new CustomEvent(SYNC_EVENT, { detail: { at: lastSyncAt.toISOString(), cadenceMs } })
    );
  }

  function stopRhythm() {
    if (timerId != null) {
      clearInterval(timerId);
      timerId = null;
    }
    activeController = null;
  }

  function startRhythm(options = {}) {
    stopRhythm();
    cadenceMs = options.cadenceMs || DEFAULT_CADENCE_MS;
    const onTick = typeof options.onTick === "function" ? options.onTick : null;

    mountRhythmBand();
    applyRhythm(options.context || {}, { syncing: false });

    const tick = () => {
      document.dispatchEvent(
        new CustomEvent(TICK_EVENT, { detail: { cadenceMs, at: new Date().toISOString() } })
      );
      if (onTick) onTick();
    };

    if (options.immediate !== false) tick();
    timerId = setInterval(tick, cadenceMs);
    const controller = { stop: stopRhythm, cadenceMs, tick };
    activeController = controller;
    return controller;
  }

  function runGovernedRefresh(refreshFn, options = {}) {
    if (activeController) activeController.stop();

    const cadence = options.cadenceMs || DEFAULT_CADENCE_MS;
    const ctxProvider = options.context || (() => ({}));

    async function cycle() {
      applyRhythm(ctxProvider(), { syncing: true });
      try {
        await refreshFn();
        markSynchronized();
        applyRhythm(ctxProvider(), { syncing: false });
      } catch {
        applyRhythm(ctxProvider(), { syncing: false, failed: true });
      }
    }

    activeController = startRhythm({
      cadenceMs: cadence,
      immediate: options.immediate !== false,
      context: ctxProvider(),
      onTick: cycle
    });
    return activeController;
  }

  global.EXECUTIA_EXECUTION_RHYTHM = Object.freeze({
    CONTINUITY,
    TEMPORAL_HIERARCHY,
    TIMING_LANGUAGE,
    TICK_EVENT,
    SYNC_EVENT,
    DEFAULT_CADENCE_MS,
    CONTINUITY_DISPLAY_MAX,
    mountRhythmBand,
    applyRhythm,
    markSynchronized,
    startRhythm,
    stopRhythm,
    runGovernedRefresh,
    formatCadenceLabel,
    formatTimingPresentation,
    getActiveController: () => activeController
  });
})(typeof window !== "undefined" ? window : globalThis);
