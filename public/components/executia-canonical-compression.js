/**
 * EXECUTIA Canonical Compression (Phase 6A).
 * Quieter institutional presentation — compression only, no execution logic changes.
 */
(function (global) {
  const CANONICAL = Object.freeze({
    POSTURE: "Canonical execution",
    INEVITABLE: "Governed · calm · inevitable",
    AUTHORITY: "Execution authority",
    GOVERNED: "Governed",
    CANONICAL: "Canonical",
    DETERMINISTIC: "Deterministic",
    CONSEQUENCE: "Consequence",
    MEMORY: "Memory",
    INTENT: "Intent",
    TRUST: "Trust",
    SOVEREIGNTY: "Sovereignty"
  });

  const META = Object.freeze({
    RHYTHM: "Continuity maintained",
    CONSEQUENCE: "Consequence governed",
    MEMORY: "Memory canonical",
    INTENT: "Objective fixed",
    TRUST: "Reliability verified",
    SOVEREIGNTY: "Jurisdiction sovereign",
    CORE: "Authority inevitable"
  });

  const DISPLAY_MAX = 3;

  const FRAME_IDS = Object.freeze([
    "exRhythmContinuityStates",
    "exConsequenceTransitions",
    "exMemoryFrames",
    "exIntentFrames",
    "exTrustFrames",
    "exSovereigntyFrames"
  ]);

  function isActive() {
    return document.body.classList.contains("ex-compression-enabled");
  }

  function displayLimit(defaultMax) {
    return isActive() ? Math.min(defaultMax, DISPLAY_MAX) : defaultMax;
  }

  function compressMeta(layer, fallback) {
    if (!isActive()) return fallback;
    return META[layer] || CANONICAL.INEVITABLE;
  }

  function inevitabilityLine(ctx) {
    const readiness = ctx?.intel?.deploy_readiness;
    const risk = ctx?.intel?.risk?.overall;
    const parts = [CANONICAL.INEVITABLE];
    if (readiness) parts.push(`${CANONICAL.GOVERNED} ${readiness}`);
    if (risk) parts.push(`risk ${risk}`);
    return parts.join(" · ");
  }

  function canonicalPostureBlock(ctx) {
    const readiness = ctx?.intel?.deploy_readiness ?? "—";
    const risk = ctx?.intel?.risk?.overall ?? "—";
    const core = global.EXECUTIA_GOVERNANCE_CORE;
    const esc = core?.esc ? core.esc.bind(core) : (s) => String(s ?? "");
    return `
      <div class="ex-canonical-posture ex-gov-tier-primary">
        <p class="ex-canonical-posture-primary">${esc(CANONICAL.POSTURE)}</p>
        <p class="ex-canonical-posture-secondary ex-gov-tier-secondary">${esc(inevitabilityLine(ctx))}</p>
        <p class="ex-canonical-posture-tertiary ex-gov-tier-tertiary">${esc(CANONICAL.AUTHORITY)} · ${esc(readiness)} · ${esc(risk)}</p>
      </div>
    `;
  }

  function compressRetentionHtml(html) {
    if (!isActive() || !html) return html;
    return html.replace(/<p class="ex-ds-diagnostics[^"]*">[\s\S]*?<\/p>/g, (block, idx) =>
      idx === 0 ? block : ""
    );
  }

  function compressBandsDom() {
    FRAME_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    document.querySelectorAll(".ex-gov-frame-line").forEach((el) => {
      el.textContent = CANONICAL.INEVITABLE;
    });
    document
      .querySelectorAll(
        ".ex-rhythm-band .ex-rhythm-tertiary, .ex-consequence-band .ex-consequence-tertiary, .ex-memory-band .ex-memory-tertiary, .ex-intent-band .ex-intent-tertiary, .ex-trust-band .ex-trust-tertiary, .ex-sovereignty-band .ex-sovereignty-tertiary"
      )
      .forEach((el) => {
        el.hidden = true;
      });
  }

  function applyCompression(ctx) {
    document.body.classList.add("ex-compression-enabled");

    const payload = ctx || {};
    const g = global;

    if (g.EXECUTIA_GOVERNANCE_CORE?.applyPresentation) {
      g.EXECUTIA_GOVERNANCE_CORE.applyPresentation(payload);
    }
    if (g.EXECUTIA_EXECUTION_RHYTHM?.applyRhythm) {
      g.EXECUTIA_EXECUTION_RHYTHM.applyRhythm(payload, { syncing: false });
    }
    if (g.EXECUTIA_EXECUTION_CONSEQUENCE?.applyConsequence) {
      g.EXECUTIA_EXECUTION_CONSEQUENCE.applyConsequence(payload);
    }
    if (g.EXECUTIA_EXECUTION_MEMORY?.applyMemory) {
      g.EXECUTIA_EXECUTION_MEMORY.applyMemory(payload);
    }
    if (g.EXECUTIA_EXECUTION_INTENT?.applyIntent) {
      g.EXECUTIA_EXECUTION_INTENT.applyIntent(payload);
    }
    if (g.EXECUTIA_EXECUTION_TRUST?.applyTrust) {
      g.EXECUTIA_EXECUTION_TRUST.applyTrust(payload);
    }
    if (g.EXECUTIA_EXECUTION_SOVEREIGNTY?.applySovereignty) {
      g.EXECUTIA_EXECUTION_SOVEREIGNTY.applySovereignty(payload);
    }

    compressBandsDom();
    return { active: true, inevitability: inevitabilityLine(payload) };
  }

  global.EXECUTIA_CANONICAL_COMPRESSION = Object.freeze({
    CANONICAL,
    META,
    DISPLAY_MAX,
    isActive,
    displayLimit,
    compressMeta,
    inevitabilityLine,
    canonicalPostureBlock,
    compressRetentionHtml,
    applyCompression,
    compressBandsDom
  });
})(typeof window !== "undefined" ? window : globalThis);
