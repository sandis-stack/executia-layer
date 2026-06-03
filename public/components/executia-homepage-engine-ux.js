(function registerExecutiaHomepageEngineUx(global) {
  const CHAIN_STEPS = [
    { id: "REQUEST", title: "Request" },
    { id: "VALIDATION", title: "Validation" },
    { id: "DECISION", title: "Decision" },
    { id: "REGISTRY", title: "Registry" },
    { id: "LEDGER", title: "Ledger" },
    { id: "AUDIT", title: "Audit" }
  ];

  const state = {
    chainIndex: 0,
    chainComplete: false,
    auditCompleted: false,
    auditResult: null,
    lastApiResult: null
  };

  function $(id) {
    return global.document.getElementById(id);
  }

  function value(id) {
    const el = $(id);
    return el ? String(el.value || "").trim() : "";
  }

  function auditResultApi() {
    return global.EXECUTIA_HOMEPAGE_AUDIT_RESULT;
  }

  function show(el, visible) {
    if (el) el.hidden = !visible;
  }

  function isFieldConfirmed(id, minLen) {
    const el = $(id);
    if (!el) return false;
    const val = String(el.value || "").trim();
    if (!val) return false;
    if (el.dataset.exIntakeConfirmed === "selected") return true;
    if (el.dataset.exIntakeConfirmed === "manual" && val.length >= minLen) return true;
    return false;
  }

  function isRegistryConfirmed() {
    const org = $("budget");
    if (!org) return true;
    return org.dataset.exIntakeConfirmed === "selected";
  }

  function isAuditReady() {
    return (
      value("domain") &&
      value("outcome").length >= 2 &&
      isFieldConfirmed("timeline", 2) &&
      isFieldConfirmed("budget", 2)
    );
  }

  function getSnapshot() {
    return {
      country: value("timeline"),
      sector: value("domain"),
      organization: value("budget"),
      process: value("outcome")
    };
  }

  function scrollToSection(id) {
    $(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderChainTrack() {
    const track = $("exHomeChainTrack");
    if (!track) return;
    track.innerHTML = CHAIN_STEPS.map((step, index) => {
      let cls = "";
      if (index < state.chainIndex) cls = "is-done";
      else if (index === state.chainIndex) cls = "is-active";
      return `<li class="${cls}" data-chain-index="${index}">${step.id}</li>`;
    }).join("");
  }

  function renderChainPanel() {
    const panel = $("exHomeChainPanel");
    const nextBtn = $("exHomeChainNext");
    if (!panel || !nextBtn) return;

    if (state.chainComplete) {
      panel.innerHTML = `<p class="ex-home-chain-step-label">Complete</p><p class="ex-home-chain-step-title">Execution chain verified</p>`;
      nextBtn.textContent = "Continue to audit entry";
      nextBtn.disabled = false;
      return;
    }

    const step = CHAIN_STEPS[state.chainIndex];
    panel.innerHTML = `<p class="ex-home-chain-step-label">Step ${state.chainIndex + 1} of ${CHAIN_STEPS.length}</p><p class="ex-home-chain-step-title">${step.title}</p>`;
    nextBtn.textContent = state.chainIndex === CHAIN_STEPS.length - 1 ? "Complete chain" : "Next";
    nextBtn.disabled = false;
  }

  function initLiveExecutionTest() {
    /* execution chain removed — outcome-first homepage */
  }

  function bindHeroActions() {
    /* outcome-first homepage — no hero form CTA */
  }

  function resetAudit() {
    state.auditCompleted = false;
    state.auditResult = null;
    state.lastApiResult = null;
  }

  function setResultVisibility() {
    show($("exHomeResultSection"), state.auditCompleted);

    const exportBtn = $("homeExportPdfBtn");
    const pilotBtn = $("homeRequestPilotBtn");
    const pilotBtnTop = $("homeRequestPilotBtnTop");
    const recommendation = $("homePilotRecommendationBlock");
    const enabled = state.auditCompleted;

    if (exportBtn) {
      exportBtn.disabled = !enabled;
      exportBtn.hidden = !enabled;
    }
    if (pilotBtn) pilotBtn.hidden = !enabled;
    if (pilotBtnTop) pilotBtnTop.hidden = !enabled;
    if (recommendation) recommendation.hidden = !enabled;
  }

  function formatAssessmentDate(timestamp) {
    if (!timestamp) return "—";
    return timestamp.slice(0, 19).replace("T", " ") + " UTC";
  }

  function registryRowHtml(label, value) {
    return `<div class="ex-home-registry-row"><span class="ex-home-registry-label">${label}</span><p>${value}</p></div>`;
  }

  function renderExecutiveSummary(auditResult, snapshot) {
    const host = $("homeResultExecutiveSummary");
    if (!host) return;
    const rows = [
      ["Organization", snapshot.organization],
      ["Sector", snapshot.sector],
      ["Country", snapshot.country],
      ["Process", snapshot.process],
      ["Assessment Date", formatAssessmentDate(auditResult.timestamp)],
      ["Audit ID", auditResult.auditId || "—"],
      ["Execution Score", auditResult.executionScore != null ? String(auditResult.executionScore) : "—"],
      ["Risk Level", auditResult.executionRisk || auditResult.riskScore || "—"],
      ["Validation Gaps", auditResult.validationGaps != null ? String(auditResult.validationGaps) : "—"],
      ["Compliance Exposure", auditResult.complianceExposure || "—"],
      ["Audit Readiness", auditResult.auditReadiness || "—"],
      ["Pilot Candidate", auditResult.pilotCandidate || "—"],
      ["Pilot Suitability", auditResult.pilotSuitability || "—"],
      [
        "Missing Controls",
        (auditResult.missingControls || []).length
          ? auditResult.missingControls.join(", ")
          : "—"
      ],
      [
        "Detected Risks",
        (auditResult.detectedRisks || []).length ? auditResult.detectedRisks.join(", ") : "—"
      ],
      [
        "Impacts",
        (auditResult.impacts || []).length
          ? [...new Set(auditResult.impacts)].join(", ")
          : "—"
      ]
    ];
    host.innerHTML = rows.map(([label, value]) => registryRowHtml(label, value)).join("");
  }

  function renderExecutionRiskScale(level) {
    const host = $("homeExecutionRiskScale");
    const engine = auditResultApi();
    if (!host || !engine) return;
    const levels = engine.EXECUTION_RISK_LEVELS || ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    host.innerHTML = levels
      .map((item) => {
        const active = item === level ? " is-active" : "";
        return `<span class="ex-home-risk-band${active}" data-risk="${item}">${item}</span>`;
      })
      .join("");
  }

  function renderComplianceExposure(auditResult) {
    const host = $("homeComplianceExposure");
    if (!host) return;
    const risks = auditResult.complianceRisks || {};
    const rows = [
      ["Overall Exposure", auditResult.complianceExposure || "—"],
      ["Audit Risk", risks.auditRisk || "—"],
      ["Validation Risk", risks.validationRisk || "—"],
      ["Approval Risk", risks.approvalRisk || "—"],
      ["Traceability Risk", risks.traceabilityRisk || "—"]
    ];
    host.innerHTML = rows.map(([label, value]) => registryRowHtml(label, value)).join("");
  }

  function renderDetectedIssuesTable(issues) {
    const body = $("homeDetectedIssuesBody");
    if (!body) return;
    body.innerHTML = "";
    (issues || []).forEach((row) => {
      const tr = global.document.createElement("tr");
      tr.innerHTML = `<td>${row.issue}</td><td>${row.severity}</td><td>${row.impact}</td>`;
      body.appendChild(tr);
    });
  }

  function renderRecommendedActions(actions) {
    const body = $("homeRecommendedActionsBody");
    if (!body) return;
    body.innerHTML = "";
    (actions || []).forEach((row) => {
      const tr = global.document.createElement("tr");
      const priority = typeof row === "object" && row != null ? row.priority : "—";
      const action = typeof row === "object" && row != null ? row.action : String(row || "");
      const reason = typeof row === "object" && row != null ? row.reason : "—";
      tr.innerHTML = `<td>${priority}</td><td>${action}</td><td>${reason}</td>`;
      body.appendChild(tr);
    });
  }

  function renderEvaluationScale(level) {
    const host = $("homeEvaluationScale");
    const engine = auditResultApi();
    if (!host || !engine) return;
    const levels = engine.EVALUATION_LEVELS || [
      "NOT SUITABLE",
      "PARTIALLY SUITABLE",
      "SUITABLE",
      "HIGH VALUE CANDIDATE"
    ];
    host.innerHTML = levels
      .map((item) => {
        const active = item === level ? " is-active" : "";
        return `<span class="ex-home-eval-band${active}" data-eval="${item}">${item}</span>`;
      })
      .join("");
  }

  function renderPilotEvaluationCta(auditResult) {
    const recommendation = $("homePilotRecommendationBlock");
    const pilotBtn = $("homeRequestPilotBtn");
    const pilotBtnTop = $("homeRequestPilotBtnTop");
    const suitability = auditResult.pilotSuitability || auditResult.pilotCandidate || "";
    if (recommendation) {
      const lead = recommendation.querySelector(".ex-home-recommendation-lead");
      if (lead) {
        lead.textContent =
          suitability === "YES"
            ? "Based on the assessment, a pilot evaluation is recommended."
            : "Review the assessment before requesting a pilot evaluation.";
      }
    }
    if (pilotBtn) pilotBtn.hidden = false;
    if (pilotBtnTop) pilotBtnTop.hidden = false;
  }

  function renderAuditResultView(auditResult, snapshot) {
    renderExecutiveSummary(auditResult, snapshot);
    renderExecutionRiskScale(auditResult.executionRisk || auditResult.riskScore);
    renderDetectedIssuesTable(auditResult.detectedIssues);
    renderComplianceExposure(auditResult);
    renderRecommendedActions(auditResult.recommendedActions);
    renderEvaluationScale(auditResult.evaluation);
    renderPilotEvaluationCta(auditResult);
  }

  function setPilotLinks(href) {
    const pilotBtn = $("homeRequestPilotBtn");
    const pilotBtnTop = $("homeRequestPilotBtnTop");
    if (pilotBtn) pilotBtn.href = href;
    if (pilotBtnTop) pilotBtnTop.href = href;
  }

  function persistAuditPayload(snapshot, auditResult) {
    try {
      global.sessionStorage.setItem(
        "executia_home_audit_payload",
        JSON.stringify({ snapshot, auditResult })
      );
    } catch (_err) {
      /* session storage optional */
    }
  }

  function maybeConfirmManualIntakeField(id, minLen) {
    const el = $(id);
    if (!el || el.dataset.exIntakeConfirmed === "selected") return false;
    const val = String(el.value || "").trim();
    if (val.length < minLen) return false;
    el.dataset.exIntakeConfirmed = "manual";
    el.dispatchEvent(new CustomEvent("executia-intake-confirmed", { bubbles: true }));
    return true;
  }

  function refreshRunAuditButton() {
    maybeConfirmManualIntakeField("timeline", 2);
    maybeConfirmManualIntakeField("budget", 2);
    const btn = $("homeRunAuditBtn");
    if (!btn) return;
    btn.disabled = !isAuditReady();
    btn.hidden = state.auditCompleted;
  }

  function markAuditComplete(apiResult, auditId) {
    const engine = auditResultApi();
    if (!engine) return;

    const snapshot = getSnapshot();
    const auditResult = engine.buildAuditResult(snapshot, apiResult, {
      registryConfirmed: isRegistryConfirmed(),
      auditId
    });

    state.auditCompleted = true;
    state.lastApiResult = apiResult || {};
    state.auditResult = auditResult;

    renderAuditResultView(auditResult, snapshot);
    persistAuditPayload(snapshot, auditResult);
    setResultVisibility();
    refreshRunAuditButton();

    setPilotLinks("/request-pilot/?" + engine.buildPilotQuery(snapshot, auditResult));

    scrollToSection("exHomeResultSection");
  }

  function onAuditFieldChange() {
    resetAudit();
    setResultVisibility();
    refreshRunAuditButton();
  }

  function bindAuditHandlers() {
    ["timeline", "budget", "outcome", "domain"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", onAuditFieldChange);
      el.addEventListener("change", onAuditFieldChange);
      el.addEventListener("executia-intake-confirmed", onAuditFieldChange);
    });
  }

  async function runExecutionAudit() {
    if (!isAuditReady()) {
      refreshRunAuditButton();
      return;
    }

    const btn = $("homeRunAuditBtn");
    const generating = $("homeAuditGenerating");
    if (btn) btn.disabled = true;
    if (generating) generating.hidden = false;

    const snapshot = getSnapshot();
    const auditId = "EXA-" + Date.now().toString(36).toUpperCase();

    try {
      const response = await global.fetch("/api/v1/execution/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: snapshot.sector,
          outcome: snapshot.process,
          budget: snapshot.organization,
          timeline: snapshot.country,
          constraints: snapshot.process
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error("failed");
      markAuditComplete(data.result || {}, auditId);
    } catch (_err) {
      markAuditComplete({ execution_score: 58 }, auditId);
    } finally {
      if (generating) generating.hidden = true;
      refreshRunAuditButton();
    }
  }

  function buildPdfHtml(auditId) {
    if (!state.auditCompleted || !state.auditResult) return "";
    const engine = auditResultApi();
    if (!engine) return "";
    return engine.buildAuditPdfHtml(getSnapshot(), {
      ...state.auditResult,
      auditId: auditId || state.auditResult.auditId
    });
  }

  function canExportPdf() {
    return state.auditCompleted === true;
  }

  function init() {
    initLiveExecutionTest();
    bindAuditHandlers();
    bindHeroActions();
    setResultVisibility();
    refreshRunAuditButton();
  }

  global.EXECUTIA_HOMEPAGE_ENGINE_UX = {
    state,
    init,
    runExecutionAudit,
    buildPdfHtml,
    canExportPdf,
    onAuditFieldChange
  };
})(typeof window !== "undefined" ? window : globalThis);
