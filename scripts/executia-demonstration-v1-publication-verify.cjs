#!/usr/bin/env node
"use strict";

/** EXECUTIA Demonstration v1 — evidence annex publication verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "governance", "demonstration-v1-publication.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const FROZEN_STATUSES = new Set(["FROZEN", "FROZEN_FOR_REVIEW", "LOCKED", "EVIDENCE_ANNEX_REVIEW", "ADMINISTRATIVE_ANNEX_REVIEW"]);

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const demo = read("public/demonstration/index.html");
const demoJs = read("public/components/executia-demonstration-ux.js");
const execDemoJs = read("public/components/executia-execution-demo.js");

if (!FROZEN_STATUSES.has(manifest.status)) {
  fail(`demonstration manifest status must be frozen for review (got ${manifest.status})`);
}

for (const file of manifest.files) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing file: ${file}`);
}

for (const sheet of manifest.allowed_stylesheets) {
  if (!demo.includes(sheet)) fail(`required stylesheet missing: ${sheet}`);
}

const stylesheetLinks = demo.match(/<link[^>]+rel="stylesheet"[^>]*>/gi) || [];
if (stylesheetLinks.length !== manifest.allowed_stylesheets.length) {
  fail(
    `demonstration must load exactly ${manifest.allowed_stylesheets.length} stylesheets (found ${stylesheetLinks.length})`
  );
}

for (const forbidden of manifest.forbidden_stylesheets) {
  if (demo.includes(forbidden)) fail(`forbidden stylesheet on demonstration: ${forbidden}`);
}

for (const phrase of manifest.forbidden_on_surface) {
  if (demo.includes(phrase)) fail(`forbidden on demonstration surface: ${phrase}`);
}

if (demo.includes("data-ex-env-header")) {
  fail("demonstration must not mount website header");
}

if (demo.includes('role="listbox"') || demo.includes("<button")) {
  fail("demonstration must not use application selector UI");
}

if (!demo.includes("Evidence Scenarios")) fail("demonstration must label Evidence Scenarios");
if (!demo.includes("Evidence Sectors")) fail("demonstration must label Evidence Sectors");

if (demo.includes("Publication Navigation")) {
  fail("demonstration must not include website publication navigation section");
}

if (!demo.includes(manifest.publication_system.envelope)) {
  fail("demonstration missing publication envelope");
}

if (!demoJs.includes("ex-publication-registry-row")) {
  fail("demonstration UX must render shared publication registry rows");
}

if (demoJs.includes("<button") || demoJs.includes("ex-inst-card") || demoJs.includes("listbox")) {
  fail("demonstration UX must not use application UI patterns");
}

if (!execDemoJs.includes(manifest.publication_system.renderer)) {
  fail("demonstration must render evidence annex registry via renderEvidenceAnnexHtml");
}

if (failed) process.exit(1);
console.log("EXECUTIA Demonstration v1 publication verification passed.");
