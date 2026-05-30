#!/usr/bin/env node
"use strict";

/** EXECUTIA Homepage v1 — frozen authority verification. Fails on any drift. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "governance", "homepage-v1-frozen.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const home = read("public/index.html");
const standardJs = read("public/components/executia-standard-homepage.js");
const envJs = read("public/components/executia-institutional-environment.js");

if (manifest.status !== "FROZEN") {
  fail("homepage manifest status must be FROZEN");
}

for (const file of manifest.files) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`missing frozen file: ${file}`);
  }
}

for (const phrase of manifest.hero) {
  if (!home.includes(phrase)) fail(`hero drift — missing: ${phrase}`);
}

for (const phrase of manifest.standard_definition) {
  if (!home.includes(phrase)) fail(`standard definition drift — missing: ${phrase}`);
}

if (manifest.standard_authority) {
  if (!home.includes(manifest.standard_authority.section_label)) {
    fail("Standard Authority section label missing");
  }
  for (const field of manifest.standard_authority.fields) {
    if (!home.includes(field.label)) fail(`Standard Authority label drift — missing: ${field.label}`);
    if (!home.includes(field.value)) fail(`Standard Authority value drift — missing: ${field.value}`);
  }
}

if (!home.includes(manifest.what_changes.section_label)) {
  fail("What Changes section label missing");
}
for (const col of manifest.what_changes.columns) {
  if (!standardJs.includes(col)) fail(`What Changes column drift — missing: ${col}`);
}
for (const list of ["today", "executia", "impact"]) {
  for (const item of manifest.what_changes[list]) {
    if (!standardJs.includes(item)) fail(`What Changes ${list} drift — missing: ${item}`);
  }
}

if (!home.includes(manifest.why_it_matters.section_label)) {
  fail("Why It Matters section label missing");
}
for (const item of manifest.why_it_matters.items) {
  if (!standardJs.includes(item.title)) fail(`Why It Matters title drift — missing: ${item.title}`);
  if (!standardJs.includes(item.text)) fail(`Why It Matters text drift — missing: ${item.text}`);
}

for (const cta of manifest.cta) {
  if (!home.includes(cta)) fail(`CTA drift — missing: ${cta}`);
}

for (const id of manifest.section_order) {
  if (!home.includes(`id="${id}"`)) fail(`architecture drift — missing section: ${id}`);
}
let last = -1;
for (const id of manifest.section_order) {
  const i = home.indexOf(`id="${id}"`);
  if (i <= last) fail(`architecture drift — section order: ${id}`);
  last = i;
}

for (const item of manifest.public_product_flow) {
  if (!envJs.includes(`id: "${item.id}"`) || !envJs.includes(`label: "${item.label}"`) || !envJs.includes(`href: "${item.href}"`)) {
    fail(`navigation drift — missing: ${item.label} (${item.href})`);
  }
}

if (envJs.includes('{ id: "assessment"') && envJs.includes("PUBLIC_PRODUCT_FLOW")) {
  const flowMatch = envJs.match(/PUBLIC_PRODUCT_FLOW = Object\.freeze\(\[([\s\S]*?)\]\);/);
  if (flowMatch && flowMatch[1].includes('id: "assessment"')) {
    fail("navigation drift — assessment must not be in PUBLIC_PRODUCT_FLOW");
  }
}

for (const phrase of manifest.forbidden_on_homepage) {
  if (home.includes(phrase)) fail(`forbidden on homepage: ${phrase}`);
}

if (!home.includes('class="ex-standard-homepage"') && !home.includes("ex-standard-homepage")) {
  fail("homepage must use ex-standard-homepage body class");
}

if (!home.includes("executia-standard-homepage.js")) {
  fail("homepage must load executia-standard-homepage.js");
}

if (home.includes("executia-assessment-demo.css")) {
  fail("homepage must not load executia-assessment-demo.css (Design Constitution v1)");
}

if (!home.includes("executia-design-system.css")) {
  fail("homepage must load executia-design-system.css");
}

if (!home.includes("executia-institutional-environment.css")) {
  fail("homepage must load executia-institutional-environment.css");
}

if (failed) process.exit(1);
console.log("EXECUTIA Homepage v1 frozen authority verification passed.");
