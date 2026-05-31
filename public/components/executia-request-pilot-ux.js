(function registerExecutiaRequestPilotUx(global) {
  const ADMIN_SCOPE = Object.freeze([
    { label: "Process Selection", value: "Institutional Pilot Evaluation" },
    { label: "Governance Audit", value: "Execution Governance Review" },
    { label: "Gap Identification", value: "Governance Gap Assessment" },
    { label: "Pilot Implementation", value: "Implementation Assessment" }
  ]);

  const ADMIN_OUTCOME = Object.freeze([
    { label: "Reduced Execution Risk", value: "Assessment Outcome" },
    { label: "Execution Governance Visibility", value: "Governance Outcome" },
    { label: "Pilot Case Study", value: "Review Outcome" }
  ]);

  const ADMIN_REVIEW = Object.freeze([
    { label: "Institutional Contact", value: "Contact Review Record" },
    { label: "Institution", value: "Institution Review Record" },
    { label: "Authority Role", value: "Role Review Record" },
    { label: "Official Channel", value: "Channel Review Record" },
    { label: "Process Evaluation", value: "Evaluation Review Record" },
    { label: "Review Documentation", value: "Documentation Record" }
  ]);

  function $(id) {
    return global.document.getElementById(id);
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderAdminRecord(container, label, value) {
    const row = global.document.createElement("div");
    row.className = "ex-standard-authority-item ex-standard-registry-row ex-publication-registry-row ex-pilot-admin-record";
    row.innerHTML = `<span class="ex-publication-registry-label">${escapeHtml(label)}</span><p>${escapeHtml(value)}</p>`;
    container.appendChild(row);
  }

  function renderScopeRecords() {
    const container = $("exPilotScopeRecords");
    if (!container) return;
    container.innerHTML = "";
    ADMIN_SCOPE.forEach((item) => {
      renderAdminRecord(container, item.label, item.value);
    });
  }

  function renderOutcomeRecords() {
    const container = $("exPilotOutcomeRecords");
    if (!container) return;
    container.innerHTML = "";
    ADMIN_OUTCOME.forEach((item) => {
      renderAdminRecord(container, item.label, item.value);
    });
  }

  function renderReviewRecords() {
    const container = $("exPilotFieldRecords");
    if (!container) return;
    container.innerHTML = "";
    ADMIN_REVIEW.forEach((item) => {
      renderAdminRecord(container, item.label, item.value);
    });
  }

  function init() {
    renderScopeRecords();
    renderOutcomeRecords();
    renderReviewRecords();
  }

  global.EXECUTIA_REQUEST_PILOT_UX = { init };
})(typeof window !== "undefined" ? window : globalThis);
