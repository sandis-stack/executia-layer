(function registerExecutiaRequestPilotUx(global) {
  const ADMIN_SCOPE = Object.freeze([
    "Process selection",
    "Governance audit",
    "Gap identification",
    "Pilot implementation"
  ]);

  const ADMIN_OUTCOME = Object.freeze([
    "Reduced execution risk",
    "Execution governance visibility",
    "Pilot case study"
  ]);

  const ADMIN_FIELDS = Object.freeze([
    { label: "Name", value: "Contact field" },
    { label: "Organization", value: "Institution field" },
    { label: "Position", value: "Role field" },
    { label: "Email", value: "Contact channel" },
    { label: "Process To Evaluate", value: "Subject field" },
    { label: "Message", value: "Administrative note field" }
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
    row.innerHTML = `<h4>${escapeHtml(label)}</h4><p>${escapeHtml(value)}</p>`;
    container.appendChild(row);
  }

  function renderScopeRecords() {
    const container = $("exPilotScopeRecords");
    if (!container) return;
    container.innerHTML = "";
    ADMIN_SCOPE.forEach((item) => {
      renderAdminRecord(container, item, "Scope record");
    });
  }

  function renderOutcomeRecords() {
    const container = $("exPilotOutcomeRecords");
    if (!container) return;
    container.innerHTML = "";
    ADMIN_OUTCOME.forEach((item) => {
      renderAdminRecord(container, item, "Outcome record");
    });
  }

  function renderFieldRecords() {
    const container = $("exPilotFieldRecords");
    if (!container) return;
    container.innerHTML = "";
    ADMIN_FIELDS.forEach((field) => {
      renderAdminRecord(container, field.label, field.value);
    });
  }

  function init() {
    renderScopeRecords();
    renderOutcomeRecords();
    renderFieldRecords();
  }

  global.EXECUTIA_REQUEST_PILOT_UX = { init };
})(typeof window !== "undefined" ? window : globalThis);
