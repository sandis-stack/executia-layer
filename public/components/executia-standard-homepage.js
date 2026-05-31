(function registerExecutiaStandardHomepage(global) {
  const WHAT_CHANGES = {
    today: [
      "Execute first, validate later",
      "Proof after the fact",
      "No single truth source",
      "Accountability fragmented"
    ],
    executia: [
      "Validate before execute",
      "Proof at commitment",
      "One authoritative truth",
      "Unified accountability"
    ],
    impact: [
      "Reduced execution risk",
      "Faster regulatory approval",
      "Lower audit cost",
      "Provable execution integrity"
    ]
  };

  const WHY_IT_MATTERS = [
    { title: "Government", text: "Regulated decisions need proof before execution — not after audit." },
    { title: "Enterprise", text: "Leaders need one execution truth, not controls rebuilt after failure." },
    { title: "Investors", text: "Capital requires provable governance before operational commitment." },
    { title: "AI", text: "Autonomous systems must not act without governed execution." }
  ];

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderList(items) {
    return `<ul class="ex-inst-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function renderWhatChangesHtml() {
    function col(title, items, modifier) {
      const mod = modifier ? ` ex-what-changes-col--${modifier}` : "";
      return `<div class="ex-what-changes-col${mod}"><h4>${escapeHtml(title)}</h4>${renderList(items)}</div>`;
    }
    return `<div class="ex-what-changes"><div class="ex-what-changes-grid ex-what-changes-grid--three">
      ${col("Today", WHAT_CHANGES.today, "today")}
      ${col("EXECUTIA", WHAT_CHANGES.executia, "executia")}
      ${col("Institutional Impact", WHAT_CHANGES.impact, "impact")}
    </div></div>`;
  }

  function renderWhyItMattersHtml() {
    const items = WHY_IT_MATTERS.map(
      (item) =>
        `<div class="ex-why-matters-item"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div>`
    ).join("");
    return `<div class="ex-why-matters">${items}</div>`;
  }

  function mountContent() {
    const changes = global.document.getElementById("exStandardWhatChangesMount");
    const matters = global.document.getElementById("exStandardWhyMattersMount");
    if (changes && !changes.innerHTML.trim()) changes.innerHTML = renderWhatChangesHtml();
    if (matters && !matters.innerHTML.trim()) matters.innerHTML = renderWhyItMattersHtml();
  }

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
    WHAT_CHANGES,
    WHY_IT_MATTERS,
    init,
    renderWhatChangesHtml,
    renderWhyItMattersHtml
  };
})(typeof window !== "undefined" ? window : globalThis);
