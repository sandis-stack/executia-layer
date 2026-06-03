#!/usr/bin/env node
/**
 * Task 31 — verify renderHeader output for all four canonical public routes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-31-header-freeze");
const CANONICAL_SUBTITLE = "Execution Governance Infrastructure";
const CANONICAL_SUBTITLE_DISPLAY = "EXECUTION GOVERNANCE INFRASTRUCTURE";

const ROUTES = [
  { id: "local-home", pageId: "homepage", bodyClass: "ex-institutional-env ex-homepage-engine" },
  { id: "local-execution-test", pageId: "execution", bodyClass: "ex-institutional-env" },
  { id: "local-public-proof", pageId: "proof", bodyClass: "ex-institutional-env" },
  {
    id: "local-request-pilot",
    pageId: "request",
    bodyClass: "ex-institutional-env ex-request-pilot-page ex-institutional-publication"
  }
];

function normalizeHeader(html) {
  return html
    .replace(/\saria-current="page"/g, "")
    .replace(/\sclass="is-active"/g, "")
    .replace(/\sclass=""/g, "")
    .replace(/\s+>/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function createMockBody(bodyClass) {
  const classes = new Set(bodyClass.split(/\s+/).filter(Boolean));
  return {
    classList: {
      contains: (c) => classes.has(c),
      add: (c) => classes.add(c)
    },
    getAttribute: () => null
  };
}

function loadEnv(bodyClass) {
  const src = readFileSync(
    join(ROOT, "public/components/executia-institutional-environment.js"),
    "utf8"
  );
  const sandbox = {
    document: {
      body: createMockBody(bodyClass),
      readyState: "complete",
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => {},
      head: { appendChild: () => {} },
      dispatchEvent: () => {}
    },
    window: {},
    location: { pathname: "/" },
    CustomEvent: class {
      constructor() {}
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src.replace(/init\(\);/g, "/* init skipped */"), sandbox);
  return sandbox.EXECUTIA_INSTITUTIONAL_ENV;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const results = {};
  const normalizedSet = new Set();

  for (const route of ROUTES) {
    const env = loadEnv(route.bodyClass);
    const headerHtml = env.renderHeader(route.pageId).trim();
    const brandMatch = headerHtml.match(/<strong>EXECUTIA™<\/strong><span>([^<]+)<\/span>/);
    const navMatch = headerHtml.match(/<nav class="ex-env-flow"[\s\S]*?<\/nav>/);
    const brandText = brandMatch ? `EXECUTIA™ ${brandMatch[1]}` : null;
    const navText = navMatch
      ? navMatch[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null;
    const headerNormalized = normalizeHeader(headerHtml);

    results[route.id] = {
      pageId: route.pageId,
      bodyClass: route.bodyClass,
      brandText,
      navText,
      headerHtml,
      headerNormalized
    };
    normalizedSet.add(headerNormalized);
  }

  const subtitleOk = Object.values(results).every((r) => r.brandText === `EXECUTIA™ ${CANONICAL_SUBTITLE}`);
  const navOk = Object.values(results).every((r) => r.navText === "HOME EXECUTION PROOF REQUEST PILOT");
  const identicalStructure = normalizedSet.size === 1;

  const report = {
    pass: subtitleOk && navOk && identicalStructure,
    canonicalSubtitle: CANONICAL_SUBTITLE_DISPLAY,
    subtitleOk,
    navOk,
    identicalStructure,
    routes: results
  };

  writeFileSync(join(OUT_DIR, "local-header-dom.json"), JSON.stringify(results, null, 2));
  writeFileSync(join(OUT_DIR, "local-header-verification.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, subtitleOk, navOk, identicalStructure }, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}

main();
