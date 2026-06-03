#!/usr/bin/env node
"use strict";

/** EXECUTIA Homepage — outcome-first conversion verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function indexOf(id) {
  return home.indexOf(`id="${id}"`);
}

const FLOW_ORDER = [
  "exHomeProblem",
  "exHomeWhySystemsFail",
  "exHomeWhatYouReceive",
  "exHomeExampleResult",
  "exHomeAuditEntry",
  "exHomeResultSection",
  "exHomeDifference"
];

for (const id of FLOW_ORDER) {
  if (indexOf(id) < 0) fail(`missing section: ${id}`);
}

let last = -1;
for (const id of FLOW_ORDER) {
  const i = indexOf(id);
  if (i <= last) fail(`flow order violation: ${id}`);
  last = i;
}

for (const required of [
  "Risks Identified",
  "Missing Controls",
  "Compliance Exposure",
  "Validation Failures",
  "Recommended Actions",
  "Executive Audit Report",
  "Example Assessment Result",
  "Generate Assessment",
  "Export Executive Report",
  "Request Pilot Evaluation",
  "Supplier paid"
]) {
  if (!home.includes(required)) fail(`missing: ${required}`);
}

for (const forbidden of [
  "Execution Risk Assessment",
  "Governance Readiness Review",
  "Validation Gap Detection",
  "exHomeAuditPreview"
]) {
  if (home.includes(forbidden)) fail(`forbidden: ${forbidden}`);
}

if (failed) {
  console.log("CONVERSION_PASS_FAILED");
  process.exit(1);
}
console.log("CONVERSION_PASS_READY");
