#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Metadata — registry-only identity verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const IDENTITY_PAGES = [
  { label: "standard", rel: "public/index.html" },
  { label: "evidence-annex", rel: "public/demonstration/index.html" },
  { label: "administrative-annex", rel: "public/request-pilot/index.html" }
];

const REQUIRED_IDENTITY = [
  { label: "Document Status", value: "Published", pages: ["public/index.html"] },
  { label: "Revision", value: "V1", pages: ["public/index.html"] },
  { label: "Release", value: "EXECUTIA-STANDARD-V1", pages: ["public/index.html"] },
  { label: "Document State", value: "FINAL", pages: ["public/index.html"] },
  { label: "Standard", value: "EXECUTIA-STANDARD-V1", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Version", value: "V1", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Status", value: "Published", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Authority", value: "EXECUTIA CTO", pages: IDENTITY_PAGES.map((p) => p.rel) },
  { label: "Purpose", value: "Execution Governance", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Defined for", value: "Government / Enterprise / AI", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Annex Identifier", value: "Annex A", pages: ["public/demonstration/index.html"] },
  { label: "Document", value: "Execution Control Map", pages: ["public/demonstration/index.html"] },
  { label: "Annex Identifier", value: "Annex B", pages: ["public/request-pilot/index.html"] },
  { label: "Document", value: "Pilot Request Publication", pages: ["public/request-pilot/index.html"] }
];

const FORBIDDEN_MARKETING = [
  "infrastructure",
  "validation, proof",
  "accountability before execution",
  "investors",
  "governed AI execution",
  "Record administrative scope",
  "Control map evidence by sector"
];

const FORBIDDEN_IDENTITY_LABELS = ["Reference", "Exhibit"];

function extractIdentityValues(html) {
  const blocks = [];
  const headerStart = html.indexOf('class="ex-publication-header');
  if (headerStart >= 0) {
    const headerEnd = html.indexOf("</header>", headerStart);
    if (headerEnd > headerStart) blocks.push(html.slice(headerStart, headerEnd));
  }
  const authorityStart = html.indexOf('id="exStandardAuthority"');
  if (authorityStart >= 0) {
    const sectionEnd = html.indexOf("</section>", authorityStart);
    if (sectionEnd > authorityStart) blocks.push(html.slice(authorityStart, sectionEnd));
  }
  const values = [];
  for (const block of blocks) {
    const registryStart = block.indexOf("ex-publication-identity-registry");
    if (registryStart < 0) continue;
    const slice = block.slice(registryStart);
    const pattern = /<h4>[^<]+<\/h4>\s*<p>([^<]*)<\/p>/g;
    let match;
    while ((match = pattern.exec(slice))) {
      values.push(match[1].trim());
    }
  }
  return values;
}

function wordCount(value) {
  return value.split(/\s+/).filter(Boolean).length;
}

function hasRegistryPair(html, label, value) {
  const pattern = new RegExp(
    `<h4>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h4>\\s*<p>${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`
  );
  return pattern.test(html);
}

for (const page of IDENTITY_PAGES) {
  const html = read(page.rel);
  if (page.rel === "public/index.html") {
    if (!html.includes("ex-publication-document-registry")) {
      fail("standard page missing publication document registry class");
    }
    if (!html.includes("ex-publication-identity-registry")) {
      fail("standard page missing publication identity registry class");
    }
    const identitySection = html.slice(html.indexOf('id="exStandardAuthority"'), html.indexOf("</section>", html.indexOf('id="exStandardAuthority"')));
    for (const forbidden of ["Purpose", "Defined for"]) {
      if (identitySection.includes(`<h4>${forbidden}</h4>`)) {
        fail(`standard publication identity must not contain: ${forbidden}`);
      }
    }
    continue;
  }

  if (!html.includes("ex-publication-identity-registry")) {
    fail(`${page.label} missing publication identity registry class`);
    continue;
  }

  for (const label of FORBIDDEN_IDENTITY_LABELS) {
    const identityStart = html.indexOf("ex-publication-identity-registry");
    const identityEnd = html.indexOf("</header>", identityStart);
    const identityBlock =
      identityEnd > identityStart ? html.slice(identityStart, identityEnd) : html.slice(identityStart, identityStart + 2500);
    if (identityBlock.includes(`<h4>${label}</h4>`)) {
      fail(`${page.label} identity block must not contain descriptive label: ${label}`);
    }
  }

  for (const value of extractIdentityValues(html)) {
    if (wordCount(value) > 5) {
      fail(`${page.label} identity value exceeds five words: ${value}`);
    }
    if (/[.]/.test(value)) {
      fail(`${page.label} identity value must not contain periods: ${value}`);
    }
    if (/—/.test(value)) {
      fail(`${page.label} identity value must not contain long dashes: ${value}`);
    }
    for (const phrase of FORBIDDEN_MARKETING) {
      if (value.toLowerCase().includes(phrase.toLowerCase())) {
        fail(`${page.label} identity value contains marketing phrase: ${value}`);
      }
    }
  }
}

for (const item of REQUIRED_IDENTITY) {
  for (const rel of item.pages) {
    const html = read(rel);
    if (!hasRegistryPair(html, item.label, item.value)) {
      fail(`${rel} missing identity registry pair: ${item.label} → ${item.value}`);
    }
  }
}

if (failed) process.exit(1);
console.log("EXECUTIA publication metadata verification passed.");
