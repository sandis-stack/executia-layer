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

  /** Public product surfaces — why, how, contact. Assessment is internal (not listed). */
  const PUBLIC_PRODUCT_FLOW = Object.freeze([
    { id: "homepage", label: "Home", href: "/" },
    { id: "demonstration", label: "Demonstration", href: "/demonstration/" },
    { id: "request", label: "Request Pilot", href: "/request-pilot/" }
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

  /** ENTRY semantic authority — operational governance continuity layer (not a software platform). */
  const ENTRY_SEMANTICS = Object.freeze({
    LAYER_LABEL: "operational governance continuity layer",
    DEFINITION:
      "EXECUTIA preserves governance continuity before operational consequence expands across critical institutional commitments.",
    DEFINITION_MEANS:
      "Operational governance continuity means that oversight, reviewable evidence, accountability, and institutional review remain continuous after operational execution begins.",
    DEFINITION_EXPOSURE:
      "Execution exposure often expands after approval while governance continuity weakens across operators, systems, infrastructure, payments, procurement, or compliance environments.",
    DEFINITION_EXECUTIA:
      "EXECUTIA exists to preserve governance continuity before operational consequence expands.",
    HERO_SUBLINE:
      "Critical commitments continue across approvals, operators, and infrastructure while oversight continuity weakens.",
    INEVITABILITY_BEFORE_CTA:
      "Operational governance cannot rely on delayed visibility once execution scales across approvals, operators, infrastructure, payments, or compliance exposure.",
    INEVITABILITY_REVIEW_NECESSITY:
      "Institutional review becomes necessary before exposure expands operationally.",
    CONTINUITY_CHAIN_CLOSE:
      "Operational governance must continue after approval — not begin after exposure.",
    FOOTER_TRUST:
      "Operational governance · oversight continuity · reviewable evidence · institutional accountability",
    FOOTER_META: "Governance continuity before operational exposure expands",
    META_DESCRIPTION:
      "Operational governance continuity before critical commitments continue. Institutional oversight, reviewable evidence, operational accountability, and governance continuity for procurement, infrastructure, payments, and compliance execution.",
    META_KEYWORDS: [
      "operational governance",
      "governance continuity",
      "institutional oversight",
      "reviewable evidence",
      "operational accountability",
      "procurement governance",
      "infrastructure oversight",
      "compliance continuity",
      "institutional review",
      "operational exposure"
    ].join(", "),
    TRUST_STATEMENT:
      "Institutional review applies where governance continuity, oversight accountability, and reviewable evidence must exist before critical commitments continue.",
    AUTHORITY: Object.freeze({
      "governance continuity":
        "Oversight, reviewable evidence, and accountability remain continuous after operational execution begins.",
      "institutional oversight":
        "Institutional review and oversight continue across operators, systems, and compliance environments.",
      "operational accountability":
        "Accountability remains traceable across execution-stage commitments and operators.",
      "reviewable evidence":
        "Evidence remains available under institutional oversight before and after commitment.",
      "procurement governance":
        "Procurement execution remains subject to governance continuity before commitments continue.",
      "infrastructure oversight":
        "Infrastructure execution remains subject to continuous oversight continuity.",
      "compliance continuity":
        "Compliance conditions remain continuous across operational execution exposure.",
      "operational exposure":
        "Exposure is evaluated before operational consequence expands across commitments.",
      "institutional review":
        "Institutional review authority applies before exposure expands operationally.",
      "commitment control":
        "Critical commitments remain under governance continuity before they continue operationally."
    }),
    DEFINED_FOR: Object.freeze([
      "procurement governance continuity",
      "infrastructure execution oversight",
      "operational compliance continuity",
      "reviewable evidence under institutional oversight",
      "execution-stage accountability continuity",
      "operational exposure review",
      "institutional operational review",
      "governance continuity before commitments continue"
    ])
  });

  /** Restrained exposure pressure — between ENTRY sections only. */
  const ENTRY_PRESSURE_LINES = Object.freeze([
    "Operational execution continues even when oversight continuity weakens.",
    "Evidence reconstruction usually begins after exposure expands.",
    "Approval does not guarantee governance continuity.",
    "Operational accountability fragments across systems and operators.",
    "Institutions often discover governance failure after operational consequence appears."
  ]);

  const ENTRY_CONTINUITY_CHAIN = Object.freeze([
    "Decision",
    "Approval",
    "Execution",
    "Oversight continuity",
    "Reviewable evidence",
    "Operational accountability"
  ]);

  /** Execution-test consequence state transitions (intake-driven, client-side). */
  const EXECUTION_CONSEQUENCE_STATES = Object.freeze({
    READINESS: ["STANDBY", "REVIEWING", "VALIDATING", "HARDENED"],
    REGULATORY: ["PENDING REVIEW", "UNDER REVIEW"],
    PROOF: ["NOT MATERIALIZED", "EVIDENCE PENDING", "CONTINUITY VERIFIED"],
    AUTHORITY: ["WITHHELD", "CONDITIONAL", "CONTROLLED", "AUTHORIZATION ELIGIBLE"]
  });

  /** Execution pathway engine segments (execution-test shell). */
  const EXECUTION_PATHWAY_ENGINE = Object.freeze([
    { id: "intake", label: "Intake segment" },
    { id: "governance", label: "Governance segment" },
    { id: "continuity", label: "Continuity segment" },
    { id: "authority", label: "Authority segment" },
    { id: "authorization", label: "Authorization segment" }
  ]);

  /** Execution-test live governance flow — institutional sequence labels. */
  const EXECUTION_LIVE_GOVERNANCE_FLOW = Object.freeze([
    {
      id: "outcome",
      label: "Outcome Defined",
      detail: "Institutional outcome recorded for governance evaluation.",
      phase: "INTAKE"
    },
    {
      id: "validation",
      label: "Governance Validation",
      detail: "Governance constraints and approval order under review.",
      phase: "CONTROL"
    },
    {
      id: "exposure",
      label: "Exposure Assessment",
      detail: "Operational exposure surface mapped across commitments.",
      phase: "ASSESS"
    },
    {
      id: "proof",
      label: "Proof Continuity",
      detail: "Reviewable evidence continuity evaluated before authorization.",
      phase: "PROOF"
    },
    {
      id: "authorization",
      label: "Execution Authorization",
      detail: "Execution authority issued or withheld under governance.",
      phase: "AUTHORITY"
    }
  ]);

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
    if (path === "/") return "homepage";
    if (path.includes("demonstration")) return "demonstration";
    if (path.includes("assessment")) return "assessment";
    if (path.includes("execution-test")) return "execution";
    if (path.includes("execution-demo")) return "governance";
    if (path.includes("public-proof") || path.includes("proof-explorer")) return "proof";
    if (path.includes("request-pilot")) return "request";
    if (path.includes("regulator")) return "governance";
    return "homepage";
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderHeader(pageId) {
    const isPublicProduct = ["homepage", "demonstration", "request", "assessment"].includes(pageId);
    const navSource = isPublicProduct ? PUBLIC_PRODUCT_FLOW : FLOW;
    const flow = navSource.map((item) => {
      const active = item.id === pageId ? " is-active" : "";
      return `<a href="${esc(item.href)}" class="${active.trim()}"${active ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`;
    }).join("");

    const brandSub =
      pageId === "homepage"
        ? "Execution governance standard"
        : pageId === "demonstration"
          ? "How EXECUTIA works"
          : pageId === "request"
            ? "Start institutional discussion"
            : pageId === "assessment"
              ? "Internal evaluation"
              : AI_CLARITY.INFRASTRUCTURE;

    const isStandardHomepage =
      pageId === "homepage" && document.body.classList.contains("ex-standard-homepage");
    const isPublicationDemonstration =
      pageId === "demonstration" && document.body.classList.contains("ex-institutional-publication");
    const isPublicationRequestPilot =
      pageId === "request" && document.body.classList.contains("ex-institutional-publication");
    const brandInner = `<strong>${esc(AI_CLARITY.PRODUCT)}™</strong><span>${esc(brandSub)}</span>`;
    const brand = isStandardHomepage || isPublicationDemonstration || isPublicationRequestPilot
      ? `<span class="ex-env-brand">${brandInner}</span>`
      : `<a class="ex-env-brand" href="/">${brandInner}</a>`;

    return `
      <div class="ex-env-header" role="banner">
        ${brand}
        <nav class="ex-env-flow" aria-label="Primary navigation">${flow}</nav>
      </div>
    `;
  }

  function renderPublicationMetadataFooter(documentLabel) {
    return `
      <footer class="ex-env-footer ex-standard-registry ex-standard-publication-footer" role="contentinfo">
        <div class="ex-standard-authority-item ex-standard-registry-row">
          <h4>Standard</h4>
          <p>EXECUTIA-STANDARD-V1</p>
        </div>
        <div class="ex-standard-authority-item ex-standard-registry-row">
          <h4>Status</h4>
          <p>Published</p>
        </div>
        <div class="ex-standard-authority-item ex-standard-registry-row">
          <h4>Authority</h4>
          <p>EXECUTIA CTO</p>
        </div>
        <div class="ex-standard-authority-item ex-standard-registry-row">
          <h4>Document</h4>
          <p>${esc(documentLabel)}</p>
        </div>
      </footer>
    `;
  }

  function resolvePublicationSurface(pageId) {
    if (pageId === "homepage" && document.body.classList.contains("ex-standard-homepage")) {
      return { document: "Execution Governance Standard" };
    }
    if (pageId === "demonstration" && document.body.classList.contains("ex-institutional-publication")) {
      return { document: "Evidence Annex A · Execution Control Map" };
    }
    if (pageId === "request" && document.body.classList.contains("ex-institutional-publication")) {
      return { document: "Pilot Request Publication" };
    }
    return null;
  }

  function renderFooter(pageId) {
    const isPublicProduct = ["homepage", "demonstration", "request", "assessment"].includes(pageId);
    const links = (isPublicProduct ? PUBLIC_PRODUCT_FLOW : FLOW).map(
      (item) => `<a href="${esc(item.href)}">${esc(item.label)}</a>`
    ).join("");
    const isHomepage = pageId === "homepage";
    const publicationSurface = resolvePublicationSurface(pageId);
    const footerPrimary = isHomepage
      ? "EXECUTIA-STANDARD-V1 · Published · EXECUTIA CTO"
      : AI_CLARITY.FOOTER_TRUST;
    const footerMeta = isHomepage
      ? "The Execution Governance Standard"
      : `${AI_CLARITY.INFRASTRUCTURE} · ${AI_CLARITY.DETERMINISTIC} · ${AI_CLARITY.INTEGRITY} · ${AI_CLARITY.REPLAY} · ${AI_CLARITY.TRUTH} · ${AI_CLARITY.CANONICAL}`;
    if (publicationSurface) {
      return renderPublicationMetadataFooter(publicationSurface.document);
    }
    return `
      <footer class="ex-env-footer" role="contentinfo">
        <div class="ex-env-footer-primary">${esc(footerPrimary)}</div>
        <nav class="ex-env-footer-flow" aria-label="Navigation">${links}</nav>
        <p class="ex-env-footer-meta">${esc(footerMeta)}</p>
      </footer>
    `;
  }

  function renderEntryPressureLine(text) {
    return `<p class="ex-env-entry-pressure-line" role="note">${esc(text)}</p>`;
  }

  function renderEntryContinuityChain(includeClose) {
    const close =
      includeClose !== false
        ? `<p class="ex-env-entry-continuity-close">${esc(ENTRY_SEMANTICS.CONTINUITY_CHAIN_CLOSE)}</p>`
        : "";
    return `
      <div class="ex-env-entry-pressure-chain-wrap" aria-label="Continuity chain">
        <ol class="ex-env-entry-pressure-chain">
          ${ENTRY_CONTINUITY_CHAIN.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ol>
        ${close}
      </div>
    `;
  }

  function renderEntrySemanticAuthorityDefinition() {
    const anchors = Object.entries(ENTRY_SEMANTICS.AUTHORITY)
      .map(([term, gloss]) => `<dt>${esc(term)}</dt><dd>${esc(gloss)}</dd>`)
      .join("");
    return `
      <section class="ex-env-entry-section ex-env-entry-semantic-def" aria-label="Operational governance continuity definition" itemscope itemtype="https://schema.org/DefinedTerm">
        <meta itemprop="name" content="Operational governance continuity">
        <h2 class="ex-env-entry-section-title">Operational governance continuity</h2>
        <p class="ex-env-entry-semantic-body" itemprop="description">${esc(ENTRY_SEMANTICS.DEFINITION_MEANS)}</p>
        <p class="ex-env-entry-semantic-body">${esc(ENTRY_SEMANTICS.DEFINITION_EXPOSURE)}</p>
        <p class="ex-env-entry-semantic-body ex-env-entry-semantic-exec">${esc(ENTRY_SEMANTICS.DEFINITION_EXECUTIA)}</p>
        <dl class="ex-env-entry-semantic-anchors" aria-label="Semantic authority anchors">
          ${anchors}
        </dl>
      </section>
    `;
  }

  function renderEntryDefinedFor() {
    return `
      <section class="ex-env-entry-section ex-env-entry-defined-for" aria-label="Defined for">
        <h2 class="ex-env-entry-section-title">Defined for</h2>
        <ul class="ex-env-entry-defined-for-list">
          ${ENTRY_SEMANTICS.DEFINED_FOR.map((line) => `<li>${esc(line)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderEntrySemanticContinuitySection() {
    return `
      <section class="ex-env-entry-section ex-env-entry-semantic-chain" aria-label="Structured continuity language">
        <h2 class="ex-env-entry-section-title">Continuity chain</h2>
        ${renderEntryContinuityChain(true)}
      </section>
    `;
  }

  function renderEntryInevitabilityBeforeCta() {
    return `
      <div class="ex-env-entry-inevitability" aria-label="Governance inevitability">
        <p>${esc(ENTRY_SEMANTICS.INEVITABILITY_BEFORE_CTA)}</p>
        <p>${esc(ENTRY_SEMANTICS.INEVITABILITY_REVIEW_NECESSITY)}</p>
      </div>
    `;
  }

  function renderEntryHeroShort() {
    return `
      <section class="ex-env-hero-canonical ex-env-entry-hero-short" aria-label="EXECUTIA authority">
        <p class="ex-env-hero-category">${esc(ENTRY_SEMANTICS.LAYER_LABEL)}</p>
        <h1 class="ex-env-hero-title">Execution already happens.<br>Oversight often does not.</h1>
        <p class="ex-env-hero-subline">${esc(ENTRY_SEMANTICS.HERO_SUBLINE)}</p>
      </section>
    `;
  }

  function renderEntryOperationalExposure() {
    const realities = [
      "Critical commitments continue across procurement, payments, infrastructure, and regulated operations every day.",
      "Most governance begins after operational exposure already exists.",
      "Approval does not guarantee governed execution, reviewable evidence, or continuous oversight.",
      "Loss, delay, audit exposure, and accountability gaps are often discovered only after commitment."
    ];
    return `
      <section class="ex-env-entry-section ex-env-entry-exposure" aria-label="Operational exposure reality">
        <h2 class="ex-env-entry-section-title">Operational exposure reality</h2>
        <p class="ex-env-entry-section-lead">Modern operations execute faster than institutional oversight can continuously govern.</p>
        <ul class="ex-env-entry-list">
          ${realities.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderEntryWhyInstitutionsReview() {
    const points = [
      "governance exposure discovered after commitment",
      "fragmented operational oversight",
      "delayed audit evidence",
      "approval without governance continuity",
      "infrastructure execution liability",
      "procurement and payment exposure"
    ];
    return `
      <section class="ex-env-entry-section ex-env-entry-review" aria-label="Why institutions request review">
        <h2 class="ex-env-entry-section-title">Why institutions request review</h2>
        <p class="ex-env-entry-section-lead">Institutions request review when operational commitments continue faster than governance continuity can be demonstrated.</p>
        <ul class="ex-env-entry-list">
          ${points.map((p) => `<li>${esc(p)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderEntryProofCases() {
    const cases = [
      {
        title: "Procurement execution",
        paragraphs: [
          "Approved procurement continued without governance continuity oversight.",
          "Operational exposure was discovered later through audit review, supplier conflict, payment escalation, or delayed accountability.",
          "Governance failure is often confirmed only after procurement execution has continued."
        ]
      },
      {
        title: "Infrastructure operations",
        paragraphs: [
          "Operational execution continued while governance review, accountability validation, or oversight remained incomplete.",
          "Exposure expanded before institutional intervention occurred.",
          "Oversight continuity was reconstructed after operational consequence had already appeared."
        ]
      },
      {
        title: "Financial commitments",
        paragraphs: [
          "Payment authorization existed, but reviewable governance evidence did not.",
          "Liability, audit exposure, or operational accountability gaps were discovered after commitment execution.",
          "Accountability fragments when evidence is assembled only after payment exposure expands."
        ]
      },
      {
        title: "Regulated execution",
        paragraphs: [
          "Operational commitments continued across regulated environments without continuous governance validation.",
          "Oversight depended on delayed review instead of execution-stage control.",
          "Regulated exposure is often mapped only after operational consequence is visible."
        ]
      }
    ];

    const caseMarkup = cases
      .map(
        (item) => `
        <article class="ex-env-proof-case">
          <h3 class="ex-env-proof-case-title">${esc(item.title)}</h3>
          ${item.paragraphs
            .map((text, i) => {
              const cls =
                i === item.paragraphs.length - 1 ? "ex-env-proof-case-outcome" : "";
              return `<p class="${cls}">${esc(text)}</p>`;
            })
            .join("")}
        </article>`
      )
      .join("");

    return `
      <section class="ex-env-entry-section ex-env-entry-proof" aria-label="Proof cases">
        <h2 class="ex-env-entry-section-title">Proof cases</h2>
        <p class="ex-env-entry-section-lead">Critical commitments continue every day across procurement, payments, infrastructure, and regulated operations — often without continuous oversight before execution proceeds.</p>
        <div class="ex-env-proof-case-list">${caseMarkup}</div>
      </section>
    `;
  }

  function renderEntryGovernanceContinuitySequence() {
    const failureWithout = [
      "oversight fragments across operators and systems",
      "exposure expands before reviewable evidence exists",
      "audit reconstruction begins after commitment",
      "accountability weakens once execution continues"
    ];
    return `
      <section class="ex-env-entry-section ex-env-entry-continuity" aria-label="Governance continuity sequence">
        <h2 class="ex-env-entry-section-title">Governance continuity sequence</h2>
        <p class="ex-env-entry-section-lead">Operational systems, approval authorities, regulators, and audit functions remain in place. Oversight continuity must hold across them while execution continues.</p>
        <p class="ex-env-entry-list-label">When continuity breaks:</p>
        <ul class="ex-env-entry-list">
          ${failureWithout.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderEntryLegitimacyDesignedFor() {
    const audience = [
      "procurement governance",
      "regulated payment operations",
      "infrastructure execution oversight",
      "compliance-controlled operations",
      "public-sector approvals",
      "multi-party operational execution"
    ];
    const reviewAreas = [
      "governance continuity gaps",
      "fragmented oversight responsibility",
      "approval without execution accountability",
      "delayed audit evidence",
      "operational execution exposure",
      "commitment control readiness"
    ];
    const designedFor = [
      "institutional audit continuity",
      "reviewable evidence under oversight",
      "execution-stage governance controls",
      "operational accountability environments"
    ];
    return `
      <section class="ex-env-entry-section ex-env-entry-legitimacy" aria-label="Institutional legitimacy">
        <h2 class="ex-env-entry-section-title">Institutional legitimacy</h2>
        <p class="ex-env-entry-section-lead">Institutional review applies where operational commitments continue across multiple systems, approvals, organizations, or regulatory conditions — and exposure may already be present.</p>
        <p class="ex-env-entry-list-label">Who institutional review is for</p>
        <ul class="ex-env-entry-list">
          ${audience.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
        <p class="ex-env-entry-list-label">What institutional review evaluates</p>
        <ul class="ex-env-entry-list">
          ${reviewAreas.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
        <p class="ex-env-entry-list-label">Exposure typically concentrates in</p>
        <ul class="ex-env-entry-list">
          ${designedFor.map((item) => `<li>${esc(item)}</li>`).join("")}
        </ul>
        <p class="ex-env-entry-trust">${esc(ENTRY_SEMANTICS.TRUST_STATEMENT)}</p>
      </section>
    `;
  }

  function renderInstitutionalProofCases() {
    return renderEntryProofCases();
  }

  function renderInevitabilityBlock() {
    return renderEntryWhyInstitutionsReview();
  }

  function renderAiRecognitionAuthority() {
    return renderEntryGovernanceContinuitySequence();
  }

  function renderInstitutionalLegitimacy() {
    return renderEntryLegitimacyDesignedFor();
  }

  function renderDesignedForSemantic() {
    return renderEntryDefinedFor();
  }

  function renderInstitutionalTrustStatement() {
    return "";
  }

  function renderEntryCtas() {
    return `
      <div class="ex-env-entry-cta-wrap">
        ${renderEntryInevitabilityBeforeCta()}
        <p class="ex-env-entry-cta-framing">Institutional intake · review authority · operational assessment · exposure evaluation</p>
        <div class="ex-env-hero-cta" aria-label="Institutional review intake">
          <a href="/request-pilot/" class="is-primary">Request institutional review</a>
          <a href="/execution-test/">Assess operational exposure</a>
        </div>
        <p class="ex-env-entry-cta-note">Request is institutional intake for governance continuity, oversight evidence, and commitment control — not a general contact channel.</p>
      </div>
    `;
  }

  function renderHomeHero() {
    const [p1, p2, p3, p4, p5] = ENTRY_PRESSURE_LINES;
    return `
      <div class="ex-env-entry-v2 ex-env-entry-pressure ex-env-entry-semantic" data-ex-env-entry-authority="semantic-dominance">
        ${renderEntryHeroShort()}
        ${renderEntrySemanticAuthorityDefinition()}
        ${renderEntryDefinedFor()}
        ${renderEntrySemanticContinuitySection()}
        ${renderEntryPressureLine(p1)}
        ${renderEntryOperationalExposure()}
        ${renderEntryPressureLine(p2)}
        ${renderEntryWhyInstitutionsReview()}
        ${renderEntryPressureLine(p3)}
        ${renderEntryProofCases()}
        ${renderEntryPressureLine(p4)}
        ${renderEntryGovernanceContinuitySequence()}
        ${renderEntryPressureLine(p5)}
        ${renderEntryLegitimacyDesignedFor()}
        ${renderEntryCtas()}
      </div>
    `;
  }

  function renderConsequenceBand(pageId) {
    if (pageId === "homepage") {
      return `
      <div class="ex-env-consequence-band" aria-label="Execution posture">
        <div><span>Commitment control</span><strong>Before commitment</strong></div>
        <div><span>Reviewable evidence</span><strong>Under oversight</strong></div>
        <div><span>Audit continuity</span><strong>When required</strong></div>
        <div><span>Oversight</span><strong>Before execution continues</strong></div>
      </div>
    `;
    }
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
        ${renderConsequenceBand("proof")}
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
    if (document.body.classList.contains("ex-standard-homepage")) return;
    if (document.getElementById("ex-env-jsonld")) return;
    const pageId = resolvePageId();
    const isPublicProduct = PUBLIC_PRODUCT_FLOW.some((item) => item.id === pageId);
    const isHomepage = pageId === "homepage";
    const isEntry = isHomepage;
    const payload = isEntry
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: AI_CLARITY.PRODUCT,
          description: ENTRY_SEMANTICS.META_DESCRIPTION,
          knowsAbout: Object.keys(ENTRY_SEMANTICS.AUTHORITY),
          slogan: ENTRY_SEMANTICS.LAYER_LABEL,
          additionalProperty: Object.entries(ENTRY_SEMANTICS.AUTHORITY).map(([name, value]) => ({
            "@type": "PropertyValue",
            name,
            value
          }))
        }
      : {
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
    if (!meta.content || isEntry) {
      meta.content = isEntry ? ENTRY_SEMANTICS.META_DESCRIPTION : desc;
    }

    let keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (isEntry) {
      if (!keywordsMeta) {
        keywordsMeta = document.createElement("meta");
        keywordsMeta.name = "keywords";
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.content = ENTRY_SEMANTICS.META_KEYWORDS;
    }

    if (isEntry) {
      const ogPairs = [
        ["og:title", `${AI_CLARITY.PRODUCT} — ${ENTRY_SEMANTICS.LAYER_LABEL}`],
        ["og:description", ENTRY_SEMANTICS.META_DESCRIPTION],
        ["og:type", "website"]
      ];
      ogPairs.forEach(([property, content]) => {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute("property", property);
          document.head.appendChild(el);
        }
        el.content = content;
      });
      let titleEl = document.querySelector("title");
      if (!titleEl) {
        titleEl = document.createElement("title");
        document.head.appendChild(titleEl);
      }
      titleEl.textContent = `${AI_CLARITY.PRODUCT} — operational governance continuity layer`;
    }

    if (pageId === "execution" && !isEntry) {
      const execDesc =
        "Live operational governance shell for institutional execution evaluation, exposure assessment, proof continuity, and execution authorization.";
      if (!meta.content || meta.content.includes("Define an outcome")) {
        meta.content = execDesc;
      }
      let titleEl = document.querySelector("title");
      if (titleEl) {
        titleEl.textContent = `${AI_CLARITY.PRODUCT} — Live Governance Shell`;
      }
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

  function mountFooter(pageId) {
    const html = renderFooter(pageId || resolvePageId());
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

  function mountConsequenceBand(pageId) {
    if (document.querySelector(".ex-env-consequence-band")) return;
    const host = document.querySelector("[data-ex-env-consequence]");
    if (host) host.innerHTML = renderConsequenceBand(pageId || resolvePageId());
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

  function isPublicationSurface(pageId) {
    if (pageId === "homepage" && document.body.classList.contains("ex-standard-homepage")) {
      return true;
    }
    return (
      (pageId === "demonstration" || pageId === "request") &&
      document.body.classList.contains("ex-institutional-publication")
    );
  }

  function isPublicationAnnexPage(pageId) {
    return isPublicationSurface(pageId) && pageId !== "homepage";
  }

  function mount() {
    if (!document.body.classList.contains("ex-institutional-env")) return;
    const pageId = resolvePageId();
    if (pageId === "homepage" && !document.body.classList.contains("ex-standard-homepage")) {
      document.body.classList.add("ex-env-entry");
    }
    mountAiMeta();
    if (!isPublicationSurface(pageId)) {
      mountHeader(pageId);
    }
    mountFooter(pageId);
    if (!isPublicationSurface(pageId)) {
      mountHomeHero();
      mountConsequenceBand(pageId);
      mountDemoFlowLadder(-1);
      mountProofIntro();
      mountOnboardingSteps();
    }
    document.dispatchEvent(new CustomEvent("executia:institutional-env:refresh"));
  }

  global.EXECUTIA_INSTITUTIONAL_ENV = Object.freeze({
    FLOW,
    PUBLIC_PRODUCT_FLOW,
    FOOTER_LINKS,
    AI_CLARITY,
    ENTRY_SEMANTICS,
    DEMO_FLOW,
    mount,
    mountAiMeta,
    mountDemoFlowLadder,
    renderHeader,
    renderFooter,
    renderHomeHero,
    renderEntryHeroShort,
    renderEntryOperationalExposure,
    renderEntryWhyInstitutionsReview,
    renderEntryProofCases,
    renderEntryGovernanceContinuitySequence,
    renderEntryLegitimacyDesignedFor,
    renderEntryPressureLine,
    renderEntryContinuityChain,
    renderEntrySemanticAuthorityDefinition,
    renderEntryDefinedFor,
    renderEntrySemanticContinuitySection,
    renderEntryInevitabilityBeforeCta,
    ENTRY_PRESSURE_LINES,
    ENTRY_CONTINUITY_CHAIN,
    EXECUTION_LIVE_GOVERNANCE_FLOW,
    EXECUTION_CONSEQUENCE_STATES,
    EXECUTION_PATHWAY_ENGINE,
    renderInstitutionalProofCases,
    renderInevitabilityBlock,
    renderInstitutionalLegitimacy,
    renderAiRecognitionAuthority,
    renderDesignedForSemantic,
    renderInstitutionalTrustStatement,
    renderEntryCtas,
    renderConsequenceBand,
    renderDemoFlowLadder,
    renderProofIntro,
    renderOnboardingSteps,
    resolvePageId
  });

  global.EXECUTIA_INSTITUTIONAL_ENVIRONMENT = global.EXECUTIA_INSTITUTIONAL_ENV;

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
