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

function normalize(html) {
  return html.replace(/\s+/g, " ").trim();
}

function extractRegistry(html, className) {
  const marker = `<div class="ex-standard-authority ex-standard-registry ${className}">`;
  const start = html.indexOf(marker);
  if (start < 0) return "";
  let depth = 1;
  let pos = start + marker.length;
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 4;
    } else {
      depth -= 1;
      pos = nextClose + 6;
    }
  }
  return normalize(html.slice(start, pos));
}

const IDENTITY_PAGES = [
  { label: "standard", rel: "public/index.html" },
  { label: "evidence-annex", rel: "public/demonstration/index.html" },
  { label: "administrative-annex", rel: "public/request-pilot/index.html" }
];

const REQUIRED_IDENTITY = [
  { label: "Document Status", value: "Published", pages: IDENTITY_PAGES.map((p) => p.rel) },
  { label: "Publication Date", value: "2026-05-31", pages: IDENTITY_PAGES.map((p) => p.rel) },
  { label: "Revision", value: "V1", pages: IDENTITY_PAGES.map((p) => p.rel) },
  { label: "Release", value: "EXECUTIA-STANDARD-V1", pages: IDENTITY_PAGES.map((p) => p.rel) },
  { label: "Document State", value: "FINAL", pages: IDENTITY_PAGES.map((p) => p.rel) },
  { label: "Authority", value: "EXECUTIA CTO", pages: IDENTITY_PAGES.map((p) => p.rel) },
  { label: "Document", value: "EXECUTIA Governance Standard", pages: ["public/index.html"] },
  { label: "Classification", value: "Governance Standard", pages: ["public/index.html"] },
  { label: "Status", value: "Published", pages: ["public/index.html", "public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Document", value: "Execution Control Map", pages: ["public/demonstration/index.html"] },
  { label: "Classification", value: "Evidence Annex", pages: ["public/demonstration/index.html"] },
  { label: "Document", value: "Pilot Request Publication", pages: ["public/request-pilot/index.html"] },
  { label: "Classification", value: "Administrative Annex", pages: ["public/request-pilot/index.html"] }
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

function hasRegistryPair(html, label, value) {
  const pattern = new RegExp(
    `<span class="ex-publication-registry-label">${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</span>\\s*<p>${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`
  );
  return pattern.test(html);
}

const home = read("public/index.html");
const canonicalIdentity = extractRegistry(home, "ex-publication-identity-registry");
const canonicalSequence = extractRegistry(home, "ex-publication-sequence-registry");

for (const page of IDENTITY_PAGES) {
  const html = read(page.rel);
  if (!html.includes("ex-publication-identity-registry")) {
    fail(`${page.label} missing publication identity registry class`);
  }
  if (extractRegistry(html, "ex-publication-identity-registry") !== canonicalIdentity) {
    fail(`${page.label} publication identity must match Standard`);
  }
  if (extractRegistry(html, "ex-publication-sequence-registry") !== canonicalSequence) {
    fail(`${page.label} publication sequence must match Standard`);
  }
  for (const forbidden of ["Purpose", "Defined for", "ex-publication-header", "data-ex-env-footer"]) {
    if (html.includes(forbidden)) fail(`${page.label} must not contain: ${forbidden}`);
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

for (const page of IDENTITY_PAGES) {
  const html = read(page.rel);
  for (const phrase of FORBIDDEN_MARKETING) {
    if (html.toLowerCase().includes(phrase.toLowerCase())) {
      fail(`${page.label} contains marketing phrase: ${phrase}`);
    }
  }
}

if (failed) process.exit(1);
console.log("EXECUTIA publication metadata verification passed.");
