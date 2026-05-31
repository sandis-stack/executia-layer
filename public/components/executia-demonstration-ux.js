(function registerExecutiaDemonstrationUx(global) {
  const DEFAULT_SECTOR = "Energy";
  const DEFAULT_OPERATION = "Supplier Payment";

  const EVIDENCE_SCENARIOS = Object.freeze([
    "Supplier Payment",
    "Asset Maintenance",
    "Production Reporting"
  ]);

  function $(id) {
    return global.document.getElementById(id);
  }

  function demoApi() {
    return global.EXECUTIA_EXECUTION_DEMO;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderEvidenceRecord(container, label, value) {
    const row = global.document.createElement("div");
    row.className = "ex-standard-authority-item ex-standard-registry-row ex-publication-registry-row ex-demo-evidence-record";
    row.innerHTML = `<h4>${escapeHtml(label)}</h4><p>${escapeHtml(value)}</p>`;
    container.appendChild(row);
  }

  function renderSectorRecords() {
    const container = $("exDemoSectorRecords");
    const api = demoApi();
    if (!container || !api) return;

    container.innerHTML = "";
    api.SECTORS.forEach((sector) => {
      renderEvidenceRecord(container, sector, "Sector evidence record");
    });
  }

  function renderScenarioRecords() {
    const container = $("exDemoScenarioRecords");
    if (!container) return;

    container.innerHTML = "";
    EVIDENCE_SCENARIOS.forEach((scenario) => {
      renderEvidenceRecord(container, "Scenario", scenario);
    });
  }

  function renderProofContent() {
    const api = demoApi();
    if (!api) return;
    api.renderDemonstrationContent(
      { controlMap: $("exDemoControlMap") },
      DEFAULT_SECTOR,
      DEFAULT_OPERATION
    );
  }

  function init() {
    renderProofContent();
    renderSectorRecords();
    renderScenarioRecords();
  }

  global.EXECUTIA_DEMONSTRATION_UX = {
    init
  };
})(typeof window !== "undefined" ? window : globalThis);
