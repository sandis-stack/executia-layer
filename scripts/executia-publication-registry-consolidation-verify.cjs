#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Registry Consolidation — single continuous document verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function extractSection(html, sectionId) {
  const start = html.indexOf(`id="${sectionId}"`);
  if (start < 0) return "";
  const sectionStart = html.lastIndexOf("<section", start);
  const sectionEnd = html.indexOf("</section>", start);
  if (sectionStart < 0 || sectionEnd < 0) return "";
  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

function countMatches(html, pattern) {
  const matches = html.match(pattern);
  return matches ? matches.length : 0;
}

const identityLabelCount = countMatches(home, />Publication Identity</g);
if (identityLabelCount !== 1) {
  fail(`homepage must contain exactly one Publication Identity section (found ${identityLabelCount})`);
}

if (home.includes("data-ex-env-footer")) {
  fail("homepage must not mount duplicate publication metadata footer");
}

const identity = extractSection(home, "exStandardAuthority");
if (!identity) fail("homepage missing exStandardAuthority publication identity section");

for (const forbidden of ["Purpose", "Defined for", "Defined For", "Document State"]) {
  if (identity.includes(`<h4>${forbidden}</h4>`)) {
    fail(`publication identity must not contain: ${forbidden}`);
  }
}

const documentLabelCount = countMatches(home, /<h4>Document<\/h4>/g);
if (documentLabelCount !== 1) {
  fail(`Document metadata must appear exactly once on homepage (found ${documentLabelCount})`);
}

const REQUIRED_IDENTITY = [
  { label: "Document Status", value: "Published" },
  { label: "Revision", value: "V1" },
  { label: "Authority", value: "EXECUTIA CTO" },
  { label: "Release", value: "EXECUTIA-STANDARD-V1" }
];

for (const item of REQUIRED_IDENTITY) {
  const pattern = new RegExp(
    `<h4>${item.label}</h4>\\s*<p>${item.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`
  );
  if (!pattern.test(identity)) fail(`publication identity missing registry pair: ${item.label} → ${item.value}`);
}

const terminal = extractSection(home, "exStandardDocumentState");
if (!terminal) fail("homepage missing exStandardDocumentState terminal section");
if (!/<h4>Document State<\/h4>\s*<p>FINAL<\/p>/.test(terminal)) {
  fail("document state missing registry pair: Document State → FINAL");
}

const ORDER = [
  "exStandardHero",
  "exStandardStructure",
  "exStandardLayers",
  "exStandardApplicability",
  "exStandardPublicationSequence",
  "exStandardAuthority",
  "exStandardDocumentState"
];
let last = -1;
for (const id of ORDER) {
  const i = home.indexOf(`id="${id}"`);
  if (i < 0) fail(`homepage section order missing: ${id}`);
  if (i <= last) fail(`homepage section order violation: ${id}`);
  last = i;
}

if (failed) process.exit(1);
console.log("EXECUTIA publication registry consolidation verification passed.");
