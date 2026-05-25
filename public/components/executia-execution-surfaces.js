/**
 * EXECUTIA Canonical Execution Surfaces (Phase 6B).
 * Real operator mechanics — governed acts wired to execution transition API.
 */
(function (global) {
  const CANON = global.EXECUTIA_CANONICAL_SEMANTICS || {};
  const CANONICAL_AUTHORITY = CANON.CANONICAL_AUTHORITY || {
    EXECUTION: "EXECUTION AUTHORITY",
    GOVERNANCE: "GOVERNANCE AUTHORITY",
    CANONICAL: "CANONICAL AUTHORITY",
    REPLAY: "REPLAY AUTHORITY",
    PROOF: "PROOF AUTHORITY"
  };
  const labelForAction = CANON.labelForAction || (() => CANONICAL_AUTHORITY.GOVERNANCE);

  const SURFACES = Object.freeze({
    APPROVAL: "execution-approval",
    COMMIT: "canonical-commit",
    REPLAY: "replay-verification",
    TRANSITION: "governance-transition",
    PROOF: "proof-authority"
  });

  const SEMANTICS = Object.freeze({
    EXECUTION_COMMITTED: labelForAction("COMMIT"),
    GOVERNANCE_VERIFIED: labelForAction("VERIFY"),
    CANONICAL_TRANSITION: CANONICAL_AUTHORITY.CANONICAL,
    EXECUTION_AUTHORITY_CONFIRMED: labelForAction("APPROVE"),
    REPLAY_SAFE: labelForAction("REPLAY"),
    EXECUTION_CONTINUITY_MAINTAINED: labelForAction("ESCALATE")
  });

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function surfaceShell(kind, title, bodyHtml) {
    return `
      <section class="ex-exec-surface ex-exec-surface--${esc(kind)}" data-exec-surface="${esc(kind)}">
        <h3 class="ex-exec-surface-title">${esc(title)}</h3>
        <div class="ex-exec-surface-body">${bodyHtml}</div>
      </section>
    `;
  }

  function renderApprovalSurface(execution) {
    const id = execution?.execution_id || execution?.id || "—";
    const status = execution?.status || "PENDING_REVIEW";
    return surfaceShell(
      SURFACES.APPROVAL,
      "Execution Approval Surface",
      `
        <p class="ex-exec-line">${esc(SEMANTICS.EXECUTION_AUTHORITY_CONFIRMED)}</p>
        <p class="ex-exec-meta">Execution ${esc(id)} · ${esc(status)}</p>
        <div class="ex-exec-acts">
          <button type="button" class="ex-exec-act ex-exec-act--approve" data-exec-action="APPROVE">${esc(labelForAction("APPROVE"))}</button>
          <button type="button" class="ex-exec-act ex-exec-act--reject" data-exec-action="REJECT">${esc(labelForAction("REJECT"))}</button>
        </div>
      `
    );
  }

  function renderTransitionSurface() {
    return surfaceShell(
      SURFACES.TRANSITION,
      "Governance Transition Surface",
      `
        <p class="ex-exec-line">${esc(SEMANTICS.CANONICAL_TRANSITION)}</p>
        <div class="ex-exec-acts">
          <button type="button" class="ex-exec-act ex-exec-act--secondary" data-exec-action="ESCALATE">${esc(labelForAction("ESCALATE"))}</button>
          <button type="button" class="ex-exec-act ex-exec-act--secondary" data-exec-action="FREEZE">${esc(labelForAction("FREEZE"))}</button>
        </div>
      `
    );
  }

  function renderReplaySurface() {
    return surfaceShell(
      SURFACES.REPLAY,
      "Replay Verification Surface",
      `
        <p class="ex-exec-line">${esc(SEMANTICS.REPLAY_SAFE)} · ${esc(CANONICAL_AUTHORITY.REPLAY)}</p>
        <button type="button" class="ex-exec-act ex-exec-act--secondary" data-exec-action="VERIFY_REPLAY">${esc(labelForAction("VERIFY_REPLAY"))}</button>
      `
    );
  }

  function renderProofSurface() {
    return surfaceShell(
      SURFACES.PROOF,
      "Proof Authority Surface",
      `
        <p class="ex-exec-line">${esc(SEMANTICS.GOVERNANCE_VERIFIED)} · ${esc(CANONICAL_AUTHORITY.PROOF)}</p>
        <button type="button" class="ex-exec-act ex-exec-act--secondary" data-exec-action="VERIFY_PROOF">${esc(labelForAction("VERIFY_PROOF"))}</button>
      `
    );
  }

  function renderCommitSurface(execution) {
    const status = execution?.status || "—";
    return surfaceShell(
      SURFACES.COMMIT,
      "Canonical Commit Surface",
      `
        <p class="ex-exec-line">${esc(SEMANTICS.EXECUTION_COMMITTED)}</p>
        <p class="ex-exec-meta">Posture ${esc(status)} · canonical record</p>
        <button type="button" class="ex-exec-act ex-exec-act--commit" data-exec-action="COMMIT" ${status !== "APPROVED" ? "disabled" : ""}>${esc(labelForAction("COMMIT"))}</button>
      `
    );
  }

  function renderOperatorSurfaces(execution) {
    return `
      <div class="ex-exec-surfaces-root">
        ${renderApprovalSurface(execution)}
        ${renderTransitionSurface()}
        ${renderCommitSurface(execution)}
        ${renderReplaySurface()}
        ${renderProofSurface()}
        <div class="ex-exec-flow" id="exExecFlowPanel" aria-live="polite"></div>
      </div>
    `;
  }

  function renderFlowPanel(result) {
    const stages = result?.commit_flow?.stages || [];
    if (!stages.length) {
      return `<p class="ex-exec-meta">Awaiting governed transition.</p>`;
    }
    return `
      <p class="ex-exec-flow-title">CANONICAL EXECUTION FLOW</p>
      <ol class="ex-exec-flow-list">
        ${stages
          .map(
            (s) =>
              `<li><span class="ex-exec-flow-stage">${esc(s.stage)}</span> · ${esc(s.state)}${s.detail ? ` · ${esc(typeof s.detail === "string" ? s.detail : JSON.stringify(s.detail))}` : ""}</li>`
          )
          .join("")}
      </ol>
      ${
        result.semantics?.length
          ? `<p class="ex-exec-semantics">${result.semantics.map((x) => esc(x)).join(" · ")}</p>`
          : ""
      }
    `;
  }

  function bindOperatorSurfaces(root, { onAction, getExecution }) {
    const container = root || document;
    container.querySelectorAll("[data-exec-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-exec-action");
        const execution = typeof getExecution === "function" ? getExecution() : null;
        if (!execution) {
          alert("No execution selected.");
          return;
        }
        if (typeof onAction === "function") {
          await onAction(action, execution, btn);
        }
      });
    });
  }

  function applyTransitionResult(result) {
    const panel = document.getElementById("exExecFlowPanel");
    if (panel) panel.innerHTML = renderFlowPanel(result);

    if (global.EXECUTIA_EXECUTION_CONSEQUENCE?.frameOperatorAction && result?.action) {
      const map = {
        APPROVE: "APPROVE",
        REJECT: "BLOCK",
        COMMIT: "COMMIT",
        FREEZE: "FREEZE",
        ESCALATE: "ESCALATE"
      };
      const key = map[result.action];
      if (key) global.EXECUTIA_EXECUTION_CONSEQUENCE.frameOperatorAction(key);
    }
  }

  global.EXECUTIA_EXECUTION_SURFACES = Object.freeze({
    SURFACES,
    SEMANTICS,
    renderOperatorSurfaces,
    renderFlowPanel,
    bindOperatorSurfaces,
    applyTransitionResult
  });
})(typeof window !== "undefined" ? window : globalThis);
