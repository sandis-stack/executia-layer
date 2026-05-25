(function () {
  const lang = () =>
    (typeof window !== "undefined" && window.EXECUTIA_GOVERNANCE_CORE?.LANGUAGE) ||
    (typeof window !== "undefined" && window.EXECUTIA_GOVERNANCE_LANGUAGE);

  function normalize(path) {
    return path.replace(/index\.html$/, "");
  }

  function isActive(path) {
    return normalize(location.pathname) === normalize(path);
  }

  function navLinks(items) {
    return items
      .map(([label, path, external]) => {
        const active = isActive(path) ? "active" : "";
        const ext = external ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${path}" class="${active}"${ext}>${label}</a>`;
      })
      .join("");
  }

  function buildHeader() {
    const L = lang();
    const PRIMARY = L?.NAV?.PRIMARY || [];
    const SECONDARY = L?.NAV?.SECONDARY || [];
    const BRAND_SUB = L?.PHRASES?.BRAND_SUB || "Execution Authority";
    const useGovernanceShell = document.body?.classList?.contains("ex-ds-governance-shell");
    const header = document.createElement("header");
    header.className = "ex-engine-header";

    if (useGovernanceShell && PRIMARY.length) {
      header.innerHTML = `
        <div class="ex-engine-header-inner">
          <div class="ex-engine-brand">
            <a class="ex-engine-brand-main" href="https://executia.io/">EXECUTIA™</a>
            <span class="ex-engine-brand-sub">${BRAND_SUB}</span>
          </div>
          <div class="ex-gov-nav-wrap" aria-label="EXECUTIA navigation">
            <nav class="ex-gov-nav-primary" aria-label="Primary navigation">
              ${navLinks(PRIMARY)}
            </nav>
            <nav class="ex-gov-nav-secondary" aria-label="Context navigation">
              ${navLinks(SECONDARY)}
            </nav>
          </div>
          <a class="ex-engine-entry" href="https://executia.io/">Entry ↗</a>
        </div>
      `;
      return header;
    }

    const legacy = PRIMARY.concat(SECONDARY);
    header.innerHTML = `
      <div class="ex-engine-header-inner">
        <div class="ex-engine-brand">
          <a class="ex-engine-brand-main" href="https://executia.io/">EXECUTIA™</a>
          <span class="ex-engine-brand-sub">${BRAND_SUB}</span>
        </div>
        <nav class="ex-engine-nav" aria-label="EXECUTIA console">
          ${navLinks(legacy)}
        </nav>
        <a class="ex-engine-entry" href="https://executia.io/">Entry ↗</a>
      </div>
    `;
    return header;
  }

  function mount() {
    const shell = document.querySelector(".ex-engine-shell") || document.body;
    if (document.querySelector(".ex-engine-header")) return;
    shell.prepend(buildHeader());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
