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

const home = read("public/index.html");
const demo = read("public/demonstration/index.html");
const pilot = read("public/request-pilot/index.html");
const css = read("public/components/executia-institutional-environment.css");
const envJs = read("public/components/executia-institutional-environment.js");

const PUBLICATION_SEQUENCE = extractRegistry(home, "ex-publication-sequence-registry");
const PUBLICATION_IDENTITY = extractRegistry(home, "ex-publication-identity-registry");

const PUB_TOKENS = [
  "--ex-pub-body: 13px",
  "--ex-pub-label: 8px",
  "--ex-pub-label-color: #576674",
  "--ex-pub-line: 1.31",
  "--ex-pub-border:",
  "--ex-pub-row-pad: 4px 11px",
  "--ex-pub-label-col: 6.5rem",
  "--ex-pub-index-col: 2.25rem",
  "--ex-pub-gutter: 22px"
];

for (const token of PUB_TOKENS) {
  if (!css.includes(token)) fail(`publication token missing from CSS: ${token}`);
}

if (!css.includes("body.ex-institutional-publication .ex-standard-publication-document")) {
  fail("annex pages missing shared publication document envelope");
}

if (!home.includes("ex-standard-publication-document")) {
  fail("homepage missing publication envelope");
}

if (!home.includes("exStandardDocumentState")) {
  fail("homepage must terminate with document state section");
}

for (const page of [home, demo, pilot]) {
  if (page.includes("data-ex-env-header")) fail("publication surface must not mount website header");
  if (page.includes("Publication Navigation")) fail("publication surface must not expose publication navigation section");
  if (page.includes("ex-env-footer-flow")) fail("publication surface must not expose website footer navigation");
  if (page.includes("data-ex-env-footer")) fail("publication surface must not mount footer metadata");
}

for (const page of [demo, pilot]) {
  if (!page.includes("ex-standard-publication-document")) fail("annex missing publication envelope");
  if (!page.includes("ex-institutional-publication")) fail("annex missing publication body class");
  if (!page.includes("ex-publication-document-open")) fail("annex missing publication document open section");
  if (!page.includes("ex-standard-block--terminal")) fail("annex missing terminal document state section");
  if (page.includes("executia-assessment-demo.css")) fail("annex must not load assessment demo stylesheet");
}

for (const [label, page] of [
  ["demonstration", demo],
  ["request pilot", pilot]
]) {
  if (extractRegistry(page, "ex-publication-sequence-registry") !== PUBLICATION_SEQUENCE) {
    fail(`${label} publication sequence must match Standard`);
  }
  if (extractRegistry(page, "ex-publication-identity-registry") !== PUBLICATION_IDENTITY) {
    fail(`${label} publication identity must match Standard`);
  }
}

if (!envJs.includes("isPublicationSurface")) {
  fail("institutional environment must define publication surface guard");
}

if (!envJs.includes("if (!isPublicationSurface(pageId))")) {
  fail("institutional environment must suppress footer on publication surfaces");
}

for (const page of [demo, pilot]) {
  for (const forbidden of ["<button", "<form", "ex-inst-hero-cta", "ex-publication-header", "Purpose", "Defined for"]) {
    if (page.includes(forbidden)) fail(`annex forbidden surface pattern: ${forbidden}`);
  }
}

if (failed) process.exit(1);
console.log("EXECUTIA cross-page publication consistency audit passed.");
