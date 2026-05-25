/**
 * EXECUTIA Phase 5E — Mode-specific governance surface rendering (presentation only).
 * Each perspective renders distinct operational surfaces; no API or execution logic.
 */
(function (global) {
  const MODES = global.EXECUTIA_GOVERNANCE_MODES?.MODES || {
    EXECUTIVE: "executive",
    OPERATIONAL: "operational",
    ENGINEERING: "engineering",
    AUDIT: "audit",
    PUBLIC_VERIFY: "public-verify"
  };

  const SURFACE = Object.freeze({
    GOVERNANCE: "governance",
    AUTHORITY: "authority",
    INTELLIGENCE: "intelligence",
    REPLAY: "replay",
    DEPLOY: "deploy",
    FINDINGS: "findings",
    AUDIT: "audit",
    PUBLIC_VERIFY: "public-verify",
    RETENTION: "retention"
  });

  const CORE = () => global.EXECUTIA_GOVERNANCE_CORE;
  const MEM = () => global.EXECUTIA_EXECUTION_MEMORY;
  const INT = () => global.EXECUTIA_EXECUTION_INTENT;
  const TR = () => global.EXECUTIA_EXECUTION_TRUST;
  const SOV = () => global.EXECUTIA_EXECUTION_SOVEREIGNTY;
  const CMP = () => global.EXECUTIA_CANONICAL_COMPRESSION;

  function postureBlocks(ctx) {
    if (CMP()?.isActive?.() && CMP()?.canonicalPostureBlock) {
      return CMP().canonicalPostureBlock(ctx);
    }
    return `${jurisdictionBlock(ctx)}${objectiveBlock(ctx)}${reliabilityBlock(ctx)}`;
  }

  function jurisdictionBlock(ctx) {
    if (SOV()?.jurisdictionFramingHtml) return SOV().jurisdictionFramingHtml(ctx);
    return "";
  }

  function reliabilityBlock(ctx) {
    if (TR()?.reliabilityFramingHtml) return TR().reliabilityFramingHtml(ctx);
    return "";
  }

  function objectiveBlock(ctx) {
    if (INT()?.objectiveFramingHtml) return INT().objectiveFramingHtml(ctx);
    return "";
  }

  function governedOutcomeMeasure(label, value) {
    const lbl = INT()?.governedOutcomeLabel?.() || "Governed outcome";
    return measureBlock(label || lbl, value);
  }

  function tier(level) {
    return CORE()?.tierClass?.(level) || "";
  }

  function esc(s) {
    return CORE()?.esc ? CORE().esc(s) : String(s ?? "");
  }

  function opSurface(kind, heading, bodyHtml, mt = "") {
    if (CORE()?.opSurface) return CORE().opSurface(kind, heading, bodyHtml, mt);
    return `<section class="ex-op-surface ex-ds-pad-block ${mt}">${bodyHtml}</section>`;
  }

  function measureBlock(label, value) {
    return CORE()?.measureBlock
      ? CORE().measureBlock(label, value)
      : `<div class="ex-ds-measure">${esc(label)} ${esc(value)}</div>`;
  }

  function findingsHtml(findings, limit, T, P) {
    const rows = (findings || []).slice(0, limit);
    if (!rows.length) {
      return `<p class="ex-ds-diagnostics ex-ds-empty ${tier("tertiary")}">${esc(P.NO_FINDINGS || "No active findings.")}</p>`;
    }
    return rows
      .map(
        (f) =>
          `<p class="ex-ds-diagnostics ex-ds-review-line ${tier("tertiary")}">${esc(f.level)} — ${esc(f.message)}</p>`
      )
      .join("");
  }

  function executiveFindings(findings) {
    return (findings || []).filter(
      (f) =>
        f.level === "HIGH" ||
        /deploy|readiness|risk|governance|canonical|integrity|replay/i.test(String(f.message || ""))
    );
  }

  function auditFindings(findings) {
    return (findings || []).filter(
      (f) =>
        f.level === "HIGH" ||
        f.level === "CANONICAL" ||
        /verify|replay|ledger|audit|proof|chain/i.test(String(f.message || ""))
    );
  }

  function deployScopeLine(di) {
    if (!di) return "No deploy scope in working tree.";
    const n =
      (di.protected_files_touched || []).length +
      (di.governance_layer_affected || []).length +
      (di.canonical_authority_affected || []).length +
      (di.replay_layer_affected || []).length;
    return n ? `${n} governed paths in scope.` : "Scope present; no governed path changes.";
  }

  function retentionBlock(ctx) {
    if (MEM()?.retentionPresentation) return MEM().retentionPresentation(ctx);
    return `<p class="ex-ds-diagnostics ex-ds-mt-24">Governed memory retention.</p>`;
  }

  function authorityLadderHtml(T) {
    const steps = [
      { name: `${T.CANONICAL || "Canonical"} verify`, role: "Primary execution authority", lead: true },
      { name: "Replay authority", role: "Deterministic read-only replay" },
      { name: "Public verify", role: "Verified public proof surface" },
      { name: "Engineering intelligence", role: "Governed diagnostics" },
      { name: T.EXECUTION_SURFACE || "Execution surface", role: "Operational layer", faint: true }
    ];
    return steps
      .map((step) => {
        const cls = step.lead ? "ex-ds-authority-step lead" : step.faint ? "ex-ds-authority-step faint" : "ex-ds-authority-step";
        const nameCls = step.lead ? "ex-ds-authority-heading" : "ex-ds-authority-label";
        return `<div class="${cls}"><div class="${nameCls}">${esc(step.name)}</div><div class="ex-ds-role">${esc(step.role)}</div></div>`;
      })
      .join("");
  }

  function timelineHtml(ledger, formatTs, P, limit = 8) {
    if (MEM()?.continuityRecordHtml) {
      return MEM().continuityRecordHtml(ledger, formatTs, limit);
    }
    const rows = (ledger || []).slice(0, limit);
    if (!rows.length) {
      return `<p class="ex-ds-diagnostics ex-ds-empty">${esc(P.NO_LEDGER || "No continuity records.")}</p>`;
    }
    return rows
      .map(
        (row) => `
      <div class="ex-ds-diagnostics ex-ds-history-line">
        <span>${esc(formatTs(row.generated_at))}</span>
        <span>${esc(row.risk)}</span>
        <span>${row.stability != null ? esc(row.stability) : "—"}</span>
      </div>`
      )
      .join("");
  }

  function taxonomyDiagnostics(ctx) {
    const { intel, data, ag } = ctx;
    const tax = data?.endpoint_taxonomy || ag?.endpoint_taxonomy || intel?.endpoint_taxonomy;
    const consistency = intel?.stability?.endpoint_consistency_score ?? "—";
    if (!tax) return `<p class="ex-ds-diagnostics ex-ds-mt-24">Endpoint taxonomy pending generation.</p>`;
    return `<p class="ex-ds-diagnostics ex-ds-mt-24">${esc(tax.classified_endpoints ?? tax.classified ?? "—")} of ${esc(tax.total_endpoints ?? "—")} routes classified · consistency ${esc(consistency)}.</p>`;
  }

  function renderExecutive(panel, ctx) {
    const { intel, ag, T, P, formatTs } = ctx;
    const sc = intel?.stability || {};
    panel.innerHTML = `
      ${postureBlocks(ctx)}
      ${opSurface(
        SURFACE.GOVERNANCE,
        INT()?.INTENT?.INSTITUTIONAL_OBJECTIVE || "Institutional objective",
        `
        <p class="ex-ds-operational-line ex-ds-mt-64">${esc(T.GOVERNED || "Governed")} institutional posture · ${esc(formatTs(new Date().toISOString()))}</p>
        <div class="ex-ds-integrity-row ex-ds-mt-64">
          ${measureBlock(`${T.CANONICAL || "Canonical"} integrity`, sc.verification_score)}
          ${measureBlock(`${T.REPLAY_SAFE || "Replay"} integrity`, sc.replay_score)}
          ${governedOutcomeMeasure("Governed outcome", intel?.deploy_readiness)}
          ${measureBlock("Institutional risk", intel?.risk?.overall)}
        </div>
      `
      )}
      ${opSurface(
        SURFACE.FINDINGS,
        "Executive authority findings",
        `<div class="ex-ds-mt-24">${findingsHtml(executiveFindings(intel?.findings), 5, T, P)}</div>`,
        "ex-ds-mt-64"
      )}
    `;
  }

  function renderOperational(panel, ctx) {
    const { intel, ag, T, P, formatTs, ledger } = ctx;
    const sc = intel?.stability || {};
    const lastLedger = (ledger || [])[0];
    panel.innerHTML = `
      ${opSurface(
        SURFACE.REPLAY,
        "Replayable governance memory",
        `
        <div class="ex-ds-integrity-row ex-ds-mt-64">
          ${measureBlock("Replay continuity", sc.replay_score)}
          ${measureBlock(T.EXECUTION_INTEGRITY || "Operational integrity", sc.overall_score)}
        </div>
        <p class="ex-ds-diagnostics ex-ds-mt-64">${esc(T.REPLAY_SAFE || "Replay safe")} · ${esc(T.DETERMINISTIC || "Deterministic")} replayable consequence. Last ${MEM()?.MEMORY?.CONTINUITY_RECORD?.toLowerCase() || "continuity record"}: ${esc(lastLedger?.risk ?? "—")} at ${esc(lastLedger ? formatTs(lastLedger.generated_at) : "—")}.</p>
        <p class="ex-ds-diagnostics ex-ds-mt-64 ${tier("tertiary")}">${esc(TR()?.TRUST?.EXECUTION_CONSISTENT || "Execution consistent")} · ${esc(TR()?.TRUST?.TRUST_MAINTAINED || "Trust maintained")} under governed replay.</p>
      `
      )}
      ${opSurface(
        SURFACE.DEPLOY,
        INT()?.INTENT?.GOVERNED_OUTCOME || "Governed outcome",
        `<p class="ex-ds-diagnostics ex-ds-mt-24">${esc(deployScopeLine(intel?.deploy_intelligence))}</p>
        <p class="ex-ds-diagnostics ex-ds-mt-64">${esc(INT()?.INTENT?.EXECUTION_DIRECTION || "Execution direction")} · ${esc(intel?.deploy_readiness ?? "—")} · Risk ${esc(intel?.risk?.overall ?? "—")}.</p>`,
        "ex-ds-mt-64"
      )}
      ${opSurface(
        SURFACE.GOVERNANCE,
        SOV()?.SOVEREIGNTY?.EXECUTION_GOVERNANCE_SOVEREIGN || "Execution governance sovereign",
        `<p class="ex-ds-operational-line ex-ds-mt-64 ${tier("secondary")}">${esc(T.GOVERNED || "Governed")} · ${esc(SOV()?.SOVEREIGNTY?.EXECUTION_AUTHORITY_ACTIVE || "Execution authority active")} · ${esc(ag?.branch || "—")}</p>
        <p class="ex-ds-diagnostics ex-ds-mt-64 ${tier("tertiary")}">${esc(SOV()?.SOVEREIGNTY?.CANONICAL_JURISDICTION_VERIFIED || "Canonical jurisdiction verified")} · ${esc(T.DETERMINISTIC || "Deterministic")} jurisdiction.</p>`,
        "ex-ds-mt-64"
      )}
      ${opSurface(
        SURFACE.FINDINGS,
        "Governance findings",
        `<div class="ex-ds-mt-24">${findingsHtml(intel?.findings, 6, T, P)}</div>`,
        "ex-ds-mt-64"
      )}
    `;
  }

  function renderEngineering(panel, ctx) {
    const { intel, ag, data, T, P, formatTs, ledger } = ctx;
    const sc = intel?.stability || {};
    const n = (ag?.canonical_authority || []).length;
    const r = (ag?.replay_layer || []).length;
    const p = (ag?.public_verification || []).length;
    const gov = (ag?.governance_layer || []).length;
    const recs = intel?.recommendations || [];
    const auth = data?.engineering_console_authority || {};

    panel.innerHTML = `
      <p class="ex-ds-operational-subtitle ex-ds-mb-64">${esc(P.PRESENCE || "")}</p>
      ${postureBlocks(ctx)}
      ${opSurface(
        SURFACE.GOVERNANCE,
        INT()?.INTENT?.EXECUTION_OBJECTIVE || "Execution objective",
        `
        <p class="ex-ds-operational-line ex-ds-mt-64">${esc(T.GOVERNED || "Governed")} · ${esc(INT()?.INTENT?.GOVERNED_OUTCOME || "Governed outcome")} ${esc(intel?.deploy_readiness ?? "—")} · Risk ${esc(intel?.risk?.overall ?? "—")}</p>
        <p class="ex-ds-diagnostics ex-ds-mt-64 ${tier("tertiary")}">${esc(SOV()?.SOVEREIGNTY?.STRUCTURAL_EXECUTION_AUTHORITY || "Structural execution authority")} · ${auth.ACTIVE ? esc(SOV()?.SOVEREIGNTY?.EXECUTION_AUTHORITY_ACTIVE || "Execution authority active") : "jurisdiction standby"} · ${esc(gov)} governed nodes.</p>
      `
      )}
      ${opSurface(
        SURFACE.AUTHORITY,
        SOV()?.authoritySurfaceTitle?.() || "Structural execution authority",
        `
        <p class="ex-ds-body-quiet ex-ds-mt-24">${esc(P.MATERIAL_TRUTH || "")}</p>
        <div class="ex-ds-authority-flow ex-ds-mt-64">${authorityLadderHtml(T)}</div>
        <p class="ex-ds-diagnostics ex-ds-mt-64">${n} verify · ${r} replay · ${p} public surfaces · ${esc(ag?.nodes ?? "—")} architecture nodes.</p>
      `,
        "ex-ds-core-divider"
      )}
      ${opSurface(
        SURFACE.INTELLIGENCE,
        TR()?.reliabilitySurfaceTitle?.() || "Structural execution reliability",
        `
        <p class="ex-ds-diagnostics ex-ds-mt-24 ${tier("secondary")}">${esc(TR()?.TRUST?.STRUCTURAL_INTEGRITY_ACTIVE || "Structural integrity active")} · ${esc(TR()?.TRUST?.CANONICAL_CONTINUITY || "Canonical continuity")}.</p>
        <div class="ex-ds-integrity-index ex-ds-mt-64">${esc(sc.overall_score ?? "—")}</div>
        <div class="ex-ds-integrity-row ex-ds-mt-64">
          ${measureBlock(T.CANONICAL || "Canonical", sc.verification_score)}
          ${measureBlock(T.REPLAY_SAFE || "Replay", sc.replay_score)}
          ${measureBlock(T.GOVERNED || "Governed", sc.governance_score)}
        </div>
        ${taxonomyDiagnostics(ctx)}
        <p class="ex-ds-diagnostics ex-ds-mt-64">${esc(deployScopeLine(intel?.deploy_intelligence))}</p>
      `,
        "ex-ds-core-divider"
      )}
      ${opSurface(
        SURFACE.REPLAY,
        "Replayable governance memory",
        `
        <p class="ex-ds-diagnostics ex-ds-mt-24">${r} replay authority paths · ${esc(T.DETERMINISTIC || "Deterministic")} institutional replay.</p>
        <div class="ex-ds-mt-24">${timelineHtml(ledger, formatTs, P, 8)}</div>
      `,
        "ex-ds-core-divider"
      )}
      ${opSurface(
        SURFACE.RETENTION,
        "Canonical memory retention",
        retentionBlock(ctx),
        "ex-ds-core-divider"
      )}
      ${opSurface(
        SURFACE.FINDINGS,
        "Authority findings",
        `
        <div class="ex-ds-mt-24">${findingsHtml(intel?.findings, 8, T, P)}</div>
        ${recs.length ? `<div class="ex-ds-mt-64">${recs.map((r) => `<p class="ex-ds-diagnostics ex-ds-review-line">${esc(r)}</p>`).join("")}</div>` : ""}
      `,
        "ex-ds-mt-64"
      )}
    `;
  }

  function renderAudit(panel, ctx) {
    const { intel, ag, T, P, formatTs, ledger } = ctx;
    const sc = intel?.stability || {};
    const n = (ag?.canonical_authority || []).length;
    const r = (ag?.replay_layer || []).length;
    const chain = auditFindings(intel?.findings);

    panel.innerHTML = `
      ${postureBlocks(ctx)}
      ${opSurface(
        SURFACE.AUTHORITY,
        SOV()?.jurisdictionSurfaceTitle?.() || "Canonical execution jurisdiction",
        `
        <p class="ex-ds-body-quiet ex-ds-mt-24">${esc(P.MATERIAL_TRUTH || "Material truth at audit verify.")}</p>
        <p class="ex-ds-diagnostics ex-ds-mt-64">${esc(SOV()?.SOVEREIGNTY?.CANONICAL_JURISDICTION_VERIFIED || "Canonical jurisdiction verified")} · ${n} verify anchors · score ${esc(sc.verification_score ?? "—")}.</p>
        <p class="ex-ds-diagnostics ex-ds-mt-64 ${tier("tertiary")}">${esc(SOV()?.SOVEREIGNTY?.EXECUTION_SUPREMACY_MAINTAINED || "Execution supremacy maintained")} · ${esc(T.DETERMINISTIC || "Deterministic")} jurisdiction.</p>
      `
      )}
      ${opSurface(
        SURFACE.REPLAY,
        "Replayable consequence",
        `<div class="ex-ds-mt-24">${timelineHtml(ledger, formatTs, P, 6)}</div>`,
        "ex-ds-mt-64"
      )}
      ${reliabilityBlock(ctx)}
      ${opSurface(
        SURFACE.INTELLIGENCE,
        TR()?.reliabilitySurfaceTitle?.() || "Structural execution reliability",
        `
        <p class="ex-ds-diagnostics ex-ds-mt-24 ${tier("secondary")}">${esc(TR()?.TRUST?.GOVERNANCE_VERIFIED || "Governance verified")} · ${esc(TR()?.TRUST?.EXECUTION_RELIABILITY_VERIFIED || "Execution reliability verified")}.</p>
        <div class="ex-ds-integrity-index ex-ds-mt-64">${esc(sc.overall_score ?? "—")}</div>`,
        "ex-ds-mt-64"
      )}
      ${opSurface(
        SURFACE.AUDIT,
        "Audit chain integrity",
        `<div class="ex-ds-mt-24">${findingsHtml(chain.length ? chain : intel?.findings, 6, T, P)}</div>`,
        "ex-ds-mt-64"
      )}
      ${opSurface(
        SURFACE.GOVERNANCE,
        "Proof state",
        `<p class="ex-ds-diagnostics ex-ds-mt-24">${esc(T.VERIFIED || "Verified")} · ${esc(T.DETERMINISTIC || "Deterministic")} chain · ${esc(ag?.commit?.slice(0, 12) || "—")}…</p>`,
        "ex-ds-mt-64"
      )}
      ${opSurface(
        SURFACE.REPLAY,
        "Deterministic replay safety",
        `
        <p class="ex-ds-diagnostics ex-ds-mt-24">${esc(T.REPLAY_SAFE || "Replay safe")} · replay score ${esc(sc.replay_score ?? "—")} · ${r} replay layer paths under governance.</p>
      `,
        "ex-ds-mt-64"
      )}
    `;
  }

  function renderPublicVerify(panel, ctx) {
    const { ag, T, formatTs } = ctx;
    const commit = ag?.commit || "—";
    const shortHash = commit.length > 12 ? `${commit.slice(0, 12)}…` : commit;
    panel.innerHTML = opSurface(
      SURFACE.PUBLIC_VERIFY,
      T.VERIFIED || "Verified",
      `
      <dl class="ex-proof-facts ex-ds-mt-64">
        <div class="ex-proof-fact"><dt class="ex-ds-institutional-label">${esc(T.VERIFIED || "Verified")}</dt><dd>${esc(T.VERIFIED || "Verified")}</dd></div>
        <div class="ex-proof-fact"><dt class="ex-ds-institutional-label">Hash</dt><dd>${esc(shortHash)}</dd></div>
        <div class="ex-proof-fact"><dt class="ex-ds-institutional-label">Timestamp</dt><dd>${esc(formatTs(new Date().toISOString()))}</dd></div>
        <div class="ex-proof-fact"><dt class="ex-ds-institutional-label">${esc(T.CANONICAL || "Canonical")} state</dt><dd>${esc((ag?.canonical_authority || []).length)} verify anchors</dd></div>
        <div class="ex-proof-fact"><dt class="ex-ds-institutional-label">${esc(T.READ_ONLY || "Read only")}</dt><dd>${esc(P.READ_ONLY_SURFACE || "Read only · Governed · Deterministic")}</dd></div>
      </dl>
    `
    );
  }

  const RENDERERS = Object.freeze({
    [MODES.EXECUTIVE]: renderExecutive,
    [MODES.OPERATIONAL]: renderOperational,
    [MODES.ENGINEERING]: renderEngineering,
    [MODES.AUDIT]: renderAudit,
    [MODES.PUBLIC_VERIFY]: renderPublicVerify
  });

  function showPanel(mode) {
    document.querySelectorAll(".ex-gov-mode-panel").forEach((panel) => {
      const active = panel.dataset.modePanel === mode;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  function renderActiveMode(mode, ctx) {
    const renderer = RENDERERS[mode] || RENDERERS[MODES.ENGINEERING];
    const panel = document.querySelector(`.ex-gov-mode-panel[data-mode-panel="${mode}"]`);
    if (!panel) return;
    renderer(panel, ctx);
    showPanel(mode);
  }

  global.EXECUTIA_GOVERNANCE_SURFACES = Object.freeze({
    renderActiveMode,
    RENDERERS,
    showPanel,
    SURFACE
  });
})(typeof window !== "undefined" ? window : globalThis);
