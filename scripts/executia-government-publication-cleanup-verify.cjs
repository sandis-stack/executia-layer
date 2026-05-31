#!/usr/bin/env node
"use strict";

/** EXECUTIA Government Publication Cleanup — fail build on website navigation residue. */

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

const PUBLICATION_PAGES = [
  { label: "homepage", rel: "public/index.html", annex: false },
  { label: "demonstration", rel: "public/demonstration/index.html", annex: true },
  { label: "request-pilot", rel: "public/request-pilot/index.html", annex: true }
];

const envJs = read("public/components/executia-institutional-environment.js");
const demoJs = read("public/components/executia-demonstration-ux.js");

const FORBIDDEN_NAV_LINKS = [
  /<a[^>]*>\s*Home\s*<\/a>/i,
  /<a[^>]*>\s*HOME\s*<\/a>/,
  /<a[^>]*>\s*Demonstration\s*<\/a>/i,
  /<a[^>]*>\s*DEMONSTRATION\s*<\/a>/,
  /<a[^>]*>\s*Request Pilot\s*<\/a>/i,
  /<a[^>]*>\s*REQUEST PILOT\s*<\/a>/
];

const FORBIDDEN_SURFACE_PHRASES = [
  /SELECT SCENARIO/i,
  /Publication Navigation/,
  /data-ex-env-header/,
  /ex-env-footer-flow/,
  /class="ex-env-flow"/,
  /exDemoPublicationNav/,
  /exPilotPublicationNav/
];

const EVIDENCE_SCENARIOS = [
  "Supplier Payment",
  "Asset Maintenance",
  "Production Reporting"
];

if (!envJs.includes("function isPublicationSurface")) {
  fail("institutional environment must define isPublicationSurface");
}

if (!envJs.includes("!isPublicationSurface(pageId)")) {
  fail("institutional environment must skip header mount on publication surfaces");
}

for (const page of PUBLICATION_PAGES) {
  const html = read(page.rel);

  for (const pattern of FORBIDDEN_SURFACE_PHRASES) {
    if (pattern.test(html)) fail(`[${page.label}] forbidden publication residue: ${pattern}`);
  }

  for (const pattern of FORBIDDEN_NAV_LINKS) {
    if (pattern.test(html)) fail(`[${page.label}] forbidden website navigation link: ${pattern}`);
  }

  if (/\bHOME\b/.test(html) && !html.includes("ex-standard-homepage")) {
    fail(`[${page.label}] forbidden HOME navigation label`);
  }

  if (/\bDEMONSTRATION\b/.test(html)) {
    fail(`[${page.label}] forbidden DEMONSTRATION navigation label`);
  }

  if (/\bREQUEST PILOT\b/.test(html)) {
    fail(`[${page.label}] forbidden REQUEST PILOT navigation label`);
  }
}

for (const page of PUBLICATION_PAGES.filter((entry) => entry.annex)) {
  const html = read(page.rel);
  const demoUx = page.label === "demonstration" ? demoJs : "";

  if (/<button\b/i.test(html)) fail(`[${page.label}] annex must not contain button elements`);
  if (/role="button"/i.test(html)) fail(`[${page.label}] annex must not expose button role`);
  if (/ex-inst-card/i.test(html)) fail(`[${page.label}] annex must not use interactive cards`);

  if (page.label === "demonstration") {
    if (demoUx.includes("<button") || demoUx.includes("ex-inst-card") || demoUx.includes("listbox")) {
      fail("demonstration UX must not use application UI patterns");
    }
    if (!demoUx.includes('renderEvidenceRecord(container, "Scenario"')) {
      fail("demonstration UX must render Scenario registry rows");
    }
    for (const scenario of EVIDENCE_SCENARIOS) {
      if (!demoUx.includes(`"${scenario}"`)) fail(`demonstration UX missing scenario registry row: ${scenario}`);
    }
  }
}

if (failed) process.exit(1);
console.log("EXECUTIA government publication cleanup verification passed.");
