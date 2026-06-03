#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Structure — registry-only standard structure verification. */

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

const structure = extractSection(home, "exStandardStructure");

if (!structure) fail("homepage missing exStandardStructure section");

for (const forbidden of [
  "The EXECUTIA Standard",
  "Governance first.",
  "Governance First",
  "Governance Precedes Execution",
  "Standard Principle",
  "Execution Order",
  "Standard Layers",
  "Standard Applicability",
  "ex-standard-structure-statement",
  "exStandardPrincipleLabel",
  "<h4>↓</h4>"
]) {
  if (home.includes(forbidden)) fail(`homepage must not contain explanatory doctrine residue: ${forbidden}`);
}

if (!structure.includes("Execution Standard Structure")) fail("execution standard structure missing section label");

for (const row of [
  { index: "01", label: "Governance" },
  { index: "02", label: "Validation" },
  { index: "03", label: "Control" },
  { index: "04", label: "Proof" },
  { index: "05", label: "Commitment" },
  { index: "06", label: "Execution" }
]) {
  const pattern = new RegExp(`<span class="ex-publication-registry-label">${row.index}</span>\\s*<p>${row.label}</p>`);
  if (!pattern.test(structure)) fail(`standard structure missing registry row: ${row.index} ${row.label}`);
}

if (!structure.includes("ex-publication-structure-registry")) {
  fail("standard structure must use publication structure registry styling");
}

if (failed) process.exit(1);
console.log("EXECUTIA publication structure verification passed.");
