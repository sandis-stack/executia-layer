(function registerExecutiaStandardHomepage(global) {
  const DOCUMENT_TITLE = "EXECUTIA Governance Standard";

  const STANDARD_PRINCIPLE = "Governance Precedes Execution";

  const EXECUTION_ORDER = [
    { index: "01", label: "Validation" },
    { index: "02", label: "Control" },
    { index: "03", label: "Proof" },
    { index: "04", label: "Commitment" },
    { index: "05", label: "Execution" }
  ];

  const STANDARD_LAYERS = [
    "Validation Layer",
    "Control Layer",
    "Proof Layer",
    "Committed Layer"
  ];

  const STANDARD_APPLICABILITY = [
    "Public Administration",
    "Enterprise",
    "Regulated Capital",
    "Governed Systems"
  ];

  const PUBLICATION_SEQUENCE = [
    { index: "01", label: "Standard" },
    { index: "02", label: "Evidence Annex" },
    { index: "03", label: "Administrative Annex" }
  ];

  const PUBLICATION_IDENTITY = [
    { label: "Document Status", value: "Published" },
    { label: "Revision", value: "V1" },
    { label: "Authority", value: "EXECUTIA CTO" },
    { label: "Release", value: "EXECUTIA-STANDARD-V1" }
  ];

  const DOCUMENT_STATE = { label: "Document State", value: "FINAL" };

  function mountAiJsonLd() {
    if (global.document.getElementById("ex-standard-jsonld")) return;
    const payload = {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: "EXECUTIA",
      alternateName: DOCUMENT_TITLE,
      description: "Governance Standard",
      termCode: "EXECUTIA-STANDARD-V1"
    };
    const script = global.document.createElement("script");
    script.id = "ex-standard-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(payload);
    global.document.head.appendChild(script);
  }

  function init() {
    mountAiJsonLd();
  }

  global.EXECUTIA_STANDARD_HOMEPAGE = {
    DOCUMENT_TITLE,
    STANDARD_PRINCIPLE,
    EXECUTION_ORDER,
    STANDARD_LAYERS,
    STANDARD_APPLICABILITY,
    PUBLICATION_SEQUENCE,
    PUBLICATION_IDENTITY,
    DOCUMENT_STATE,
    init
  };
})(typeof window !== "undefined" ? window : globalThis);
