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
  "exStandardAuthority",
  "exStandardStructure",
  "exStandardLayers",
  "exStandardApplicability",
  "exStandardPublicationSequence",
  "EXECUTIA-STANDARD-V1",
  "Publication Identity",
  "Document Status",
  "Revision",
  "Release",
  "End of Document",
  "Document State",
  "FINAL",
  "exStandardEndOfDocument",
  "ex-publication-document-registry",
  "Standard Layers",
  "Standard Principle",
  "Governance First",
  "Execution Order",
  "Validation Layer",
  "Committed Layer",
  "Standard Applicability",
  "Publication Sequence",
  "Governed AI",
  "Evidence Annex",
  "Administrative Annex",
  "Execution Governance Standard",
  "executia-standard-homepage.js",
  "ex-institutional-publication"
], [
  "exDemoControlMap",
  "ex-arch-map-grid",
  "exPilotRequestForm",
  "<form",
  "Country",
  "Generate EXECUTIA Assessment",
  "/assessment/",
  "executia-execution-demo.js",
  "exDemoSectorCards",
  "Request Pilot",
  "See How It Works",
  "Open Demonstration",
  "ex-standard-action-row",
  "ex-env-footer-flow",
  "data-ex-env-header",
  "Publication Navigation",
  "ex-standard-hero-statement",
  "ex-standard-headline",
  "EXECUTIA is execution governance infrastructure",
  "the standard that requires validation",
  "The EXECUTIA Standard",
  "Governance first.",
  "Execution commits only after",
  "ex-standard-structure-statement",
  "Why It Matters",
  "Next action",
  "Next Action",
  "Evaluate the EXECUTIA Standard",
  "Review execution governance applicability",
  "Request pilot evaluation",
  "Evaluate",
  "Request pilot",
  "EXECUTIA prevents this",
  "What Changes",
  "exStandardToday",
  "exStandardWhatChanges",
  "exStandardWhyMatters",
  "exStandardCta",
  "data-ex-env-footer",
  "ex-standard-publication-footer",
  "Purpose",
  "Defined for",
  "<h4>Version</h4>"
]);

check("demonstration", demoPage, [
  "exDemoControlMap",
  "Annex Identifier",
  "Document",
  "Execution Control Map",
  "Evidence Scenarios",
  "Evidence Sectors",
  "Publication Sequence",
  "ex-publication-header",
  "exDemoScenarioRecords",
  "ex-standard-publication-document",
  "ex-institutional-publication",
  "ex-standard-publication-end",
  "EXECUTIA-STANDARD-V1"
], [
  "exPilotRequestForm",
  "<form",
  "Generate EXECUTIA Assessment",
  "/assessment/",
  "Request Pilot",
  "ex-inst-hero-cta",
  "ex-env-footer-flow",
  "Prove the Standard",
  "Sector Examples",
  "ex-inst-card-grid",
  "executia-assessment-demo.css",
  "ex-proof-map",
  "ex-arch-infra-stack",
  "Publication Navigation",
  "SELECT SCENARIO",
  "Select Scenario",
  "data-ex-env-header",
  "B · ",
  "Annex A ·",
  "Annex B ·",
  "<h4>Annex</h4>",
  "<h4>Evidence Annex</h4>",
  "<h4>Administrative Annex</h4>"
]);

check("request-pilot", pilot, [
  "Annex Identifier",
  "Document",
  "Pilot Request Publication",
  "Administrative Scope",
  "Administrative Outcome",
  "Administrative Request Fields",
  "Publication Sequence",
  "Execution Control Map",
  "ex-publication-header",
  "exPilotScopeRecords",
  "exPilotFieldRecords",
  "ex-standard-publication-document",
  "ex-institutional-publication",
  "ex-standard-publication-end",
  "EXECUTIA-STANDARD-V1"
], [
  "exPilotRequestForm",
  "<form",
  "<button",
  "Request Pilot Project",
  "Why Pilot",
  "Request Pilot Form",
  "Request Pilot Discussion",
  "Prove EXECUTIA",
  "Expected Outcome",
  "Pilot Scope",
  "Generate EXECUTIA Assessment",
  "/assessment/",
  "consulting",
  "Publication Navigation",
  "data-ex-env-header",
  "B · ",
  "Annex A ·",
  "Annex B ·",
  "<h4>Annex</h4>",
  "<h4>Evidence Annex</h4>",
  "<h4>Administrative Annex</h4>",
  "questionnaire",
  "ex-env-footer-flow",
  "executia-assessment-demo.css",
  "ex-inst-hero-cta",
  "ex-inst-generate-btn"
]);

if (!standardJs.includes("STANDARD_APPLICABILITY")) {
  console.error("FAIL: homepage must export STANDARD_APPLICABILITY");
  failed += 1;
}

if (!standardJs.includes("PUBLICATION_IDENTITY")) {
  console.error("FAIL: homepage must export PUBLICATION_IDENTITY");
  failed += 1;
}

if (!standardJs.includes("END_OF_DOCUMENT")) {
  console.error("FAIL: homepage must export END_OF_DOCUMENT");
  failed += 1;
}

if (!standardJs.includes("Governed AI")) {
  console.error("FAIL: homepage standard applicability must include Governed AI");
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
  "exStandardApplicability",
  "exStandardPublicationSequence",
  "exStandardAuthority",
  "exStandardEndOfDocument"
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
