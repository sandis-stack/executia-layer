/**
 * EXECUTIA Execution Consequence (Phase 5I).
 * Governed transition gravity — presentation only, no execution logic changes.
 */
(function (global) {
  const TRANSITION_EVENT = "executia:execution-consequence-transition";

  const TRANSITIONS = Object.freeze({
    EXECUTION_COMMITTED: "EXECUTION COMMITTED",
    GOVERNANCE_TRANSITION_VERIFIED: "GOVERNANCE TRANSITION VERIFIED",
    CANONICAL_STATE_UPDATED: "CANONICAL STATE UPDATED",
    CONSEQUENCE_APPLIED: "EXECUTION CONSEQUENCE APPLIED",
    AUTHORITY_CONFIRMED: "AUTHORITY CONFIRMED"
  });

  const HIERARCHY = Object.freeze({
    PRIMARY: "execution consequence",
    SECONDARY: "governance transition",
    TERTIARY: "diagnostic metadata"
  });

  const DESCRIPTORS = Object.freeze({
    GRAVITY:
      "Operational consequence is final — governed, traceable, and institutionally binding.",
    IRREVERSIBILITY:
      "State transitions follow canonical authority; execution does not revert without governed proof.",
    ACCOUNTABILITY: "Authority confirms material truth before consequence attaches to the chain.",
    TRACE: "Every transition remains deterministic and auditable at verify."
  });

  const OPERATOR_ACTION_MAP = Object.freeze({
    APPROVE: TRANSITIONS.EXECUTION_COMMITTED,
    COMMIT: TRANSITIONS.EXECUTION_COMMITTED,
    CONFIRM: TRANSITIONS.AUTHORITY_CONFIRMED,
    VERIFY: TRANSITIONS.GOVERNANCE_TRANSITION_VERIFIED,
    REJECT: TRANSITIONS.GOVERNANCE_TRANSITION_VERIFIED,
    BLOCK: TRANSITIONS.GOVERNANCE_TRANSITION_VERIFIED,
    ESCALATE: TRANSITIONS.GOVERNANCE_TRANSITION_VERIFIED,
    FREEZE: TRANSITIONS.CANONICAL_STATE_UPDATED,
    REPLAY: TRANSITIONS.CANONICAL_STATE_UPDATED,
    ROLLBACK_BLOCK: TRANSITIONS.CONSEQUENCE_APPLIED
  });

  const TRANSITION_DISPLAY_MAX = 5;

  function CMP() {
    return global.EXECUTIA_CANONICAL_COMPRESSION;
  }

  let lastTransition = null;
  let lastTransitionAt = null;

  function tierClass(level) {
    const core = global.EXECUTIA_GOVERNANCE_CORE;
    if (core?.tierClass) return core.tierClass(level);
    if (level === "primary") return "ex-gov-tier-primary";
    if (level === "secondary") return "ex-gov-tier-secondary";
    return "ex-gov-tier-tertiary";
  }

  function isConsequencePage() {
    return (
      document.body.classList.contains("ex-consequence-enabled") ||
      document.body.classList.contains("ex-gov-modes-enabled")
    );
  }

  function mountConsequenceBand() {
    if (!isConsequencePage()) return;
    if (document.getElementById("exConsequenceBand")) return;

    const anchor =
      document.getElementById("exRhythmBand") ||
      document.querySelector(".ex-gov-mode-bar") ||
      document.querySelector(".ex-gov-authority-frame");
    const band = document.createElement("div");
    band.className = "ex-consequence-band";
    band.id = "exConsequenceBand";
    band.setAttribute("role", "status");
    band.setAttribute("aria-live", "polite");
    band.setAttribute("aria-label", "Execution consequence");
    band.innerHTML = `
      <div class="ex-consequence-inner">
        <p class="ex-consequence-primary ${tierClass("primary")}" id="exConsequencePrimary">${TRANSITIONS.CONSEQUENCE_APPLIED}</p>
        <p class="ex-consequence-secondary ${tierClass("secondary")}" id="exConsequenceSecondary">${TRANSITIONS.GOVERNANCE_TRANSITION_VERIFIED}</p>
        <p class="ex-consequence-tertiary ${tierClass("tertiary")}" id="exConsequenceMeta">${DESCRIPTORS.GRAVITY}</p>
        <div class="ex-consequence-transitions ${tierClass("secondary")}" id="exConsequenceTransitions" aria-label="Governed transitions"></div>
      </div>
    `;

    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", band);
    } else {
      const main = document.querySelector("main");
      if (main) main.prepend(band);
    }
  }

  function deriveConsequenceState(ctx) {
    const intel = ctx?.intel || {};
    const data = ctx?.data || {};
    const readiness = intel.deploy_readiness;
    const risk = intel.risk?.overall;

    let primary = TRANSITIONS.CONSEQUENCE_APPLIED;
    if (readiness === "READY") primary = TRANSITIONS.EXECUTION_COMMITTED;
    else if (readiness === "BLOCKED" || risk === "HIGH") primary = TRANSITIONS.GOVERNANCE_TRANSITION_VERIFIED;

    const secondary =
      (data?.canonical_authority || ctx?.ag?.canonical_authority || []).length > 0
        ? TRANSITIONS.CANONICAL_STATE_UPDATED
        : TRANSITIONS.GOVERNANCE_TRANSITION_VERIFIED;

    const frames = [primary, secondary, TRANSITIONS.AUTHORITY_CONFIRMED];
    if (data.engineering_console_detected || ctx?.ag?.engineering_console_detected) {
      frames.push(TRANSITIONS.CONSEQUENCE_APPLIED);
    }
    if (intel?.stability?.overall_score != null) {
      frames.push(TRANSITIONS.CANONICAL_STATE_UPDATED);
    }

    const unique = [...new Set(frames)];
    const cap = CMP()?.displayLimit?.(TRANSITION_DISPLAY_MAX) ?? TRANSITION_DISPLAY_MAX;
    return {
      primary,
      secondary,
      meta: CMP()?.compressMeta?.("CONSEQUENCE", `${DESCRIPTORS.TRACE} · ${readiness ?? "—"} · ${risk ?? "—"}`) ?? `${DESCRIPTORS.TRACE} · ${readiness ?? "—"} · ${risk ?? "—"}`,
      frames: unique.slice(0, cap)
    };
  }

  function transitionsHtml(frames, active) {
    return frames
      .map((label) => {
        const on = label === active ? " is-active" : "";
        return `<span class="ex-consequence-transition${on}">${label}</span>`;
      })
      .join("");
  }

  function applyConsequence(ctx, options = {}) {
    mountConsequenceBand();
    const state = options.transition
      ? {
          primary: options.transition,
          secondary: TRANSITIONS.GOVERNANCE_TRANSITION_VERIFIED,
          meta: options.meta || DESCRIPTORS.ACCOUNTABILITY,
          frames: [options.transition, TRANSITIONS.AUTHORITY_CONFIRMED]
        }
      : deriveConsequenceState(ctx || {});

    const primaryEl = document.getElementById("exConsequencePrimary");
    const secondaryEl = document.getElementById("exConsequenceSecondary");
    const metaEl = document.getElementById("exConsequenceMeta");
    const rowEl = document.getElementById("exConsequenceTransitions");

    if (primaryEl) primaryEl.textContent = state.primary;
    if (secondaryEl) secondaryEl.textContent = state.secondary;
    if (metaEl) metaEl.textContent = state.meta;
    if (rowEl) rowEl.innerHTML = transitionsHtml(state.frames, state.primary);

    document.body.classList.toggle("ex-consequence-stable", !options.pending);
    document.body.classList.toggle("ex-consequence-pending", options.pending === true);
  }

  function frameOperatorAction(action, meta) {
    const key = String(action || "")
      .toUpperCase()
      .replace(/\s+/g, "_");
    const transition = OPERATOR_ACTION_MAP[key] || TRANSITIONS.AUTHORITY_CONFIRMED;
    lastTransition = transition;
    lastTransitionAt = new Date();
    applyConsequence(
      {},
      {
        transition,
        meta: meta || `${DESCRIPTORS.IRREVERSIBILITY} · ${DESCRIPTORS.TRACE}`,
        pending: false
      }
    );
    document.dispatchEvent(
      new CustomEvent(TRANSITION_EVENT, {
        detail: { action: key, transition, at: lastTransitionAt.toISOString() }
      })
    );
    return { transition, at: lastTransitionAt };
  }

  function presentTransitionPending(action) {
    const key = String(action || "").toUpperCase();
    const transition = OPERATOR_ACTION_MAP[key] || TRANSITIONS.AUTHORITY_CONFIRMED;
    applyConsequence(
      {},
      {
        transition,
        meta: DESCRIPTORS.ACCOUNTABILITY,
        pending: true
      }
    );
  }

  function bindGovernedActs(root) {
    if (!root) return;
    root.querySelectorAll("[data-ex-consequence-act]").forEach((el) => {
      if (el.dataset.exConsequenceBound === "1") return;
      el.dataset.exConsequenceBound = "1";
      el.classList.add("ex-consequence-act");
      const action = el.dataset.exConsequenceAct;
      el.addEventListener("click", () => {
        presentTransitionPending(action);
      });
    });
  }

  global.EXECUTIA_EXECUTION_CONSEQUENCE = Object.freeze({
    TRANSITIONS,
    HIERARCHY,
    DESCRIPTORS,
    OPERATOR_ACTION_MAP,
    TRANSITION_EVENT,
    mountConsequenceBand,
    applyConsequence,
    deriveConsequenceState,
    frameOperatorAction,
    presentTransitionPending,
    bindGovernedActs,
    getLastTransition: () => lastTransition
  });
})(typeof window !== "undefined" ? window : globalThis);
