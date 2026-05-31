(function registerExecutiaStandardHomepage(global) {
  const STANDARD_APPLICABILITY = [
    "Government",
    "Enterprise",
    "Investors",
    "Governed AI"
  ];

  const PUBLICATION_SEQUENCE = [
    { index: "01", label: "Standard" },
    { index: "02", label: "Evidence Annex" },
    { index: "03", label: "Administrative Annex" }
  ];

  function mountAiJsonLd() {
    if (global.document.getElementById("ex-standard-jsonld")) return;
    const payload = {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: "EXECUTIA",
      alternateName: "Execution Governance Standard",
      description: "Execution Governance Standard",
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
    STANDARD_APPLICABILITY,
    PUBLICATION_SEQUENCE,
    init
  };
})(typeof window !== "undefined" ? window : globalThis);
