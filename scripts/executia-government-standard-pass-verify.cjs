#!/usr/bin/env node
"use strict";

/** EXECUTIA Government Standard Pass — final publication perception verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public/components/executia-institutional-environment.css"), "utf8");
const REG_LABEL = '<span class="ex-publication-registry-label">';

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
  "EXECUTIA™",
  "Governance Standard",
  "EXECUTIA Governance Standard",
  "Governance First",
  "Governed AI",
  "content: \"L1\"",
  "content: \"L2\"",
  "content: \"L3\"",
  "content: \"L4\"",
  '<span class="ex-publication-registry-label">Government</span>',
  "<p>Government</p>",
  '<span class="ex-publication-registry-label">Investors</span>',
  "<p>Investors</p>",
  "exStandardEndOfDocument",
  "End of Document",
  "ex-standard-hero",
  "The Governance Standard",
  "Standard Principle",
  "Governance Precedes Execution",
  "Execution Order",
  "Standard Layers",
  "Standard Applicability",
  "Publication Sequence",
  "Validation Layer",
  "Committed Layer",
  "Public Administration",
  "Regulated Capital",
  "Governed Systems"
];

for (const phrase of FORBIDDEN) {
  if (home.includes(phrase)) fail(`government standard pass forbidden residue: ${phrase}`);
}

if (css.includes('content: "EXECUTIA™"')) fail("publication CSS must not render EXECUTIA trademark mark");
if (css.includes("ex-publication-document-open::before") && !css.includes("ex-publication-document-open::before {\n  content: none")) {
  const openBefore = css.match(/ex-publication-document-open::before[\s\S]*?\}/g) || [];
  for (const block of openBefore) {
    if (block.includes('content: "EXECUTIA"')) fail("publication document open must not render EXECUTIA branding block");
  }
}

if (!home.includes(`${REG_LABEL}Classification</span>`) &&
    !/<span class="ex-publication-registry-label">Classification<\/span>\s*<p>Execution Standard<\/p>/.test(home)) {
  fail("homepage missing classification: Execution Standard");
}

const structure = extractSection(home, "exStandardStructure");
if (!structure.includes("Execution Standard Structure")) fail("homepage missing Execution Standard Structure section label");
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

const chain = extractSection(home, "exStandardPublicationChain");
if (!chain.includes("Publication Chain")) fail("homepage missing Publication Chain section label");
for (const row of [
  { index: "01", label: "Standard" },
  { index: "02", label: "Evidence Annex" },
  { index: "03", label: "Administrative Annex" }
]) {
  const pattern = new RegExp(`<span class="ex-publication-registry-label">${row.index}</span>\\s*<p>${row.label}</p>`);
  if (!pattern.test(chain)) fail(`standard publication chain missing registry row: ${row.index} ${row.label}`);
}

const identity = extractSection(home, "exStandardAuthority");
for (const row of [
  { label: "Document Status", value: "Published" },
  { label: "Publication Date", value: "2026-05-31" },
  { label: "Revision", value: "V1" },
  { label: "Authority", value: "EXECUTIA CTO" },
  { label: "Release", value: "EXECUTIA-STANDARD-V1" }
]) {
  const pattern = new RegExp(`<span class="ex-publication-registry-label">${row.label}</span>\\s*<p>${row.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`);
  if (!pattern.test(identity)) fail(`publication identity missing registry row: ${row.label} → ${row.value}`);
}

const terminal = extractSection(home, "exStandardDocumentState");
if (!/<span class="ex-publication-registry-label">Document State<\/span>\s*<p>FINAL<\/p>/.test(terminal)) {
  fail("document state missing registry row: Document State → FINAL");
}

if (!home.includes("EXECUTIA Standard")) fail("homepage missing document title EXECUTIA Standard");

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
console.log("EXECUTIA government standard pass verification passed.");
