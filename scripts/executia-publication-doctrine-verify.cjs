#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Doctrine — registry-only standard principle verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function extractDoctrineBlock(html) {
  const start = html.indexOf('id="exStandardStructure"');
  if (start < 0) return "";
  const sectionStart = html.lastIndexOf("<section", start);
  const sectionEnd = html.indexOf("</section>", start);
  if (sectionStart < 0 || sectionEnd < 0) return "";
  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

const doctrine = extractDoctrineBlock(home);

if (!doctrine) fail("homepage missing exStandardStructure doctrine section");

for (const forbidden of [
  "The EXECUTIA Standard",
  "Governance first.",
  "Governance First",
  "Execution commits only after",
  "ex-standard-structure-statement",
  "exStandardStructureLabel",
  "<h4>↓</h4>"
]) {
  if (home.includes(forbidden)) fail(`homepage must not contain slogan doctrine residue: ${forbidden}`);
}

if (!doctrine.includes("Standard Principle")) fail("standard doctrine missing Standard Principle section label");
if (!/<h4>Principle<\/h4>\s*<p>Governance Precedes Execution<\/p>/.test(doctrine)) {
  fail("standard doctrine missing registry pair: Principle → Governance Precedes Execution");
}

if (!doctrine.includes("Execution Order")) fail("standard doctrine missing Execution Order section label");

for (const row of [
  { index: "01", label: "Validation" },
  { index: "02", label: "Control" },
  { index: "03", label: "Proof" },
  { index: "04", label: "Commitment" },
  { index: "05", label: "Execution" }
]) {
  const pattern = new RegExp(`<h4>${row.index}</h4>\\s*<p>${row.label}</p>`);
  if (!pattern.test(doctrine)) fail(`execution order missing registry row: ${row.index} ${row.label}`);
}

if (!doctrine.includes("ex-publication-doctrine-registry")) {
  fail("standard doctrine must use publication doctrine registry styling");
}

if (!doctrine.includes("ex-publication-execution-order-registry")) {
  fail("execution order must use publication execution order registry styling");
}

if (failed) process.exit(1);
console.log("EXECUTIA publication doctrine verification passed.");
