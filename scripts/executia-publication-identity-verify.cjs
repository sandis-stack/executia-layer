#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Identity — registry vocabulary verification. */

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

const PUBLICATION_PAGES = [
  "public/index.html",
  "public/demonstration/index.html",
  "public/request-pilot/index.html"
];

const home = read("public/index.html");
const demo = read("public/demonstration/index.html");
const pilot = read("public/request-pilot/index.html");
const envJs = read("public/components/executia-institutional-environment.js");

const REQUIRED = [
  { label: "Document", value: "EXECUTIA Governance Standard", pages: ["public/index.html"] },
  { label: "Document", value: "Execution Control Map", pages: ["public/demonstration/index.html"] },
  { label: "Document", value: "Pilot Request Publication", pages: ["public/request-pilot/index.html"] },
  { label: "Classification", value: "Governance Standard", pages: ["public/index.html"] },
  { label: "Classification", value: "Evidence Annex", pages: ["public/demonstration/index.html"] },
  { label: "Classification", value: "Administrative Annex", pages: ["public/request-pilot/index.html"] },
  { label: "Document Status", value: "Published", pages: PUBLICATION_PAGES },
  { label: "Revision", value: "V1", pages: PUBLICATION_PAGES },
  { label: "Authority", value: "EXECUTIA CTO", pages: PUBLICATION_PAGES },
  { label: "Release", value: "EXECUTIA-STANDARD-V1", pages: PUBLICATION_PAGES },
  { label: "Document State", value: "FINAL", pages: PUBLICATION_PAGES }
];

for (const rel of PUBLICATION_PAGES) {
  const html = read(rel);
  if (html.includes("Purpose")) fail(`${rel} must not expose Purpose metadata`);
  if (html.includes("Defined for")) fail(`${rel} must not expose Defined for metadata`);
  if (html.includes("The Execution Governance Standard")) fail(`${rel} must not use legacy standard title`);
}

function hasRegistryPair(html, label, value) {
  const pattern = new RegExp(`<span class="ex-publication-registry-label">${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</span>\\s*<p>${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`);
  return pattern.test(html);
}

for (const item of REQUIRED) {
  for (const rel of item.pages) {
    const html = read(rel);
    if (!hasRegistryPair(html, item.label, item.value)) {
      fail(`${rel} missing registry pair: ${item.label} → ${item.value}`);
    }
  }
}

const identityHome = extractRegistry(home, "ex-publication-identity-registry");
for (const page of [demo, pilot]) {
  if (extractRegistry(page, "ex-publication-identity-registry") !== identityHome) {
    fail("publication identity registry must match Standard across all pages");
  }
}

if (!envJs.includes('document: "Execution Control Map"')) {
  fail("demonstration footer document must be Execution Control Map");
}

if (!envJs.includes('document: "Pilot Request Publication"')) {
  fail("request pilot footer document must be Pilot Request Publication");
}

if (failed) process.exit(1);
console.log("EXECUTIA publication identity verification passed.");
