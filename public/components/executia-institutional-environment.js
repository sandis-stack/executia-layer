/**
 * EXECUTIA Institutional Environment — final sovereign public shell.
 */
(function (global) {
  /** Primary navigation only — inevitable operational flow. */
  const FLOW = Object.freeze([
    { id: "execution", label: "Execution", href: "/execution-test/" },
    { id: "governance", label: "Governance", href: "/execution-demo.html" },
    { id: "proof", label: "Proof", href: "/public-proof/" },
    { id: "request", label: "Request", href: "/request-pilot/" }
  ]);

  const FOOTER_LINKS = FLOW.map((f) => [f.label, f.href]);

  /** Global AI-semantic vocabulary — use exactly these phrases. */
  const AI_CLARITY = Object.freeze({
    PRODUCT: "EXECUTIA",
    INFRASTRUCTURE: "Execution Governance Infrastructure",
    DETERMINISTIC: "Deterministic Execution",
    INTEGRITY: "Execution Integrity",
    REPLAY: "Replay-Safe Verification",
    TRUTH: "Execution-Time Truth",
    CANONICAL: "Canonical Governance",
    SUBLINE: "Deterministic governance for execution-critical systems.",
    FOOTER_TRUST:
      "Execution authority · governance continuity · institutional trust · canonical infrastructure"
  });

  const DEMO_FLOW = Object.freeze([
    { id: "REQUEST", label: "REQUEST", detail: "Request received." },
    { id: "VALIDATION", label: "VALIDATION", detail: "Rules evaluated." },
    { id: "GOVERNANCE_REVIEW", label: "GOVERNANCE REVIEW", detail: "Review holds commit." },
    { id: "EXECUTION_COMMIT", label: "EXECUTION COMMIT", detail: "Commit denied." },
    { id: "REPLAY_SAFE", label: "REPLAY SAFE", detail: "Continuity verified." },
    { id: "PROOF_VERIFIED", label: "PROOF VERIFIED", detail: "Truth recorded." }
  ]);

  function normalizePath(path) {
    const p = String(path || "").replace(/index\.html$/, "");
    if (p === "/" || p === "") return "/";
    return p.endsWith("/") ? p : p + (p.includes(".") ? "" : "/");
  }

  function resolvePageId() {
    const attr = document.body?.getAttribute("data-ex-env-page");
    if (attr) return attr;
    const path = normalizePath(global.location?.pathname || "");
    if (path === "/") return "entry";
    if (path.includes("execution-test")) return "execution";
    if (path.includes("execution-demo")) return "governance";
    if (path.includes("public-proof") || path.includes("proof-explorer")) return "proof";
    if (path.includes("request-pilot")) return "request";
    if (path.includes("regulator")) return "governance";
    return "entry";
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderHeader(pageId) {
    const flow = FLOW.map((item) => {
      const active = item.id === pageId ? " is-active" : "";
      return `<a href="${esc(item.href)}" class="${active.trim()}"${active ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`;
    }).join("");

    return `
      <div class="ex-env-header" role="banner">
        <a class="ex-env-brand" href="/">
          <strong>${esc(AI_CLARITY.PRODUCT)}™</strong>
          <span>${esc(AI_CLARITY.INFRASTRUCTURE)}</span>
        </a>
        <nav class="ex-env-flow" aria-label="Primary navigation">${flow}</nav>
      </div>
    `;
  }

  function renderFooter() {
    const links = FOOTER_LINKS.map(([label, href]) => `<a href="${esc(href)}">${esc(label)}</a>`).join("");
    return `
      <footer class="ex-env-footer" role="contentinfo">
        <div class="ex-env-footer-primary">${esc(AI_CLARITY.FOOTER_TRUST)}</div>
        <nav class="ex-env-footer-flow" aria-label="Navigation">${links}</nav>
        <p class="ex-env-footer-meta">${esc(AI_CLARITY.INFRASTRUCTURE)} · ${esc(AI_CLARITY.DETERMINISTIC)} · ${esc(AI_CLARITY.INTEGRITY)} · ${esc(AI_CLARITY.REPLAY)} · ${esc(AI_CLARITY.TRUTH)} · ${esc(AI_CLARITY.CANONICAL)}</p>
      </footer>
    `;
  }

  function renderHomeHero() {
    return `
      <section class="ex-env-hero-canonical" aria-label="EXECUTIA authority">
        <h1 class="ex-env-hero-title">${esc(AI_CLARITY.PRODUCT)}™</h1>
        <p class="ex-env-hero-category">${esc(AI_CLARITY.INFRASTRUCTURE)}</p>
        <p class="ex-env-hero-subline">${esc(AI_CLARITY.SUBLINE)}</p>
        <div class="ex-env-hero-cta">
          <a href="/execution-test/" class="is-primary">Enter Execution</a>
          <a href="/request-pilot/">Request Pilot</a>
        </div>
      </section>
      <ul class="ex-env-authority-lines" aria-label="Institutional clarity">
        <li><span>What</span>${esc(AI_CLARITY.INFRASTRUCTURE)} for systems where execution failure is material.</li>
        <li><span>Why</span>${esc(AI_CLARITY.TRUTH)} — consequence must be known at commit, not after.</li>
        <li><span>Governance</span>${esc(AI_CLARITY.CANONICAL)} before commitment — not workflow software.</li>
        <li><span>Deterministic</span>${esc(AI_CLARITY.DETERMINISTIC)} and ${esc(AI_CLARITY.REPLAY)} — integrity you can revalidate.</li>
      </ul>
    `;
  }

  function renderConsequenceBand() {
    return `
      <div class="ex-env-consequence-band" aria-label="Execution posture">
        <div><span>${esc(AI_CLARITY.TRUTH)}</span><strong>Validation</strong></div>
        <div><span>${esc(AI_CLARITY.CANONICAL)}</span><strong>Commit</strong></div>
        <div><span>${esc(AI_CLARITY.REPLAY)}</span><strong>Continuity</strong></div>
        <div><span>${esc(AI_CLARITY.INTEGRITY)}</span><strong>Verify</strong></div>
      </div>
    `;
  }

  function renderDemoFlowLadder(activeIndex) {
    const idx = Number.isFinite(activeIndex) ? activeIndex : -1;
    return `
      <ol class="ex-env-demo-flow" aria-label="Proof engine flow">
        ${DEMO_FLOW.map((step, i) => {
          const cls = i < idx ? " is-done" : i === idx ? " is-active" : "";
          const blocked = i === 2 || i === 3 ? " is-blocked-step" : "";
          return `<li class="${cls.trim()}${blocked}"><span class="ex-env-demo-flow-label">${esc(step.label)}</span></li>`;
        }).join("")}
      </ol>
    `;
  }

  function renderProofIntro() {
    return `
      <section class="ex-env-proof-intro" aria-label="Public proof">
        <p class="eyebrow">${esc(AI_CLARITY.INTEGRITY)} · ${esc(AI_CLARITY.TRUTH)}</p>
        <h1 class="ex-env-proof-title">Public proof receipt</h1>
        <p class="lead">${esc(AI_CLARITY.CANONICAL)} verification · ${esc(AI_CLARITY.REPLAY)} · ${esc(AI_CLARITY.DETERMINISTIC)} record.</p>
        ${renderConsequenceBand()}
      </section>
    `;
  }

  function renderOnboardingSteps() {
    return `
      <ol class="ex-env-onboarding-steps" aria-label="Pilot path">
        <li class="is-active"><span>1</span><div><strong>Intake</strong><span>Organization and execution problem.</span></div></li>
        <li><span>2</span><div><strong>Review</strong><span>Governance risk and pilot objective.</span></div></li>
        <li><span>3</span><div><strong>Posture</strong><span>${esc(AI_CLARITY.REPLAY)} requirement recorded.</span></div></li>
      </ol>
    `;
  }

  function mountAiMeta() {
    if (document.getElementById("ex-env-jsonld")) return;
    const payload = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: AI_CLARITY.PRODUCT,
      applicationCategory: AI_CLARITY.INFRASTRUCTURE,
      description: [
        AI_CLARITY.INFRASTRUCTURE,
        AI_CLARITY.SUBLINE,
        AI_CLARITY.DETERMINISTIC,
        AI_CLARITY.INTEGRITY,
        AI_CLARITY.REPLAY,
        AI_CLARITY.TRUTH,
        AI_CLARITY.CANONICAL
      ].join(". "),
      keywords: [
        "execution governance infrastructure",
        "deterministic execution system",
        "replay-safe governance environment"
      ].join(", "),
      operatingSystem: "Web"
    };
    const script = document.createElement("script");
    script.id = "ex-env-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);

    const desc = `${AI_CLARITY.INFRASTRUCTURE}. ${AI_CLARITY.SUBLINE} ${AI_CLARITY.TRUTH}. ${AI_CLARITY.REPLAY}.`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    if (!meta.content || document.body.getAttribute("data-ex-env-page") === "entry") {
      meta.content = desc;
    }
  }

  function mountHeader(pageId) {
    const html = renderHeader(pageId);
    const mount = document.querySelector("[data-ex-env-header]");
    if (mount) {
      mount.outerHTML = html;
      return;
    }
    const legacy = document.querySelector(
      ".shell > header, main.shell > header, .reg-shell > header, body > .shell > header"
    );
    if (legacy) legacy.outerHTML = html;
  }

  function mountFooter() {
    const html = renderFooter();
    const mount = document.querySelector("[data-ex-env-footer]");
    if (mount) {
      mount.outerHTML = html;
      return;
    }
    const legacy = document.querySelector(".shell > footer, main.shell > footer, .reg-shell > footer");
    if (legacy) {
      legacy.outerHTML = html;
      return;
    }
    const shell = document.querySelector(".shell, main.shell, .reg-shell");
    if (shell) shell.insertAdjacentHTML("beforeend", html);
  }

  function mountHomeHero() {
    const host = document.querySelector("[data-ex-env-hero]");
    if (host) host.innerHTML = renderHomeHero();
  }

  function mountConsequenceBand() {
    if (document.querySelector(".ex-env-consequence-band")) return;
    const host = document.querySelector("[data-ex-env-consequence]");
    if (host) host.innerHTML = renderConsequenceBand();
  }

  function mountDemoFlowLadder(activeIndex) {
    const host = document.querySelector("[data-ex-env-demo-flow]");
    if (host) host.innerHTML = renderDemoFlowLadder(activeIndex);
  }

  function mountProofIntro() {
    const host = document.querySelector("[data-ex-env-proof-intro]");
    if (host) host.innerHTML = renderProofIntro();
  }

  function mountOnboardingSteps() {
    const host = document.querySelector("[data-ex-env-onboarding-steps]");
    if (host) host.innerHTML = renderOnboardingSteps();
  }

  function mount() {
    if (!document.body.classList.contains("ex-institutional-env")) return;
    const pageId = resolvePageId();
    mountAiMeta();
    mountHeader(pageId);
    mountFooter();
    mountHomeHero();
    mountConsequenceBand();
    mountDemoFlowLadder(-1);
    mountProofIntro();
    mountOnboardingSteps();
    document.dispatchEvent(new CustomEvent("executia:institutional-env:refresh"));
  }

  global.EXECUTIA_INSTITUTIONAL_ENV = Object.freeze({
    FLOW,
    FOOTER_LINKS,
    AI_CLARITY,
    DEMO_FLOW,
    mount,
    mountAiMeta,
    mountDemoFlowLadder,
    renderHeader,
    renderFooter,
    renderHomeHero,
    renderConsequenceBand,
    renderDemoFlowLadder,
    renderProofIntro,
    renderOnboardingSteps,
    resolvePageId
  });

  function init() {
    global.__EXECUTIA_PUBLIC_PAGE__ = true;
    mount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
