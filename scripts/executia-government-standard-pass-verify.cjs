#!/usr/bin/env node
"use strict";

/** EXECUTIA Government Standard Pass — final publication perception verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public/components/executia-institutional-environment.css"), "utf8");

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
  "Execution Governance Standard",
  "Governance First",
  "Governed AI",
  "content: \"L1\"",
  "content: \"L2\"",
  "content: \"L3\"",
  "content: \"L4\"",
  "<h4>Government</h4>",
  "<p>Government</p>",
  "<h4>Investors</h4>",
  "<p>Investors</p>",
  "exStandardEndOfDocument",
  "End of Document",
  "ex-standard-hero",
  "The Governance Standard"
];

for (const phrase of FORBIDDEN) {
  if (home.includes(phrase)) fail(`government standard pass forbidden residue: ${phrase}`);
}

if (css.includes('content: "EXECUTIA™"')) fail("publication CSS must not render EXECUTIA trademark mark");
if (!css.includes('content: "EXECUTIA"')) fail("publication brand must render EXECUTIA without trademark mark");

if (!home.includes("Governance Precedes Execution")) {
  fail("homepage missing standard principle: Governance Precedes Execution");
}

if (!home.includes("<h4>Classification</h4>\n            <p>Governance Standard</p>") &&
    !/<h4>Classification<\/h4>\s*<p>Governance Standard<\/p>/.test(home)) {
  fail("homepage missing classification: Governance Standard");
}

const doctrine = extractSection(home, "exStandardStructure");
if (!doctrine.includes("Execution Order")) fail("homepage missing Execution Order section label");
for (const row of [
  { index: "01", label: "Validation" },
  { index: "02", label: "Control" },
  { index: "03", label: "Proof" },
  { index: "04", label: "Commitment" },
  { index: "05", label: "Execution" }
]) {
  const pattern = new RegExp(`<h4>${row.index}</h4>\\s*<p>${row.label}</p>`);
  if (!pattern.test(doctrine)) fail(`execution order missing registry row: ${row.index} ${row.label}`);
}

const layers = extractSection(home, "exStandardLayers");
for (const layer of ["Validation Layer", "Control Layer", "Proof Layer", "Committed Layer"]) {
  const pattern = new RegExp(`<h4>${layer}</h4>\\s*<p>${layer}</p>`);
  if (!pattern.test(layers)) fail(`standard layers missing registry row: ${layer}`);
}
if (layers.includes("ex-arch-infra-stack")) fail("standard layers must not use engineering stack notation");

const applicability = extractSection(home, "exStandardApplicability");
for (const item of ["Public Administration", "Enterprise", "Regulated Capital", "Governed Systems"]) {
  const pattern = new RegExp(`<h4>${item}</h4>\\s*<p>${item}</p>`);
  if (!pattern.test(applicability)) fail(`standard applicability missing registry row: ${item}`);
}

const identity = extractSection(home, "exStandardAuthority");
for (const row of [
  { label: "Document Status", value: "Published" },
  { label: "Revision", value: "V1" },
  { label: "Authority", value: "EXECUTIA CTO" },
  { label: "Release", value: "EXECUTIA-STANDARD-V1" }
]) {
  const pattern = new RegExp(`<h4>${row.label}</h4>\\s*<p>${row.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`);
  if (!pattern.test(identity)) fail(`publication identity missing registry row: ${row.label} → ${row.value}`);
}

const terminal = extractSection(home, "exStandardDocumentState");
if (!/<h4>Document State<\/h4>\s*<p>FINAL<\/p>/.test(terminal)) {
  fail("document state missing registry row: Document State → FINAL");
}

if (!home.includes("EXECUTIA Governance Standard")) fail("homepage missing document title EXECUTIA Governance Standard");

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
console.log("EXECUTIA government standard pass verification passed.");
