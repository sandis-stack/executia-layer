#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication System v1 — mobile validation. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(
  path.join(root, "public/components/executia-institutional-environment.css"),
  "utf8"
);

const pages = [
  { label: "homepage", file: "public/index.html" },
  { label: "demonstration", file: "public/demonstration/index.html" },
  { label: "request-pilot", file: "public/request-pilot/index.html" }
];

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page.file), "utf8");
  if (!html.includes('name="viewport"')) fail(`[${page.label}] missing viewport meta`);
  if (!html.includes("width=device-width")) fail(`[${page.label}] viewport must include device-width`);
  if (!html.includes('id="main-content"')) fail(`[${page.label}] missing main-content landmark id`);
}

const mobileRules = [
  "@media (max-width: 720px)",
  "body.ex-institutional-publication .ex-standard-publication-document",
  "grid-template-columns: 1fr",
  "overflow-wrap: anywhere"
];

for (const rule of mobileRules) {
  if (!css.includes(rule)) fail(`mobile CSS rule missing: ${rule}`);
}

if (failed) process.exit(1);
console.log("EXECUTIA Publication System v1 mobile validation passed.");
