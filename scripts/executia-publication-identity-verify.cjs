#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication Identity — registry vocabulary verification. */

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

const PUBLICATION_PAGES = [
  "public/index.html",
  "public/demonstration/index.html",
  "public/request-pilot/index.html"
];

const envJs = read("public/components/executia-institutional-environment.js");

const REQUIRED = [
  { label: "Annex Identifier", value: "Annex A", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Document", value: "Execution Control Map", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Annex Identifier", value: "Annex B", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Document", value: "Pilot Request Publication", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] },
  { label: "Document", value: "The Governance Standard", pages: ["public/index.html"] },
  { label: "Document", value: "The Execution Governance Standard", pages: ["public/demonstration/index.html", "public/request-pilot/index.html"] }
];

for (const rel of PUBLICATION_PAGES) {
  const html = read(rel);

  if (html.includes("B · ")) fail(`${rel} must not contain combined annex identity: B ·`);
  if (html.includes("A · Execution")) fail(`${rel} must not contain combined annex identity: A · Execution`);
  if (html.includes("Annex A ·")) fail(`${rel} must not combine annex identifier with document title`);
  if (html.includes("Annex B ·")) fail(`${rel} must not combine annex identifier with document title`);
  if (/<h4>Annex<\/h4>/.test(html)) fail(`${rel} must use Annex Identifier label, not Annex`);
  if (/<h4>Evidence Annex<\/h4>/.test(html)) fail(`${rel} must not use section title Evidence Annex in registry rows`);
  if (/<h4>Administrative Annex<\/h4>/.test(html)) fail(`${rel} must not use section title Administrative Annex in registry rows`);
}

function hasRegistryPair(html, label, value) {
  const pattern = new RegExp(`<h4>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h4>\\s*<p>${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`);
  return pattern.test(html);
}

for (const item of REQUIRED) {
  for (const rel of item.pages) {
    const html = read(rel);
    if (!hasRegistryPair(html, item.label, item.value)) {
      fail(`${rel} missing registry pair: ${item.label} → ${item.value}`);
    }
  }
}

if (!envJs.includes('document: "Execution Control Map"')) {
  fail("demonstration footer document must be Execution Control Map");
}

if (!envJs.includes('document: "Pilot Request Publication"')) {
  fail("request pilot footer document must be Pilot Request Publication");
}

if (!envJs.includes('document: "Execution Governance Standard"')) {
  fail("standard publication resolver document label missing from institutional environment");
}

if (envJs.includes("Evidence Annex A ·")) {
  fail("institutional environment must not combine annex identifier with document title");
}

if (failed) process.exit(1);
console.log("EXECUTIA publication identity verification passed.");
