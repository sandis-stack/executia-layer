(function registerExecutiaExecutionDemo(global) {
  const SECTORS = ["Energy", "Public Procurement", "Infrastructure", "Government"];
  const DEFAULT_SECTOR = "Energy";
  const DEFAULT_OPERATION = "Supplier Payment";

  const ACCEPTANCE_STATEMENT =
    "An execution governance infrastructure that establishes validation, control, proof and commitment before execution can occur.";

  const INSTITUTIONAL_STATEMENT =
    "EXECUTIA is execution governance infrastructure — validation, control, proof and commitment before execution can occur.";

  const GAP_MARKERS = [
    "Validation after execution",
    "Delayed proof",
    "Fragmented accountability",
    "Multiple truth sources"
  ];

  const EXECUTIA_CHANGES = [
    "Validation before execution",
    "Continuous proof",
    "Unified accountability",
    "Single truth source"
  ];

  const INSTITUTIONAL_IMPACT = [
    "Lower execution risk",
    "Faster regulatory verification",
    "Reduced audit burden",
    "Deterministic execution integrity"
  ];

  const WHY_IT_MATTERS = [
    { title: "Energy", text: "Execution integrity across critical operations." },
    { title: "Infrastructure", text: "Governance before infrastructure commitments." },
    { title: "Public Procurement", text: "Control before contractual obligations materialize." },
    { title: "Government", text: "Deterministic execution in regulated decisions." }
  ];

  const MAP_EXECUTIVE_PROBLEM =
    "Execution can occur before validation, before proof, and before accountability exists.";
  const MAP_EXECUTIVE_RESOLUTION = "EXECUTIA prevents this.";

  const GOVERNANCE_LAYERS = [
    "Validation Layer",
    "Control Layer",
    "Proof Layer",
    "Committed Layer"
  ];
  const EXECUTION_CHAIN = [
    "Supplier",
    "Invoice",
    "Approval",
    "Payment",
    "Accounting",
    "Audit"
  ];

  const TODAY_STATEMENT = "Execution occurs first. Control is established afterwards.";
  const EXECUTIA_STATEMENT = "Governance exists before execution.";
  const EXECUTIA_RULE =
    "Execution cannot materialize before Validation Layer, Control Layer, Proof Layer, and Committed Layer exist.";

  const OPERATION_LABELS = {
    Energy: ["Supplier Payment", "Asset Maintenance", "Production Reporting"],
    "Public Procurement": ["Public Tender", "Framework Agreement", "Single Source Procurement"],
    Infrastructure: ["Road Maintenance", "Contractor Approval", "Asset Inspection"],
    Government: ["Permit Approval", "Grant Payment", "Regulatory Decision"]
  };

  const RISKS = [
    "Validation after execution",
    "Delayed proof",
    "Fragmented accountability",
    "Multiple truth sources"
  ];

  const EFFECT = [
    "Validation before execution",
    "Continuous proof",
    "Unified accountability",
    "Single truth source"
  ];

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  function resolveSectorKey(sector) {
    return SECTORS.find((label) => normalizeKey(label) === normalizeKey(sector)) || null;
  }

  function getOperationsForSector(sector) {
    const match = resolveSectorKey(sector);
    return match ? OPERATION_LABELS[match] || [] : [];
  }

  function getDemo(sector, operation) {
    const sectorKey = resolveSectorKey(sector) || DEFAULT_SECTOR;
    return {
      sector: sectorKey,
      operation: operation || DEFAULT_OPERATION,
      risks: RISKS.slice(),
      effect: EFFECT.slice(),
      statement: ACCEPTANCE_STATEMENT
    };
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderGovernanceInfraStack() {
    const parts = [];
    GOVERNANCE_LAYERS.forEach((label, index) => {
      if (index > 0) parts.push('<div class="ex-arch-infra-rule"></div>');
      parts.push(`<div class="ex-arch-infra-layer">${escapeHtml(label)}</div>`);
    });
    return `<div class="ex-arch-infra-stack" aria-label="Governance infrastructure">${parts.join("")}</div>`;
  }

  function renderExecutionChain(steps) {
    const parts = [];
    steps.forEach((label, index) => {
      if (index > 0) parts.push('<div class="ex-arch-connector" aria-hidden="true">↓</div>');
      parts.push(`<div class="ex-arch-exec-node">${escapeHtml(label)}</div>`);
    });
    return `<div class="ex-arch-exec-flow">${parts.join("")}</div>`;
  }

  function renderMapExecutiveFramingHtml() {
    return `<div class="ex-inst-statement ex-arch-map-executive" aria-label="Executive framing">
      <p class="ex-inst-hero-line">${escapeHtml(MAP_EXECUTIVE_PROBLEM)}</p>
      <p class="ex-inst-hero-line ex-inst-hero-line--emphasis">${escapeHtml(MAP_EXECUTIVE_RESOLUTION)}</p>
    </div>`;
  }

  function renderEvidenceRegistryRow(label, value) {
    return `<div class="ex-standard-authority-item ex-standard-registry-row ex-publication-registry-row">
      <h4>${escapeHtml(label)}</h4>
      <p>${escapeHtml(value)}</p>
    </div>`;
  }

  function renderEvidenceAnnexHtml(demo) {
    if (!demo) return "";
    const layerRows = GOVERNANCE_LAYERS.map((layer) =>
      renderEvidenceRegistryRow(layer, layer)
    ).join("");
    const chainSummary = EXECUTION_CHAIN.join(" → ");
    return `${renderEvidenceRegistryRow("Sector", demo.sector)}
      ${renderEvidenceRegistryRow("Scenario", demo.operation)}
      ${layerRows}
      ${renderEvidenceRegistryRow("Chain", chainSummary)}
      ${renderEvidenceRegistryRow("Today", TODAY_STATEMENT)}
      ${renderEvidenceRegistryRow("EXECUTIA", `${EXECUTIA_STATEMENT} ${EXECUTIA_RULE}`)}
      ${renderEvidenceRegistryRow("Model", "Current systems: Execution → Control · EXECUTIA: Governance → Execution")}`;
  }

  function renderInstitutionalControlMapHtml(demo) {
    if (!demo) return "";
    return `<div class="ex-proof-map ex-proof-map--dominant" aria-label="Execution control map">
      <p class="ex-proof-operation">${escapeHtml(demo.sector)} · ${escapeHtml(demo.operation)}</p>
      ${renderMapExecutiveFramingHtml()}
      <div class="ex-arch-control-stack ex-arch-model" aria-label="Execution with governance infrastructure">
        ${renderGovernanceInfraStack()}
        <div class="ex-arch-connector" aria-hidden="true">↓</div>
        <p class="ex-arch-pass-label">Execution</p>
        ${renderExecutionChain(EXECUTION_CHAIN)}
      </div>
      <div class="ex-arch-map-grid ex-proof-grid--compare" aria-label="Governance comparison">
        <section class="ex-proof-col ex-proof-col--today" aria-labelledby="exMapToday">
          <h3 id="exMapToday">Today</h3>
          <p class="ex-arch-pass-label">Execution without governance infrastructure</p>
          ${renderExecutionChain(EXECUTION_CHAIN)}
          <p class="ex-arch-pass-footnote">${escapeHtml(TODAY_STATEMENT)}</p>
        </section>
        <section class="ex-proof-col ex-proof-col--executia" aria-labelledby="exMapExecutia">
          <h3 id="exMapExecutia">EXECUTIA</h3>
          <p class="ex-arch-pass-footnote">${escapeHtml(EXECUTIA_STATEMENT)}</p>
          <p class="ex-arch-pass-footnote">${escapeHtml(EXECUTIA_RULE)}</p>
        </section>
      </div>
      <div class="ex-inst-architecture-message ex-inst-architecture-message--map" aria-label="Institutional model">
        <p><span class="ex-inst-architecture-label">Current systems:</span> Execution → Control</p>
        <p><span class="ex-inst-architecture-label">EXECUTIA:</span> Governance → Execution</p>
      </div>
    </div>`;
  }

  function renderWhatChangesHtml() {
    function col(title, items, modifier) {
      const list = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      const mod = modifier ? ` ex-what-changes-col--${modifier}` : "";
      return `<div class="ex-what-changes-col${mod}">
        <h4>${escapeHtml(title)}</h4>
        <ul class="ex-inst-list">${list}</ul>
      </div>`;
    }

    return `<div class="ex-what-changes">
      <div class="ex-what-changes-grid ex-what-changes-grid--three">
        ${col("Today", GAP_MARKERS, "today")}
        ${col("EXECUTIA", EXECUTIA_CHANGES, "executia")}
        ${col("Impact", INSTITUTIONAL_IMPACT, "impact")}
      </div>
    </div>`;
  }

  function renderExecutiveImpactHtml() {
    function impactCard(title, items, modifier) {
      const list = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      const mod = modifier ? ` ex-executive-impact-card--${modifier}` : "";
      return `<div class="ex-executive-impact-card${mod}">
        <h4>${escapeHtml(title)}</h4>
        <ul class="ex-inst-list">${list}</ul>
      </div>`;
    }

    return `<div class="ex-executive-impact">
      <div class="ex-executive-impact-grid">
        ${impactCard("Today", GAP_MARKERS, "today")}
        ${impactCard("With EXECUTIA", EXECUTIA_CHANGES, "executia")}
        ${impactCard("Institutional Impact", INSTITUTIONAL_IMPACT, "impact")}
      </div>
    </div>`;
  }

  function renderWhyItMattersHtml() {
    const items = WHY_IT_MATTERS.map(
      (item) =>
        `<div class="ex-why-matters-item"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div>`
    ).join("");
    return `<div class="ex-why-matters">${items}</div>`;
  }

  function renderDemonstrationContent(mounts, sector, operation) {
    const demo = getDemo(sector, operation);
    if (!demo || !mounts) return null;

    if (mounts.controlMap) mounts.controlMap.innerHTML = renderEvidenceAnnexHtml(demo);
    if (mounts.whatChanges) mounts.whatChanges.innerHTML = renderWhatChangesHtml();
    if (mounts.whyMatters) mounts.whyMatters.innerHTML = renderWhyItMattersHtml();

    return demo;
  }

  function renderDemonstration(mounts) {
    return renderDemonstrationContent(mounts, DEFAULT_SECTOR, DEFAULT_OPERATION);
  }

  function buildExecutiveRiskAreas() {
    return RISKS.slice();
  }

  function buildExecutiveSummary(snapshot) {
    const org = snapshot.organization || "Your organization";
    return `${org} operates under execution-first control today. ${ACCEPTANCE_STATEMENT}`;
  }

  function buildExecutiveFindings(_snapshot, _demo) {
    return [
      "Current systems: Execution → Control.",
      "EXECUTIA: Governance → Execution.",
      ACCEPTANCE_STATEMENT
    ];
  }

  function buildRecommendedActions() {
    return [
      "Establish validation before execution can materialize.",
      "Maintain continuous proof across the execution chain.",
      "Unify accountability under governance infrastructure."
    ];
  }

  function buildPdfHtml(snapshot, demo, assessmentId, executive) {
    const now = new Date().toISOString();
    const findingsHtml = (executive.findings || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("");
    const actionsHtml = (executive.actions || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("");
    const risksHtml = demo.risks.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

    return `<!doctype html><html><head><meta charset="utf-8"><title>EXECUTIA Assessment</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#1a2d42;max-width:720px;margin:0 auto;padding:24px;font-size:12px;line-height:1.5}
      h1{font-size:20px}h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#4d6178;margin-top:24px}
      .stmt{font-size:14px;font-weight:500;margin:12px 0;padding:12px;background:#f6f8fb;border-radius:8px}
      ul{padding-left:18px}</style></head><body>
      <h1>EXECUTIA Assessment</h1>
      <p>${escapeHtml(now.slice(0, 19).replace("T", " "))} UTC · ${escapeHtml(assessmentId || "—")}</p>
      <p><strong>${escapeHtml(snapshot.organization)}</strong> · ${escapeHtml(snapshot.country)}</p>
      <h2>Execution Control Map</h2>${renderInstitutionalControlMapHtml(demo)}
      <h2>What Changes</h2>${renderWhatChangesHtml()}
      <h2>Why It Matters</h2>${renderWhyItMattersHtml()}
      <p class="stmt">${escapeHtml(ACCEPTANCE_STATEMENT)}</p>
      <h2>Risk Areas</h2><ul>${risksHtml}</ul>
      <h2>Executive Summary</h2><p>${escapeHtml(executive.summary)}</p>
      <h2>Key Findings</h2><ul>${findingsHtml}</ul>
      <h2>Recommended Actions</h2><ul>${actionsHtml}</ul>
      </body></html>`;
  }

  global.EXECUTIA_EXECUTION_DEMO = {
    SECTORS,
    OPERATION_LABELS,
    INSTITUTIONAL_STATEMENT,
    ACCEPTANCE_STATEMENT,
    GAP_MARKERS,
    EXECUTIA_CHANGES,
    INSTITUTIONAL_IMPACT,
    WHY_IT_MATTERS,
    getDemo,
    getOperationsForSector,
    resolveSectorKey,
    MAP_EXECUTIVE_PROBLEM,
    MAP_EXECUTIVE_RESOLUTION,
    GOVERNANCE_LAYERS,
    EXECUTION_CHAIN,
    TODAY_STATEMENT,
    EXECUTIA_STATEMENT,
    EXECUTIA_RULE,
    renderMapExecutiveFramingHtml,
    renderGovernanceInfraStack,
    renderExecutionChain,
    renderEvidenceAnnexHtml,
    renderInstitutionalControlMapHtml,
    renderWhatChangesHtml,
    renderExecutiveImpactHtml,
    renderWhyItMattersHtml,
    renderDemonstration,
    renderDemonstrationContent,
    buildExecutiveSummary,
    buildExecutiveFindings,
    buildExecutiveRiskAreas,
    buildRecommendedActions,
    buildPdfHtml
  };
})(typeof window !== "undefined" ? window : globalThis);
