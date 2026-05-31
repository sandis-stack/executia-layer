#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Hero — registry-only standard hero verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function extractHeroBlock(html) {
  const start = html.indexOf('id="exStandardHero"');
  if (start < 0) return "";
  const headerStart = html.lastIndexOf("<header", start);
  const headerEnd = html.indexOf("</header>", start);
  if (headerStart < 0 || headerEnd < 0) return "";
  return html.slice(headerStart, headerEnd + "</header>".length);
}

const hero = extractHeroBlock(home);

if (!hero) fail("homepage missing exStandardHero header");

const REQUIRED_HERO = [
  { label: "Document", value: "The Execution Governance Standard" },
  { label: "Classification", value: "Execution Governance Standard" },
  { label: "Status", value: "Published" }
];

for (const item of REQUIRED_HERO) {
  const pattern = new RegExp(
    `<h4>${item.label}</h4>\\s*<p>${item.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`
  );
  if (!pattern.test(hero)) fail(`homepage hero missing registry pair: ${item.label} → ${item.value}`);
}

for (const forbidden of [
  "ex-standard-hero-statement",
  "ex-standard-headline",
  "EXECUTIA is",
  "the standard that",
  "validation",
  "proof",
  "accountability",
  "infrastructure",
  "execution governance infrastructure"
]) {
  if (hero.toLowerCase().includes(forbidden.toLowerCase())) {
    fail(`homepage hero contains forbidden brochure language: ${forbidden}`);
  }
}

if (!hero.includes("ex-publication-document-registry")) {
  fail("homepage hero must use publication document registry styling");
}

if (!hero.includes("ex-publication-sr-only")) {
  fail("homepage hero must expose screen-reader document h1");
}

if (failed) process.exit(1);
console.log("EXECUTIA publication hero verification passed.");
