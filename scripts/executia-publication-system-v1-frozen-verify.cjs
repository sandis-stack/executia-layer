#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication System v1 — locked authority verification. */

const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "governance", "publication-system-v1-frozen.json"), "utf8")
);
const program = JSON.parse(
  fs.readFileSync(path.join(root, "governance", "institutional-publication-program.json"), "utf8")
);

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

if (manifest.status !== "LOCKED") {
  fail("publication system must be LOCKED");
}

if (manifest.review_status !== "READY_FOR_GOVERNMENT_REVIEW") {
  fail("publication system review status must be READY_FOR_GOVERNMENT_REVIEW");
}

if (manifest.cto_verdict !== "ACCEPTED") {
  fail("publication system CTO verdict must be ACCEPTED");
}

if (manifest.freeze_status !== "ACTIVE") {
  fail("publication system freeze status must be ACTIVE");
}

if (manifest.structural_phase !== "CLOSED") {
  fail("structural phase must be CLOSED");
}

if (manifest.review_phase !== "ACTIVE") {
  fail("review phase must be ACTIVE");
}

if (manifest.program_status !== "CLOSED") {
  fail("publication program must be CLOSED");
}

if (!manifest.official_release) {
  fail("publication system must be officially released");
}

if (!manifest.cto_final_sign_off?.date) {
  fail("CTO final sign-off must be recorded");
}

if (program.status !== "LOCKED") {
  fail("institutional publication program must be LOCKED");
}

for (const file of manifest.frozen_surfaces) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing frozen surface: ${file}`);
}

if (manifest.deployment_status !== "PRODUCTION_RELEASED") {
  fail("publication system deployment status must be PRODUCTION_RELEASED");
}

for (const phase of manifest.validation_phases) {
  if (phase.id === "government_review") {
    if (phase.status !== "PENDING") fail("government review must be PENDING");
    continue;
  }
  if (phase.id === "production_deployment") {
    if (phase.status !== "COMPLETE") fail("production deployment must be COMPLETE");
    continue;
  }
  if (phase.status !== "COMPLETE") fail(`validation phase incomplete: ${phase.id}`);
}

if (manifest.cto_visual_review?.visual_defects_found !== false) {
  fail("CTO visual review must record no visual defects");
}

for (const rel of manifest.verification) {
  const script = rel.replace("node scripts/", "");
  if (!fs.existsSync(path.join(root, "scripts", script))) {
    fail(`verification script missing: ${script}`);
  }
}

const demoManifest = JSON.parse(read("governance/demonstration-v1-publication.json"));
const pilotManifest = JSON.parse(read("governance/request-pilot-v1-publication.json"));
const homeManifest = JSON.parse(read("governance/homepage-v1-frozen.json"));

for (const m of [demoManifest, pilotManifest, homeManifest]) {
  if (m.status !== "LOCKED") {
    fail(`surface manifest must be LOCKED: ${m.authority || m.url}`);
  }
  if (m.review_status !== "READY_FOR_GOVERNMENT_REVIEW") {
    fail(`surface review status must be READY_FOR_GOVERNMENT_REVIEW: ${m.authority || m.url}`);
  }
}

if (!read("docs/governance/publication-system-v1-final-sign-off.md").includes("OFFICIALLY RELEASED")) {
  fail("final sign-off document must record official release");
}

if (failed) process.exit(1);
console.log("EXECUTIA Publication System v1 locked verification passed.");
