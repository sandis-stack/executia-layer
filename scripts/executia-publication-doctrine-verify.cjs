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
  "Execution commits only after",
  "ex-standard-structure-statement",
  "exStandardStructureLabel"
]) {
  if (home.includes(forbidden)) fail(`homepage must not contain slogan doctrine residue: ${forbidden}`);
}

const REQUIRED = [
  { label: "Standard Principle", value: "Governance First" },
  { label: "Execution Order", value: "Validation" },
  { label: "↓", value: "Control" },
  { label: "↓", value: "Proof" },
  { label: "↓", value: "Commitment" },
  { label: "↓", value: "Execution" }
];

for (const item of REQUIRED) {
  const pattern = new RegExp(
    `<h4>${item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h4>\\s*<p>${item.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`
  );
  if (!pattern.test(doctrine)) fail(`standard doctrine missing registry pair: ${item.label} → ${item.value}`);
}

if (!doctrine.includes("ex-publication-doctrine-registry")) {
  fail("standard doctrine must use publication doctrine registry styling");
}

if (failed) process.exit(1);
console.log("EXECUTIA publication doctrine verification passed.");
