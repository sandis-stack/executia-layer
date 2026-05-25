/**
 * EXECUTIA Pilot & Proof Readiness — institutional examples and surfaces.
 * Presentation only; requires executia-institutional-environment.js
 */
(function (global) {
  const ENV = () => global.EXECUTIA_INSTITUTIONAL_ENV;
  const AI = () => ENV()?.AI_CLARITY || {};

  const PILOT_EXAMPLES = Object.freeze([
    {
      id: "procurement",
      title: "Procurement Governance",
      organization: "Public procurement authority",
      execution_critical_process: "Supplier award and contract commitment before disbursement",
      governance_risk: "Award without verified supplier or approval bypass",
      deterministic_execution_objective: "Block commitment until validation and review complete",
      replay_requirement: "Replay-Safe Verification before every award commit",
      proof_requirement: "Regulator-readable proof receipt with canonical continuity"
    },
    {
      id: "payment",
      title: "Payment Approval Governance",
      organization: "Treasury operations",
      execution_critical_process: "Outbound payment settlement after dual approval",
      governance_risk: "Settlement without limit check or missing second approver",
      deterministic_execution_objective: "Deterministic Execution — same rules, same outcome",
      replay_requirement: "Replay chain check before ledger commit",
      proof_requirement: "Execution-Time Truth at payment commit"
    },
    {
      id: "compliance",
      title: "Compliance Execution Verification",
      organization: "Regulated financial operator",
      execution_critical_process: "Control execution before regulatory reporting period close",
      governance_risk: "Unverified control state reported as compliant",
      deterministic_execution_objective: "Canonical Governance sign-off before report lock",
      replay_requirement: "Read-only replay of control evaluation path",
      proof_requirement: "Execution Integrity evidence for audit"
    },
    {
      id: "infrastructure",
      title: "Infrastructure Execution Approval",
      organization: "Critical infrastructure operator",
      execution_critical_process: "Maintenance execution affecting live systems",
      governance_risk: "Change window violation or unapproved operational commit",
      deterministic_execution_objective: "Governed approval before operational execution",
      replay_requirement: "Replay-Safe Verification of approval chain",
      proof_requirement: "Immutable proof of approval and block decisions"
    }
  ]);

  const PROOF_FLOW = Object.freeze([
    "Execution request",
    "Governance validation",
    "Approval or block",
    "Execution commit",
    "Replay-Safe Verification",
    "Canonical proof continuity"
  ]);

  const PROOF_EXAMPLES = Object.freeze(
    PILOT_EXAMPLES.map((p) => ({
      id: p.id,
      title: p.title,
      outcome: "BLOCKED",
      replay: "REPLAY_SAFE",
      proof: "PROOF_VERIFIED"
    }))
  );

  /** Deterministic state labels for public surfaces (aligned with canonical semantics). */
  const STATE_LABELS = Object.freeze({
    REQUESTED: "Request received under jurisdiction",
    VALIDATED: "Validation binding",
    PENDING_REVIEW: "Governance review holds commit",
    APPROVED: "Execution authority confirmed",
    BLOCKED: "Governance block — consequence denied",
    COMMITTED: "Canonical record committed",
    VERIFIED: "Execution truth verified",
    REPLAY_SAFE: "Replay-Safe Verification complete"
  });

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderPilotExamples() {
    const items = PILOT_EXAMPLES.map(
      (ex) =>
        `<button type="button" class="ex-pilot-example-btn" data-pilot-example="${esc(ex.id)}">${esc(ex.title)}</button>`
    ).join("");
    return `
      <section class="ex-pilot-examples" aria-label="Institutional pilot examples">
        <p class="ex-pilot-examples-label">Canonical pilot examples</p>
        <div class="ex-pilot-examples-list">${items}</div>
      </section>
    `;
  }

  function renderProofExamples() {
    const cards = PROOF_EXAMPLES.map((ex) => {
      const steps = PROOF_FLOW.map(
        (step, i) => `<li class="${i === PROOF_FLOW.length - 1 ? "is-final" : ""}">${esc(step)}</li>`
      ).join("");
      return `
        <article class="ex-proof-example-card">
          <h3>${esc(ex.title)}</h3>
          <ol class="ex-proof-example-flow">${steps}</ol>
          <p class="ex-proof-example-posture">${esc(STATE_LABELS.BLOCKED)} · ${esc(ex.replay)} · ${esc(ex.proof)}</p>
        </article>
      `;
    }).join("");
    return `
      <section class="ex-proof-examples" aria-label="Replay-safe proof examples">
        <p class="ex-pilot-examples-label">${esc(AI().REPLAY || "Replay-Safe Verification")} · ${esc(AI().INTEGRITY || "Execution Integrity")}</p>
        <div class="ex-proof-examples-grid">${cards}</div>
      </section>
    `;
  }

  function applyPilotExample(id) {
    const ex = PILOT_EXAMPLES.find((p) => p.id === id);
    if (!ex) return;
    const set = (elId, val) => {
      const el = document.getElementById(elId);
      if (el) el.value = val || "";
    };
    set("organization", ex.organization);
    set("execution_critical_process", ex.execution_critical_process);
    set("governance_risk", ex.governance_risk);
    set("deterministic_execution_objective", ex.deterministic_execution_objective);
    set("replay_requirement", ex.replay_requirement);
    set("proof_requirement", ex.proof_requirement);
  }

  function getDemoScenario(id) {
    const ex = PILOT_EXAMPLES.find((p) => p.id === id) || PILOT_EXAMPLES[0];
    const types = {
      procurement: "PROCUREMENT",
      payment: "PAYMENT",
      compliance: "COMPLIANCE",
      infrastructure: "INFRASTRUCTURE"
    };
    return {
      title: ex.title,
      request: {
        type: types[ex.id] || "EXECUTION",
        process: ex.execution_critical_process.slice(0, 48) + "…",
        approval: "MISSING"
      }
    };
  }

  function mountPilotExamples() {
    const host = document.querySelector("[data-ex-env-pilot-examples]");
    if (!host) return;
    host.innerHTML = renderPilotExamples();
    host.querySelectorAll("[data-pilot-example]").forEach((btn) => {
      btn.addEventListener("click", () => applyPilotExample(btn.getAttribute("data-pilot-example")));
    });
  }

  function mountProofExamples() {
    const host = document.querySelector("[data-ex-env-proof-examples]");
    if (host) host.innerHTML = renderProofExamples();
  }

  function enhanceAiMeta() {
    if (document.getElementById("ex-env-keywords")) return;
    const meta = document.createElement("meta");
    meta.id = "ex-env-keywords";
    meta.name = "keywords";
    meta.content = [
      "execution governance infrastructure",
      "deterministic execution system",
      "replay-safe governance environment",
      AI().INFRASTRUCTURE,
      AI().DETERMINISTIC,
      AI().REPLAY,
      AI().INTEGRITY,
      AI().TRUTH,
      AI().CANONICAL
    ]
      .filter(Boolean)
      .join(", ");
    document.head.appendChild(meta);
  }

  function mount() {
    if (!document.body.classList.contains("ex-institutional-env")) return;
    enhanceAiMeta();
    mountPilotExamples();
    mountProofExamples();
  }

  global.EXECUTIA_PILOT_READINESS = Object.freeze({
    PILOT_EXAMPLES,
    PROOF_EXAMPLES,
    PROOF_FLOW,
    STATE_LABELS,
    mount,
    applyPilotExample,
    getDemoScenario,
    renderPilotExamples,
    renderProofExamples
  });

  function init() {
    mount();
    document.addEventListener("executia:institutional-env:refresh", mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
