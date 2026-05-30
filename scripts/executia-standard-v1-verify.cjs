#!/usr/bin/env node
"use strict";

/** EXECUTIA Standard Program v1 — public surface verification. */

const path = require("path");
const vm = require("vm");
const fs = require("fs");

function loadGlobalScript(relativePath) {
  const filePath = path.join(__dirname, "..", "public", "components", relativePath);
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {}, globalThis: {}, document: { createElement: () => ({}) } };
  sandbox.window = sandbox.globalThis;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window;
}

const demo = loadGlobalScript("executia-execution-demo.js").EXECUTIA_EXECUTION_DEMO;
const standardJs = fs.readFileSync(
  path.join(__dirname, "..", "public", "components", "executia-standard-homepage.js"),
  "utf8"
);
const envJs = fs.readFileSync(
  path.join(__dirname, "..", "public", "components", "executia-institutional-environment.js"),
  "utf8"
);

let failed = 0;
const map = demo.renderInstitutionalControlMapHtml(demo.getDemo("Energy", "Supplier Payment"));
const home = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const demoPage = fs.readFileSync(path.join(__dirname, "..", "public", "demonstration", "index.html"), "utf8");
const pilot = fs.readFileSync(path.join(__dirname, "..", "public", "request-pilot", "index.html"), "utf8");

function check(label, html, required, forbidden) {
  for (const p of required) {
    if (!html.includes(p)) {
      console.error(`FAIL [${label}] missing: ${p}`);
      failed += 1;
    }
  }
  for (const p of forbidden) {
    if (html.includes(p)) {
      console.error(`FAIL [${label}] forbidden: ${p}`);
      failed += 1;
    }
  }
}

check("homepage", home, [
  "The Execution Governance Standard",
  "EXECUTIA prevents this",
  "See How It Works",
  "exStandardAuthority",
  "exStandardStructure",
  "exStandardLayers",
  "EXECUTIA-STANDARD-V1",
  "Standard Authority",
  "Standard Layers",
  "exStandardToday",
  "Execution first. Control and proof follow",
  "The EXECUTIA Standard",
  "Validation Layer",
  "Committed Layer",
  "Governance first. Execution commits only after",
  "What Changes",
  "Why It Matters",
  "Open Demonstration",
  "Request Pilot",
  "executia-standard-homepage.js"
], [
  "exDemoControlMap",
  "ex-arch-map-grid",
  "exPilotRequestForm",
  "<form",
  "Country",
  "Generate EXECUTIA Assessment",
  "/assessment/",
  "executia-execution-demo.js",
  "exDemoSectorCards"
]);

check("demonstration", demoPage, [
  "exDemoControlMap",
  "Sector Examples",
  "Prove the Standard"
], [
  "exPilotRequestForm",
  "<form",
  "Generate EXECUTIA Assessment",
  "/assessment/",
  "Request Pilot"
]);

check("request-pilot", pilot, [
  "Request Pilot Project",
  "Why Pilot",
  "Pilot Scope",
  "Expected Outcome",
  "Request Pilot Form",
  "exPilotRequestForm",
  "exPilotRequestName",
  "exPilotRequestOrg",
  "exPilotRequestPosition",
  "exPilotRequestEmail",
  "exPilotRequestProcess",
  "exPilotRequestMessage",
  "Request Pilot Discussion"
], ["/assessment/", "Generate EXECUTIA Assessment", "consulting", "questionnaire"]);

if (!standardJs.includes("Institutional Impact")) {
  console.error("FAIL: homepage what changes must include Institutional Impact");
  failed += 1;
}

if (!standardJs.includes("Enterprise")) {
  console.error("FAIL: homepage why-it-matters must include Enterprise");
  failed += 1;
}

if (!standardJs.includes('"AI"')) {
  console.error("FAIL: homepage why-it-matters must include AI audience");
  failed += 1;
}

if (!standardJs.includes("Investors")) {
  console.error("FAIL: homepage why-it-matters must include Investors audience");
  failed += 1;
}

if (envJs.includes('{ id: "assessment"')) {
  console.error("FAIL: assessment in public nav");
  failed += 1;
}

if (!map.includes("Validation Layer")) {
  console.error("FAIL: demonstration control map missing");
  failed += 1;
}

const order = [
  "exStandardHero",
  "exStandardStructure",
  "exStandardLayers",
  "exStandardAuthority",
  "exStandardToday",
  "exStandardWhatChanges",
  "exStandardWhyMatters",
  "exStandardCta"
];
let last = -1;
for (const id of order) {
  const i = home.indexOf(`id="${id}"`);
  if (i <= last) {
    console.error(`FAIL: homepage section order: ${id}`);
    failed += 1;
  }
  last = i;
}

if (failed) process.exit(1);
console.log("EXECUTIA Standard v1 verification passed.");
