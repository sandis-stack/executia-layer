#!/usr/bin/env node
"use strict";

/** EXECUTIA Publication System Consistency v2 — Standard, Evidence Annex, Administrative Annex. */

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

function normalize(html) {
  return html.replace(/\s+/g, " ").trim();
}

function extractRegistry(html, className) {
  const marker = `<div class="ex-standard-authority ex-standard-registry ${className}">`;
  const start = html.indexOf(marker);
  if (start < 0) return "";
  let depth = 1;
  let pos = start + marker.length;
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 4;
    } else {
      depth -= 1;
      pos = nextClose + 6;
    }
  }
  return normalize(html.slice(start, pos));
}

function extractTerminalSection(html, sectionId) {
  const start = html.indexOf(`id="${sectionId}"`);
  if (start < 0) return "";
  const sectionStart = html.lastIndexOf("<section", start);
  const sectionEnd = html.indexOf("</section>", start);
  if (sectionStart < 0 || sectionEnd < 0) return "";
  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

const home = read("public/index.html");
const demo = read("public/demonstration/index.html");
const pilot = read("public/request-pilot/index.html");
const css = read("public/components/executia-institutional-environment.css");
const envJs = read("public/components/executia-institutional-environment.js");

const PUBLICATION_SEQUENCE = extractRegistry(home, "ex-publication-sequence-registry");
const PUBLICATION_IDENTITY = extractRegistry(home, "ex-publication-identity-registry");
const TERMINAL_ROW = normalize(
  `<div class="ex-standard-authority ex-standard-registry ex-publication-terminal-registry">
          <div class="ex-standard-authority-item ex-standard-registry-row">
            <span class="ex-publication-registry-label">Document State</span>
            <p>FINAL</p>
          </div>
        </div>`
);

const REQUIRED_TOKENS = [
  "--ex-pub-body: 13px",
  "--ex-pub-label: 8px",
  "--ex-pub-label-color: #576674",
  "--ex-pub-label-weight: 400",
  "--ex-pub-label-color:",
  "--ex-pub-value-color: #1a2d42",
  "--ex-pub-line: 1.31",
  "--ex-pub-row-pad: 4px 11px",
  "--ex-pub-label-col: 6.5rem",
  "--ex-pub-index-col: 2.25rem",
  "--ex-pub-gutter: 22px",
  "--ex-pub-section-gap: 13px",
  "--ex-pub-section-label-spacing: 0.102em"
];

const ANNEX_TOKEN_BLOCK = css.match(
  /body\.ex-demonstration-page\.ex-institutional-publication,\s*body\.ex-request-pilot-page\.ex-institutional-publication\s*\{[\s\S]*?\}/
)?.[0] || "";

for (const token of REQUIRED_TOKENS) {
  if (!css.includes(token)) fail(`publication token missing from CSS: ${token}`);
  if (!ANNEX_TOKEN_BLOCK.includes(token.split(":")[0])) {
    fail(`annex publication token missing: ${token.split(":")[0]}`);
  }
}

for (const page of [home, demo, pilot]) {
  if (page.includes("data-ex-env-footer")) fail("publication surface must not mount footer metadata");
  if (page.includes("ex-publication-header")) fail("publication surface must not use legacy publication header");
  if (page.includes("ex-standard-publication-end")) fail("publication surface must not use publication end mount");
  if (page.includes("Purpose")) fail("publication surface must not expose Purpose metadata");
  if (page.includes("Defined for")) fail("publication surface must not expose Defined for metadata");
  if (page.includes("The Execution Governance Standard")) fail("publication surface must not use legacy standard title");
  if (page.includes("ex-standard-hero")) fail("publication surface must not use hero styling");
  if (page.includes("<button")) fail("publication surface must not expose button UI");
  if (page.includes("<form")) fail("publication surface must not expose form UI");
  if (page.includes("ex-inst-card")) fail("publication surface must not expose card UI");
}

for (const [label, page] of [
  ["demonstration", demo],
  ["request pilot", pilot]
]) {
  const sequence = extractRegistry(page, "ex-publication-sequence-registry");
  const identity = extractRegistry(page, "ex-publication-identity-registry");
  if (sequence !== PUBLICATION_SEQUENCE) {
    fail(`${label} publication sequence must match Standard`);
  }
  if (identity !== PUBLICATION_IDENTITY) {
    fail(`${label} publication identity must match Standard`);
  }
  if (!page.includes("ex-publication-document-open")) fail(`${label} must open as publication document registry`);
  if (!page.includes("ex-standard-block--terminal")) fail(`${label} must terminate with document state section`);
}

for (const [label, page, sectionId] of [
  ["homepage", home, "exStandardDocumentState"],
  ["demonstration", demo, "exDemoDocumentState"],
  ["request pilot", pilot, "exPilotDocumentState"]
]) {
  const terminal = extractTerminalSection(page, sectionId);
  if (!terminal.includes("Document State")) fail(`${label} missing document state label`);
  if (!/<p>FINAL<\/p>/.test(terminal)) fail(`${label} missing FINAL document state value`);
  const articleEnd = page.indexOf("</article>");
  const terminalEnd = page.indexOf("</section>", page.indexOf(`id="${sectionId}"`));
  const afterTerminal = page.slice(terminalEnd + "</section>".length, articleEnd).replace(/\s+/g, "");
  if (afterTerminal.length > 0) fail(`${label} must not contain content after document state`);
}

if (!envJs.includes("if (!isPublicationSurface(pageId))")) {
  fail("institutional environment must suppress footer on all publication surfaces");
}

const FORBIDDEN_PERCEPTION = [
  "ex-publication-header::before",
  "--ex-pub-label: 9px",
  "--ex-pub-line: 1.55",
  "var(--ex-ds-s8, 8px) var(--ex-ds-s16, 16px)"
];

for (const pattern of FORBIDDEN_PERCEPTION) {
  if (ANNEX_TOKEN_BLOCK.includes(pattern)) fail(`annex visual tokens diverge: ${pattern}`);
}

if (failed) process.exit(1);
console.log("CONSISTENT");
