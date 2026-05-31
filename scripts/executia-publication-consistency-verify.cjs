#!/usr/bin/env node
"use strict";

/** EXECUTIA Cross-page publication consistency audit. */

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

function extractBlock(html, sectionId) {
  const start = html.indexOf(`id="${sectionId}"`);
  if (start < 0) return "";
  const sectionStart = html.lastIndexOf("<section", start);
  const sectionEnd = html.indexOf("</section>", start);
  if (sectionStart < 0 || sectionEnd < 0) return "";
  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

const home = read("public/index.html");
const demo = read("public/demonstration/index.html");
const pilot = read("public/request-pilot/index.html");
const css = read("public/components/executia-institutional-environment.css");
const envJs = read("public/components/executia-institutional-environment.js");

const PUBLICATION_SEQUENCE = [
  "<h4>Document</h4>",
  "<p>The Execution Governance Standard</p>",
  "<h4>Standard</h4>",
  "<p>EXECUTIA-STANDARD-V1</p>",
  "<h4>Annex Identifier</h4>",
  "<p>Annex A</p>",
  "<h4>Document</h4>",
  "<p>Execution Control Map</p>",
  "<h4>Annex Identifier</h4>",
  "<p>Annex B</p>",
  "<h4>Document</h4>",
  "<p>Pilot Request Publication</p>"
];

const FOOTER_LABELS = ["Standard", "Status", "Published", "Authority", "EXECUTIA CTO", "Document"];

const PUB_TOKENS = [
  "--ex-pub-body: 13px",
  "--ex-pub-label: 9px",
  "--ex-pub-line: 1.55",
  "--ex-pub-border:",
  "--ex-pub-row-pad:",
  "--ex-pub-label-col: 6.5rem"
];

for (const token of PUB_TOKENS) {
  if (!css.includes(token)) fail(`publication token missing from CSS: ${token}`);
}

if (!css.includes("body.ex-institutional-publication .ex-standard-publication-document")) {
  fail("annex pages missing shared publication document envelope");
}

if (!css.includes("body.ex-institutional-publication .ex-publication-registry-row")) {
  fail("annex pages missing shared publication registry row styling");
}

if (!home.includes("ex-standard-publication-document")) {
  fail("homepage missing publication envelope");
}

if (home.includes("exStandardEndOfDocument")) {
  fail("homepage must not use separate end of document section");
}

for (const page of [home, demo, pilot]) {
  if (page.includes("data-ex-env-header")) fail("publication surface must not mount website header");
  if (page.includes("Publication Navigation")) fail("publication surface must not expose publication navigation section");
  if (page.includes("ex-env-footer-flow")) fail("publication surface must not expose website footer navigation");
}

for (const page of [demo, pilot]) {
  if (!page.includes("ex-standard-publication-document")) fail("annex missing publication envelope");
  if (!page.includes("ex-institutional-publication")) fail("annex missing publication body class");
  if (!page.includes("ex-publication-header")) fail("annex missing shared publication header class");
  if (!page.includes("ex-publication-metadata")) fail("annex missing shared publication metadata class");
  if (!page.includes("ex-publication-catalog")) fail("annex missing shared publication catalog class");
  if (page.includes("executia-assessment-demo.css")) fail("annex must not load assessment demo stylesheet");
}

function extractRegistryBlock(html, sectionId) {
  const section = extractBlock(html, sectionId);
  const start = section.indexOf('<div class="ex-standard-authority ex-standard-registry">');
  if (start < 0) return "";
  const end = section.indexOf("</div>", start);
  let depth = 1;
  let pos = start + '<div class="ex-standard-authority ex-standard-registry">'.length;
  while (depth > 0 && pos < section.length) {
    const nextOpen = section.indexOf("<div", pos);
    const nextClose = section.indexOf("</div>", pos);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 4;
    } else {
      depth -= 1;
      pos = nextClose + 6;
    }
  }
  return section.slice(start, pos).replace(/\s+/g, " ").trim();
}

const demoSequence = extractRegistryBlock(demo, "exDemoPublicationSequence");
const pilotSequence = extractRegistryBlock(pilot, "exPilotPublicationSequence");

if (demoSequence !== pilotSequence) {
  fail("publication sequence must match between demonstration and request pilot");
}

for (const fragment of PUBLICATION_SEQUENCE) {
  if (!demoSequence.includes(fragment)) fail(`publication sequence missing: ${fragment}`);
}

for (const label of FOOTER_LABELS) {
  if (!envJs.includes(label)) fail(`footer metadata language missing: ${label}`);
}

if (!envJs.includes("Execution Control Map")) {
  fail("demonstration footer document label missing from institutional environment");
}

if (!envJs.includes("Pilot Request Publication")) {
  fail("request pilot footer document label missing from institutional environment");
}

if (!envJs.includes("Execution Governance Standard")) {
  fail("homepage footer document label missing from institutional environment");
}

if (!envJs.includes("isPublicationSurface")) {
  fail("institutional environment must define publication surface guard");
}

for (const page of [demo, pilot]) {
  for (const forbidden of ["<button", "<form", "ex-inst-hero-cta"]) {
    if (page.includes(forbidden)) fail(`annex forbidden surface pattern: ${forbidden}`);
  }
}

if (failed) process.exit(1);
console.log("EXECUTIA cross-page publication consistency audit passed.");
