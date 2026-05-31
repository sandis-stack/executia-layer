#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Final Normalization — registry-only applicability and sequence verification. */

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
  "Autonomous systems must not act"
];

for (const phrase of FORBIDDEN) {
  if (home.includes(phrase)) fail(`homepage must not contain persuasion residue: ${phrase}`);
}

const applicability = extractSection(home, "exStandardApplicability");
const sequence = extractSection(home, "exStandardPublicationSequence");

if (!applicability) fail("homepage missing exStandardApplicability section");
if (!sequence) fail("homepage missing exStandardPublicationSequence section");

if (!home.includes("Standard Applicability")) fail("homepage missing Standard Applicability section label");
if (!home.includes("Publication Sequence")) fail("homepage missing Publication Sequence section label");

const APPLICABILITY = ["Public Administration", "Enterprise", "Regulated Capital", "Governed Systems"];
for (const item of APPLICABILITY) {
  const pattern = new RegExp(`<h4>${item}</h4>\\s*<p>${item}</p>`);
  if (!pattern.test(applicability)) fail(`standard applicability missing registry row: ${item}`);
}

const SEQUENCE = [
  { index: "01", label: "Standard" },
  { index: "02", label: "Evidence Annex" },
  { index: "03", label: "Administrative Annex" }
];
for (const row of SEQUENCE) {
  const pattern = new RegExp(`<h4>${row.index}</h4>\\s*<p>${row.label}</p>`);
  if (!pattern.test(sequence)) fail(`publication sequence missing registry row: ${row.index} ${row.label}`);
}

if (!applicability.includes("ex-publication-applicability-registry")) {
  fail("standard applicability must use publication applicability registry styling");
}
if (!sequence.includes("ex-publication-sequence-registry")) {
  fail("publication sequence must use publication sequence registry styling");
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
console.log("EXECUTIA publication final normalization verification passed.");
