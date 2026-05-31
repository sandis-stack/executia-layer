#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Readiness — pre-government audit defect gate. */

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

const home = read("public/index.html");
const demo = read("public/demonstration/index.html");
const pilot = read("public/request-pilot/index.html");
const pilotJs = read("public/components/executia-request-pilot-ux.js");
const envJs = read("public/components/executia-institutional-environment.js");
const css = read("public/components/executia-institutional-environment.css");

const FORBIDDEN_PLACEHOLDERS = [
  "Scope record",
  "Outcome record",
  "Contact field",
  "Institution field",
  "Role field",
  "Contact channel",
  "Subject field",
  "Administrative note field",
  "Administrative Request Fields"
];

const FORBIDDEN_COLD_READ = [
  "Questionnaire",
  "Intake Schema",
  "Lead Form",
  "<form",
  "<button"
];

for (const page of [home, demo, pilot, pilotJs]) {
  for (const phrase of FORBIDDEN_PLACEHOLDERS) {
    if (page.includes(phrase)) fail(`forbidden placeholder language: ${phrase}`);
  }
}

for (const page of [pilot, pilotJs]) {
  for (const phrase of FORBIDDEN_COLD_READ) {
    if (page.includes(phrase)) fail(`administrative annex forbidden perception: ${phrase}`);
  }
}

if (!pilot.includes("Administrative Review Records")) {
  fail("administrative annex must use Administrative Review Records section label");
}

if (!pilotJs.includes("Institutional Pilot Evaluation")) {
  fail("administrative annex missing scope record language");
}

if (!pilotJs.includes("Review Outcome")) {
  fail("administrative annex missing outcome record language");
}

for (const page of [home, demo, pilot]) {
  if (!page.includes("Publication Date")) fail("publication identity missing Publication Date");
  if (!page.includes("2026-05-31")) fail("publication identity missing publication date value");
  if (page.includes("<h4>")) fail("publication surface must not use h4 registry headings");
  if (!page.includes("h2 class=\"ex-inst-label\"")) fail("publication surface must use h2 section labels");
}

if (envJs.includes("SoftwareApplication") && envJs.includes("ex-institutional-publication")) {
  const annexBlock = envJs.slice(envJs.indexOf("pageId === \"demonstration\""), envJs.indexOf("const payload = isEntry"));
  if (annexBlock.includes("SoftwareApplication")) {
    fail("publication annex mountAiMeta must not inject SoftwareApplication");
  }
}

if (!envJs.includes("@type\": \"TechArticle\"") || !envJs.includes("@type\": \"Report\"")) {
  fail("publication annex JSON-LD must use TechArticle and Report");
}

if (!css.includes("--ex-pub-label-color: #576674")) {
  fail("publication label contrast token missing");
}

if (!css.includes(".ex-publication-registry-label")) {
  fail("publication registry label class missing from CSS");
}

if (failed) {
  console.error("NOT READY");
  process.exit(1);
}
console.log("READY");
