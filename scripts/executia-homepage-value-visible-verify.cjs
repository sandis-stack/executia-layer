#!/usr/bin/env node
"use strict";

/** EXECUTIA Homepage — outcome-first finalization verification. */

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

const OUTCOME_FIRST_ORDER = [
  "exHomeProblem",
  "exHomeWhySystemsFail",
  "exHomeWhatYouReceive",
  "exHomeExampleResult",
  "exHomeAuditEntry",
  "exHomeAuditForm",
  "exHomeResultSection",
  "exHomeDifference"
];

for (const id of OUTCOME_FIRST_ORDER) {
  if (indexOf(id) < 0) fail(`missing section: ${id}`);
}

let last = -1;
for (const id of OUTCOME_FIRST_ORDER) {
  const i = indexOf(id);
  if (i <= last) fail(`order violation: ${id}`);
  last = i;
}

for (const forbidden of [
  "exHomeHero",
  "exHomeChainBlock",
  "Execution Failures Cost More",
  "Audit Entry",
  "Export Audit Report",
  "What EXECUTIA Prevents"
]) {
  if (home.includes(forbidden)) fail(`forbidden: ${forbidden}`);
}

for (const required of [
  "The Cost of Execution Failure",
  "Procurement failures",
  "Compliance failures",
  "Budget overruns",
  "Why Existing Systems Fail",
  "What You Receive",
  "Risks Identified",
  "Missing Controls",
  "Validation Failures",
  "Recommended Actions",
  "Executive Audit Report",
  "Example Assessment Result",
  "Audit Readiness",
  "Generate a governance assessment for a real process in your organization.",
  "Risk Score",
  "Validation Gaps",
  "Pilot Candidate",
  "Run Execution Assessment",
  "Generate Assessment",
  "Export Executive Report",
  "Request Pilot Evaluation",
  "Supplier paid",
  "Validation before payment"
]) {
  if (!home.includes(required)) fail(`missing: ${required}`);
}

if (failed) {
  console.log("HOMEPAGE_VALUE_NOT_VISIBLE");
  process.exit(1);
}
console.log("HOMEPAGE_VALUE_VISIBLE");
