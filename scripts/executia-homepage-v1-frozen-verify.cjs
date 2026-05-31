#!/usr/bin/env node
"use strict";

/** EXECUTIA Homepage v1 — frozen authority verification. Fails on any drift. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "governance", "homepage-v1-frozen.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const FROZEN_STATUSES = new Set(["FROZEN", "FROZEN_FOR_REVIEW", "LOCKED"]);

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
const envCss = read("public/components/executia-institutional-environment.css");

if (!FROZEN_STATUSES.has(manifest.status)) {
  fail(`homepage manifest status must be FROZEN, FROZEN_FOR_REVIEW, or LOCKED (got ${manifest.status})`);
}

if (!manifest.review_baseline || !manifest.reference_standard) {
  fail("homepage must be review_baseline and reference_standard");
}

for (const file of manifest.files) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`missing frozen file: ${file}`);
  }
}

if (manifest.publication_system) {
  const pub = manifest.publication_system;
  if (pub.envelope && !home.includes(pub.envelope)) {
    fail(`publication envelope drift — missing: ${pub.envelope}`);
  }
  if (pub.homepage_body_class && !home.includes(pub.homepage_body_class)) {
    fail(`homepage body class drift — missing: ${pub.homepage_body_class}`);
  }
  if (!envCss.includes("body.ex-standard-homepage")) {
    fail("homepage publication styles missing from executia-institutional-environment.css");
  }
}

if (Array.isArray(manifest.protected_structure)) {
  for (const section of manifest.protected_structure) {
    if (section.id && !home.includes(`id="${section.id}"`)) {
      fail(`protected structure drift — missing section: ${section.label || section.id}`);
    }
    if (section.mount && !home.includes(section.mount)) {
      fail(`protected structure drift — missing mount: ${section.label || section.mount}`);
    }
  }
}

if (manifest.standard_applicability) {
  const applicability = manifest.standard_applicability;
  if (!home.includes(applicability.section_label)) {
    fail("Standard Applicability section label missing");
  }
  if (applicability.registry_class && !home.includes(applicability.registry_class)) {
    fail(`standard applicability registry drift — missing: ${applicability.registry_class}`);
  }
  for (const item of applicability.items || []) {
    if (!home.includes(item)) fail(`standard applicability drift — missing: ${item}`);
    if (!standardJs.includes(item)) fail(`standard applicability JS drift — missing: ${item}`);
  }
}

if (manifest.publication_sequence) {
  const sequence = manifest.publication_sequence;
  if (!home.includes(sequence.section_label)) {
    fail("Publication Sequence section label missing");
  }
  if (sequence.registry_class && !home.includes(sequence.registry_class)) {
    fail(`publication sequence registry drift — missing: ${sequence.registry_class}`);
  }
  for (const row of sequence.rows || []) {
    if (!home.includes(`<h4>${row.index}</h4>`)) fail(`publication sequence index drift — missing: ${row.index}`);
    if (!home.includes(row.label)) fail(`publication sequence label drift — missing: ${row.label}`);
    if (!standardJs.includes(row.label)) fail(`publication sequence JS drift — missing: ${row.label}`);
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
    if (!standardJs.includes(field.value)) fail(`Standard Authority JS drift — missing: ${field.value}`);
  }
}

if (manifest.document_state) {
  const terminal = manifest.document_state;
  if (!home.includes(`id="${terminal.section_id}"`)) {
    fail("Document State section missing");
  }
  if (terminal.registry_class && !home.includes(terminal.registry_class)) {
    fail(`document state registry drift — missing: ${terminal.registry_class}`);
  }
  for (const field of terminal.fields || []) {
    if (!home.includes(field.label)) fail(`Document State label drift — missing: ${field.label}`);
    if (!home.includes(field.value)) fail(`Document State value drift — missing: ${field.value}`);
    if (!standardJs.includes(field.value)) fail(`Document State JS drift — missing: ${field.value}`);
  }
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
console.log(`EXECUTIA Homepage v1 frozen authority verification passed (${manifest.status}).`);
