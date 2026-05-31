#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Hero — registry-only standard document open verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function extractDocumentBlock(html) {
  const start = html.indexOf('id="exStandardHero"');
  if (start < 0) return "";
  const sectionStart = html.lastIndexOf("<section", start);
  const sectionEnd = html.indexOf("</section>", start);
  if (sectionStart < 0 || sectionEnd < 0) return "";
  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

const documentOpen = extractDocumentBlock(home);

if (!documentOpen) fail("homepage missing exStandardHero document section");
if (!documentOpen.includes("ex-publication-document-open")) {
  fail("homepage document open must use publication document open styling");
}

const REQUIRED_DOCUMENT = [
  { label: "Document", value: "EXECUTIA Governance Standard" },
  { label: "Classification", value: "Governance Standard" },
  { label: "Status", value: "Published" }
];

for (const item of REQUIRED_DOCUMENT) {
  const pattern = new RegExp(
    `<h4>${item.label}</h4>\\s*<p>${item.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`
  );
  if (!pattern.test(documentOpen)) fail(`homepage document missing registry pair: ${item.label} → ${item.value}`);
}

for (const forbidden of [
  "ex-standard-hero",
  "ex-standard-hero-statement",
  "ex-standard-headline",
  "EXECUTIA is",
  "the standard that",
  "validation",
  "proof",
  "accountability",
  "infrastructure",
  "execution governance infrastructure",
  "The Governance Standard"
]) {
  if (home.includes(forbidden)) {
    fail(`homepage document contains forbidden brochure language: ${forbidden}`);
  }
}

if (!documentOpen.includes("ex-publication-document-registry")) {
  fail("homepage document must use publication document registry styling");
}

if (!documentOpen.includes("ex-publication-sr-only")) {
  fail("homepage document must expose screen-reader document h1");
}

if (failed) process.exit(1);
console.log("EXECUTIA publication hero verification passed.");
