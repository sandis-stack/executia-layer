#!/usr/bin/env node
"use strict";

/** EXECUTIA Institutional Publication Program — cross-page authority verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const program = JSON.parse(
  fs.readFileSync(path.join(root, "governance", "institutional-publication-program.json"), "utf8")
);
const homepage = JSON.parse(
  fs.readFileSync(path.join(root, "governance", "homepage-v1-frozen.json"), "utf8")
);

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function checkPublicationSurface(label, html, options) {
  const pub = program.publication_system;
  const bodyClasses = options?.bodyClasses || [pub.publication_body_class];
  if (!html.includes(pub.envelope)) fail(`[${label}] missing publication envelope`);
  if (!bodyClasses.some((cls) => html.includes(cls))) {
    fail(`[${label}] missing publication body class`);
  }
  if (options?.bodyClasses?.includes("ex-standard-homepage")) {
    if (!html.includes('id="exStandardEndOfDocument"')) {
      fail(`[${label}] end of document must close publication envelope`);
    }
  } else if (!html.includes("ex-standard-publication-end")) {
    fail(`[${label}] publication metadata must mount inside envelope`);
  }
  if (html.includes("ex-inst-hero-cta")) fail(`[${label}] exceeds homepage authority — hero CTA present`);
  if (html.includes("ex-env-footer-flow")) fail(`[${label}] exceeds homepage authority — website footer navigation present`);
  if (html.includes("ex-standard-action-row")) fail(`[${label}] exceeds homepage authority — CTA action rows present`);
  if (html.includes("See How It Works") || html.includes("Open Demonstration")) {
    fail(`[${label}] exceeds homepage authority — navigation CTA copy present`);
  }
}

if (program.status !== "LOCKED") {
  fail("institutional publication program must be LOCKED");
}

if (program.review_status !== "READY_FOR_GOVERNMENT_REVIEW") {
  fail("institutional publication program review status must be READY_FOR_GOVERNMENT_REVIEW");
}

if (program.structural_phase !== "CLOSED") {
  fail("structural phase must be CLOSED");
}

if (program.review_phase !== "ACTIVE") {
  fail("review phase must be ACTIVE");
}

if (program.program_status !== "CLOSED") {
  fail("institutional publication program must be CLOSED");
}

if (homepage.status !== "LOCKED") {
  fail("homepage reference standard must be LOCKED");
}

if (!homepage.review_baseline || !homepage.reference_standard) {
  fail("homepage must be review_baseline and reference_standard");
}

if (program.authority_ceiling !== "ACTIVE") {
  fail("authority ceiling must be ACTIVE");
}

const home = read("public/index.html");
const demo = read("public/demonstration/index.html");
const pilot = read("public/request-pilot/index.html");
const envJs = read("public/components/executia-institutional-environment.js");
const demoJs = read("public/components/executia-execution-demo.js");

checkPublicationSurface("homepage", home, { bodyClasses: ["ex-standard-homepage"] });
checkPublicationSurface("demonstration", demo);
checkPublicationSurface("request-pilot", pilot);

if (demo.includes("executia-assessment-demo.css")) {
  fail("demonstration must not load executia-assessment-demo.css");
}

if (!demoJs.includes("renderEvidenceAnnexHtml")) {
  fail("evidence annex renderer missing from execution demo");
}

if (pilot.includes("executia-assessment-demo.css")) {
  fail("request pilot must not load executia-assessment-demo.css");
}

if (!envJs.includes("resolvePublicationSurface")) {
  fail("publication surface resolver missing from institutional environment");
}

for (const doc of [
  "The Execution Governance Standard",
  "Execution Control Map",
  "Pilot Request Publication"
]) {
  if (!envJs.includes(doc)) fail(`publication metadata document missing: ${doc}`);
}

if (failed) process.exit(1);
console.log("EXECUTIA Institutional Publication Program verification passed.");
