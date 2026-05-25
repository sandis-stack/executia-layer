/**
 * EXECUTIA Institutional Surfaces — canonical multi-surface registry.
 * One execution governance infrastructure; separated operational surfaces.
 * Presentation only — no runtime execution logic.
 */
(function (global) {
  /** Institutional language — single vocabulary across surfaces. */
  const LANGUAGE = Object.freeze({
    PRODUCT: "EXECUTIA",
    INFRASTRUCTURE: "Execution Governance Infrastructure",
    ENGINE_IDENTITY: "Execution Engine",
    DETERMINISTIC: "Deterministic Execution",
    INTEGRITY: "Execution Integrity",
    REPLAY: "Replay-Safe Verification",
    TRUTH: "Execution-Time Truth",
    CANONICAL: "Canonical Governance",
    SUBLINE: "Deterministic governance for execution-critical systems.",
    FOOTER_TRUST:
      "Execution authority · governance continuity · institutional trust · canonical infrastructure",
    HIERARCHY_PRIMARY: "Institutional surfaces",
    HIERARCHY_OPERATIONAL: "Operational infrastructure"
  });

  /**
   * Eight governed surfaces — never collapsed into a single ENGINE page.
   * `engineHome` marks canonical execution identity entry (not the only route).
   */
  const SURFACES = Object.freeze([
    {
      id: "execution",
      label: "Execution",
      href: "/execution-test/",
      domain: "institutional",
      engineHome: true,
      homeRole: "Execution Engine",
      homeDesc: "Governed execution test, validation posture, and institutional commit authority."
    },
    {
      id: "governance",
      label: "Governance",
      href: "/execution-demo.html",
      domain: "institutional",
      homeRole: "Governance orchestration",
      homeDesc: "Proof Engine demonstration — review, commit denial, and canonical governance review."
    },
    {
      id: "proof",
      label: "Proof",
      href: "/public-proof/",
      domain: "institutional",
      homeRole: "Proof receipt",
      homeDesc: "Public proof surface — execution-time truth, canonical verification, institutional receipt."
    },
    {
      id: "replay",
      label: "Replay",
      href: "/proof-explorer/",
      domain: "institutional",
      homeRole: "Replay continuity",
      homeDesc: "Replay-safe verification explorer — deterministic chain continuity under governance."
    },
    {
      id: "health",
      label: "Health",
      href: "/health/",
      domain: "operational",
      homeRole: "Authority health",
      homeDesc: "Runtime, proof, ledger, and audit posture for operational infrastructure."
    },
    {
      id: "operations",
      label: "Operations",
      href: "/console/operations.html",
      domain: "operational",
      homeRole: "Operations control",
      homeDesc: "System readiness, route integrity, and governed operational monitoring."
    },
    {
      id: "engineering",
      label: "Engineering",
      href: "/console/engineering.html",
      domain: "operational",
      homeRole: "Engineering authority",
      homeDesc: "Architecture graph, execution intelligence, and engineering governance surfaces."
    },
    {
      id: "request",
      label: "Request",
      href: "/request-pilot/",
      domain: "institutional",
      homeRole: "Pilot intake",
      homeDesc: "Institutional onboarding — execution-critical process, governance risk, replay requirements."
    }
  ]);

  /** Deep console context — subordinate to surfaces, not separate products. */
  const CONTEXT_LINKS = Object.freeze([
    { label: "Governance console", href: "/console/governance.html" },
    { label: "Governance history", href: "/console/ledger.html" },
    { label: "Audit verify", href: "/console/audit.html" },
    { label: "Audit chain", href: "/console/audit-ledger.html" },
    { label: "Operator authority", href: "/console/operator.html" }
  ]);

  function normalizePath(path) {
    const p = String(path || "").replace(/index\.html$/, "");
    if (p === "/" || p === "") return "/";
    return p.endsWith("/") ? p : p + (p.includes(".") ? "" : "/");
  }

  function resolveSurfaceId(pathname) {
    const path = normalizePath(pathname || global.location?.pathname || "");
    if (path === "/") return "entry";
    if (path.includes("execution-test")) return "execution";
    if (path.includes("execution-demo")) return "governance";
    if (path.includes("public-proof")) return "proof";
    if (path.includes("proof-explorer")) return "replay";
    if (path.includes("health")) return "health";
    if (path.includes("console/operations")) return "operations";
    if (path.includes("console/engineering")) return "engineering";
    if (path.includes("request-pilot")) return "request";
    if (path.includes("regulator")) return "governance";
    if (path.includes("console/governance")) return "governance";
    if (path.includes("console/ledger")) return "engineering";
    if (path.includes("console/audit")) return "engineering";
    if (path.includes("console/proofs")) return "proof";
    if (path.includes("console/operator")) return "operations";
    if (path.includes("dashboard")) return "execution";
    return "entry";
  }

  function engineHomeSurface() {
    return SURFACES.find((s) => s.engineHome) || SURFACES[0];
  }

  function surfacesByDomain(domain) {
    return SURFACES.filter((s) => s.domain === domain);
  }

  /** Console nav tuples: [label, href, external?] */
  function consoleNavTuples() {
    return {
      primary: SURFACES.map((s) => [s.label.toUpperCase(), s.href, !!s.external]),
      secondary: CONTEXT_LINKS.map((c) => [c.label, c.href, false])
    };
  }

  global.EXECUTIA_INSTITUTIONAL_SURFACES = Object.freeze({
    LANGUAGE,
    SURFACES,
    CONTEXT_LINKS,
    normalizePath,
    resolveSurfaceId,
    engineHomeSurface,
    surfacesByDomain,
    consoleNavTuples
  });
})(typeof window !== "undefined" ? window : globalThis);
