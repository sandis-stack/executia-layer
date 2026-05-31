#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Visual Hardening — dense institutional register verification. */

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

const articleEnd = home.indexOf("</article>");
const terminalStart = home.indexOf('id="exStandardDocumentState"');
const terminalEnd = home.indexOf("</section>", terminalStart);
if (terminalStart < 0 || terminalEnd < 0) fail("homepage missing exStandardDocumentState terminal section");
const afterTerminal = home.slice(terminalEnd + "</section>".length, articleEnd).replace(/\s+/g, "");
if (afterTerminal.length > 0) fail("homepage must not contain content after Document State");

for (const forbidden of [
  "data-ex-env-footer",
  "ex-standard-publication-footer",
  "ex-standard-hero",
  "ex-standard-headline",
  "ex-standard-hero-statement",
  "The Governance Standard",
  "ex-standard-brand"
]) {
  if (home.includes(forbidden)) fail(`visual hardening forbidden surface residue: ${forbidden}`);
}

if (home.includes("ex-standard-hero")) fail("visual hardening must not use hero styling class");

if (!home.includes("EXECUTIA Governance Standard")) fail("homepage missing document title EXECUTIA Governance Standard");
if (!/<h4>Document<\/h4>\s*<p>EXECUTIA Governance Standard<\/p>/.test(home)) {
  fail("document field must be EXECUTIA Governance Standard");
}

const identity = extractSection(home, "exStandardAuthority");
if (identity.includes("<h4>Document State</h4>")) {
  fail("Document State must not appear inside Publication Identity");
}

const terminal = extractSection(home, "exStandardDocumentState");
if (!/<h4>Document State<\/h4>\s*<p>FINAL<\/p>/.test(terminal)) {
  fail("terminal section missing registry pair: Document State → FINAL");
}

if (!home.includes("ex-publication-document-open")) fail("homepage must open as publication document registry");
if (!css.includes("--ex-pub-label-color")) fail("visual hardening label tokens missing");
if (!css.includes("--ex-pub-value-color")) fail("visual hardening value tokens missing");
if (!css.includes("--ex-pub-index-col")) fail("visual hardening sequence registry tokens missing");

const sequence = extractSection(home, "exStandardPublicationSequence");
const doctrine = extractSection(home, "exStandardStructure");
if (!sequence.includes("ex-publication-sequence-registry")) fail("publication sequence must use sequence registry");
if (!doctrine.includes("ex-publication-execution-order-registry")) fail("execution order must use sequence registry family");

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
console.log("EXECUTIA publication visual hardening verification passed.");
