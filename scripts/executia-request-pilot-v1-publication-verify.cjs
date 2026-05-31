#!/usr/bin/env node
"use strict";

/** EXECUTIA Request Pilot v1 — administrative annex publication verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "governance", "request-pilot-v1-publication.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const pilot = read("public/request-pilot/index.html");
const pilotJs = read("public/components/executia-request-pilot-ux.js");
const pilotMain = pilot.match(/<main[\s\S]*?<\/main>/i)?.[0] || pilot;

const FROZEN_STATUSES = new Set(["FROZEN", "FROZEN_FOR_REVIEW", "LOCKED", "EVIDENCE_ANNEX_REVIEW", "ADMINISTRATIVE_ANNEX_REVIEW"]);

if (!FROZEN_STATUSES.has(manifest.status)) {
  fail(`request pilot manifest status must be frozen for review (got ${manifest.status})`);
}

for (const file of manifest.files) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing file: ${file}`);
}

for (const sheet of manifest.allowed_stylesheets) {
  if (!pilot.includes(sheet)) fail(`required stylesheet missing: ${sheet}`);
}

const stylesheetLinks = pilot.match(/<link[^>]+rel="stylesheet"[^>]*>/gi) || [];
if (stylesheetLinks.length !== manifest.allowed_stylesheets.length) {
  fail(
    `request pilot must load exactly ${manifest.allowed_stylesheets.length} stylesheets (found ${stylesheetLinks.length})`
  );
}

for (const forbidden of manifest.forbidden_stylesheets) {
  if (pilot.includes(forbidden)) fail(`forbidden stylesheet on request pilot: ${forbidden}`);
}

for (const phrase of manifest.forbidden_on_surface) {
  if (pilot.includes(phrase)) fail(`forbidden on request pilot surface: ${phrase}`);
}

if (pilot.includes("data-ex-env-header")) {
  fail("request pilot must not mount website header");
}

if (!pilot.includes("Administrative Annex")) fail("request pilot must label Administrative Annex");
if (!pilot.includes("Administrative Scope")) fail("request pilot must label Administrative Scope");
if (!pilot.includes("Administrative Outcome")) fail("request pilot must label Administrative Outcome");
if (!pilot.includes("Administrative Request Fields")) {
  fail("request pilot must label Administrative Request Fields");
}
if (!pilot.includes("Publication Sequence")) fail("request pilot must include publication sequence metadata");
if (!pilot.includes("Publication Navigation")) fail("request pilot must include publication navigation metadata");

if (!pilot.includes(manifest.publication_system.envelope)) {
  fail("request pilot missing publication envelope");
}

if (!pilotJs.includes("ex-publication-registry-row")) {
  fail("request pilot UX must render shared publication registry rows");
}

if (pilotJs.includes("<button") || pilotJs.includes("<form") || pilotJs.includes("fetch(")) {
  fail("request pilot UX must not use application UI patterns");
}

for (const item of manifest.administrative_scope) {
  if (!pilotJs.includes(item)) fail(`administrative scope missing in UX: ${item}`);
}

for (const item of manifest.administrative_outcome) {
  if (!pilotJs.includes(item)) fail(`administrative outcome missing in UX: ${item}`);
}

for (const field of manifest.administrative_fields) {
  if (!pilotJs.includes(field.label)) fail(`administrative field missing in UX: ${field.label}`);
}

let last = -1;
for (const section of manifest.protected_structure) {
  const key = section.id || section.mount;
  const needle = section.mount ? section.mount : `id="${key}"`;
  const i = pilot.indexOf(needle);
  if (i <= last) fail(`architecture drift — section order: ${key}`);
  last = i;
}

if (failed) process.exit(1);
console.log("EXECUTIA Request Pilot v1 publication verification passed.");
