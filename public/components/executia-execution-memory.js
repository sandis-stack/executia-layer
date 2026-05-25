/**
 * EXECUTIA Execution Memory (Phase 5J).
 * Institutional execution history — presentation only, no execution logic changes.
 */
(function (global) {
  const RETENTION_MAX = 8;

  const MEMORY = Object.freeze({
    EXECUTION_MEMORY: "EXECUTION MEMORY",
    CANONICAL_MEMORY: "CANONICAL MEMORY",
    GOVERNANCE_HISTORY: "GOVERNANCE HISTORY",
    REPLAYABLE_CONSEQUENCE: "REPLAYABLE CONSEQUENCE",
    CONTINUITY_RECORD: "EXECUTION CONTINUITY RECORD"
  });

  const HIERARCHY = Object.freeze({
    PRIMARY: "execution continuity memory",
    SECONDARY: "governance transitions",
    TERTIARY: "diagnostic retention"
  });

  const DESCRIPTORS = Object.freeze({
    PERSISTENCE:
      "Institutional memory retains governed consequence across time — not disposable records.",
    REPLAY:
      "Replayable consequence follows canonical order; history remains deterministic and read-only.",
    CONTINUITY: "Execution continuity is structurally remembered — each record advances institutional state.",
    PERMANENCE: "Memory persists under governance authority; transitions remain traceable at verify."
  });

  const MEMORY_DISPLAY_MAX = 5;

  function CMP() {
    return global.EXECUTIA_CANONICAL_COMPRESSION;
  }

  function esc(s) {
    const core = global.EXECUTIA_GOVERNANCE_CORE;
    if (core?.esc) return core.esc(s);
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function tierClass(level) {
    const core = global.EXECUTIA_GOVERNANCE_CORE;
    if (core?.tierClass) return core.tierClass(level);
    if (level === "primary") return "ex-gov-tier-primary";
    if (level === "secondary") return "ex-gov-tier-secondary";
    return "ex-gov-tier-tertiary";
  }

  function formatTs(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(iso ?? "—");
    }
  }

  function isMemoryPage() {
    return (
      document.body.classList.contains("ex-memory-enabled") ||
      document.body.classList.contains("ex-gov-modes-enabled")
    );
  }

  function mountMemoryBand() {
    if (!isMemoryPage()) return;
    if (document.getElementById("exMemoryBand")) return;

    const anchor =
      document.getElementById("exConsequenceBand") ||
      document.getElementById("exRhythmBand") ||
      document.querySelector(".ex-gov-mode-bar");
    const band = document.createElement("div");
    band.className = "ex-memory-band";
    band.id = "exMemoryBand";
    band.setAttribute("role", "status");
    band.setAttribute("aria-live", "polite");
    band.setAttribute("aria-label", "Execution memory");
    band.innerHTML = `
      <div class="ex-memory-inner">
        <p class="ex-memory-primary ${tierClass("primary")}" id="exMemoryPrimary">${MEMORY.EXECUTION_MEMORY}</p>
        <p class="ex-memory-secondary ${tierClass("secondary")}" id="exMemorySecondary">${MEMORY.GOVERNANCE_HISTORY}</p>
        <p class="ex-memory-tertiary ${tierClass("tertiary")}" id="exMemoryMeta">${DESCRIPTORS.PERSISTENCE}</p>
        <div class="ex-memory-frames ${tierClass("secondary")}" id="exMemoryFrames" aria-label="Institutional memory framing"></div>
      </div>
    `;

    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", band);
    } else {
      const main = document.querySelector("main");
      if (main) main.prepend(band);
    }
  }

  function deriveMemoryState(ctx) {
    const ledger = ctx?.ledger || [];
    const data = ctx?.data || {};
    const ag = ctx?.ag || {};
    const count = ledger.length;
    const present = data?.sources_present || {};
    const missing = (data?.missing_sources || []).length;

    const frames = [MEMORY.EXECUTION_MEMORY, MEMORY.GOVERNANCE_HISTORY];
    if (count > 0) frames.push(MEMORY.CONTINUITY_RECORD);
    if ((ag.replay_layer || []).length > 0 || present.execution_intelligence) {
      frames.push(MEMORY.REPLAYABLE_CONSEQUENCE);
    }
    if (present.architecture_graph || (ag.canonical_authority || []).length > 0) {
      frames.push(MEMORY.CANONICAL_MEMORY);
    }

    const cap = CMP()?.displayLimit?.(MEMORY_DISPLAY_MAX) ?? MEMORY_DISPLAY_MAX;
    const compressed = CMP()?.isActive?.() === true;
    return {
      primary: MEMORY.EXECUTION_MEMORY,
      secondary: compressed
        ? `${MEMORY.GOVERNANCE_HISTORY} · ${count} records`
        : `${MEMORY.GOVERNANCE_HISTORY} · ${count} ${MEMORY.CONTINUITY_RECORD.toLowerCase()}${count === 1 ? "" : "s"}`,
      meta: CMP()?.compressMeta?.("MEMORY", `${DESCRIPTORS.CONTINUITY} · ${DESCRIPTORS.REPLAY}`) ?? `${DESCRIPTORS.CONTINUITY} · ${DESCRIPTORS.REPLAY}`,
      frames: [...new Set(frames)].slice(0, cap),
      recordCount: count,
      retentionLine: compressed
        ? `Memory · ${RETENTION_MAX} records max`
        : `Governed memory retention · ${RETENTION_MAX} canonical records maximum`,
      missingLine: missing ? (compressed ? `${missing} pending` : `${missing} memory source(s) awaiting canonical generation`) : ""
    };
  }

  function memoryFramesHtml(frames, active) {
    return frames
      .map((label) => {
        const on = label === active ? " is-active" : "";
        return `<span class="ex-memory-frame${on}">${esc(label)}</span>`;
      })
      .join("");
  }

  function applyMemory(ctx) {
    mountMemoryBand();
    const state = deriveMemoryState(ctx || {});

    const primaryEl = document.getElementById("exMemoryPrimary");
    const secondaryEl = document.getElementById("exMemorySecondary");
    const metaEl = document.getElementById("exMemoryMeta");
    const framesEl = document.getElementById("exMemoryFrames");

    if (primaryEl) primaryEl.textContent = state.primary;
    if (secondaryEl) secondaryEl.textContent = state.secondary;
    if (metaEl) metaEl.textContent = state.meta;
    if (framesEl) framesEl.innerHTML = memoryFramesHtml(state.frames, state.primary);

    document.body.classList.toggle("ex-memory-active", state.recordCount > 0);
    return state;
  }

  function continuityRecordHtml(ledger, fmtFn, limit = 8) {
    const showTs = typeof fmtFn === "function" ? fmtFn : formatTs;
    const rows = (ledger || []).slice(0, limit);
    if (!rows.length) {
      return `<p class="ex-ds-diagnostics ex-ds-empty ${tierClass("tertiary")}">No ${MEMORY.CONTINUITY_RECORD.toLowerCase()} at this posture.</p>`;
    }
    return `<div class="ex-memory-timeline">${rows
      .map(
        (row, i) => `
      <div class="ex-memory-record ${tierClass("tertiary")}" data-memory-index="${i}">
        <span class="ex-memory-record-label">${esc(MEMORY.CONTINUITY_RECORD)}</span>
        <span>${esc(showTs(row.generated_at))}</span>
        <span>${esc(row.risk ?? "—")}</span>
        <span>${row.stability != null ? esc(row.stability) : "—"}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  function retentionPresentation(ctx) {
    const state = deriveMemoryState(ctx || {});
    const present = ctx?.data?.sources_present || {};
    const html = CMP()?.isActive?.()
      ? `<p class="ex-ds-diagnostics ex-ds-mt-24 ${tierClass("tertiary")}">${esc(state.retentionLine)} · ${state.recordCount} loaded.</p>`
      : `
      <p class="ex-ds-diagnostics ex-ds-mt-24 ${tierClass("tertiary")}">${esc(state.retentionLine)}.</p>
      <p class="ex-ds-diagnostics ex-ds-mt-24 ${tierClass("tertiary")}">${esc(MEMORY.CANONICAL_MEMORY)} present · ${state.recordCount} ${MEMORY.CONTINUITY_RECORD.toLowerCase()} loaded · Architecture ${present.architecture_graph ? "remembered" : "pending"} · Intelligence ${present.execution_intelligence ? "remembered" : "pending"}.</p>
      ${state.missingLine ? `<p class="ex-ds-diagnostics ex-ds-mt-24 ${tierClass("tertiary")}">${esc(state.missingLine)}.</p>` : ""}`;
    return CMP()?.compressRetentionHtml?.(html) ?? html;
  }

  global.EXECUTIA_EXECUTION_MEMORY = Object.freeze({
    MEMORY,
    HIERARCHY,
    DESCRIPTORS,
    RETENTION_MAX,
    mountMemoryBand,
    applyMemory,
    deriveMemoryState,
    continuityRecordHtml,
    retentionPresentation,
    formatTs
  });
})(typeof window !== "undefined" ? window : globalThis);
