#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication System v1 — accessibility validation. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const envJs = fs.readFileSync(
  path.join(root, "public/components/executia-institutional-environment.js"),
  "utf8"
);
const css = fs.readFileSync(
  path.join(root, "public/components/executia-institutional-environment.css"),
  "utf8"
);

const pages = [
  {
    label: "homepage",
    file: "public/index.html",
    requireVisibleH1: true,
    requireSrOnlyH1: false
  },
  {
    label: "demonstration",
    file: "public/demonstration/index.html",
    requireVisibleH1: false,
    requireSrOnlyH1: true
  },
  {
    label: "request-pilot",
    file: "public/request-pilot/index.html",
    requireVisibleH1: false,
    requireSrOnlyH1: true
  }
];

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page.file), "utf8");
  if (!html.includes('<html lang="en"')) fail(`[${page.label}] missing lang=en`);
  if (!html.includes("<main")) fail(`[${page.label}] missing main landmark`);
  if (!html.includes('id="main-content"')) fail(`[${page.label}] missing main-content id`);
  if (!html.includes("<article")) fail(`[${page.label}] missing article landmark`);
  if (!html.includes("aria-label")) fail(`[${page.label}] missing article aria-label`);
  if (!html.includes("aria-labelledby")) fail(`[${page.label}] missing section aria-labelledby`);
  if (page.requireVisibleH1 && !html.includes("<h1")) fail(`[${page.label}] missing visible h1`);
  if (page.requireSrOnlyH1 && !html.includes("ex-publication-sr-only")) {
    fail(`[${page.label}] missing screen-reader publication h1`);
  }
}

if (!envJs.includes('role="contentinfo"')) {
  fail("footer must expose contentinfo role");
}

if (!envJs.includes("renderPublicationMetadataFooter")) {
  fail("publication metadata footer renderer missing");
}

if (!css.includes(".ex-publication-sr-only")) {
  fail("screen-reader-only utility class missing");
}

if (!css.includes("prefers-reduced-motion")) {
  fail("reduced motion preference rule missing");
}

if (failed) process.exit(1);
console.log("EXECUTIA Publication System v1 accessibility validation passed.");
