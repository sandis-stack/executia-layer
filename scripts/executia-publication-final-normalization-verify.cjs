#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Final Normalization — registry-only structure and chain verification. */

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

const FORBIDDEN = [
  "Why It Matters",
  "Next action",
  "Next Action",
  "Evaluate the EXECUTIA Standard",
  "Review execution governance applicability",
  "Request pilot evaluation",
  "Evaluate",
  "Review execution governance",
  "Request pilot",
  "exStandardToday",
  "exStandardWhatChanges",
  "exStandardWhyMatters",
  "exStandardCta",
  "EXECUTIA prevents this",
  "Most systems execute first",
  "What Changes",
  "Institutional Impact",
  "Regulated decisions need proof",
  "Leaders need one execution truth",
  "Capital requires provable governance",
  "Autonomous systems must not act",
  "Standard Principle",
  "Governance Precedes Execution",
  "Standard Layers",
  "Standard Applicability",
  "Publication Sequence"
];

for (const phrase of FORBIDDEN) {
  if (home.includes(phrase)) fail(`homepage must not contain persuasion residue: ${phrase}`);
}

const structure = extractSection(home, "exStandardStructure");
const chain = extractSection(home, "exStandardPublicationChain");

if (!structure) fail("homepage missing exStandardStructure section");
if (!chain) fail("homepage missing exStandardPublicationChain section");

if (!home.includes("Execution Standard Structure")) fail("homepage missing Execution Standard Structure section label");
if (!home.includes("Publication Chain")) fail("homepage missing Publication Chain section label");

const STRUCTURE = [
  { index: "01", label: "Governance" },
  { index: "02", label: "Validation" },
  { index: "03", label: "Control" },
  { index: "04", label: "Proof" },
  { index: "05", label: "Commitment" },
  { index: "06", label: "Execution" }
];
for (const row of STRUCTURE) {
  const pattern = new RegExp(`<span class="ex-publication-registry-label">${row.index}</span>\\s*<p>${row.label}</p>`);
  if (!pattern.test(structure)) fail(`standard structure missing registry row: ${row.index} ${row.label}`);
}

const CHAIN = [
  { index: "01", label: "Standard" },
  { index: "02", label: "Evidence Annex" },
  { index: "03", label: "Administrative Annex" }
];
for (const row of CHAIN) {
  const pattern = new RegExp(`<span class="ex-publication-registry-label">${row.index}</span>\\s*<p>${row.label}</p>`);
  if (!pattern.test(chain)) fail(`standard publication chain missing registry row: ${row.index} ${row.label}`);
}

if (!structure.includes("ex-publication-structure-registry")) {
  fail("standard structure must use publication structure registry styling");
}
if (!chain.includes("ex-publication-sequence-registry")) {
  fail("standard publication chain must use publication sequence registry styling");
}

const ORDER = [
  "exStandardHero",
  "exStandardStructure",
  "exStandardPublicationChain",
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
console.log("EXECUTIA publication final normalization verification passed.");
