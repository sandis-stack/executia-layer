#!/usr/bin/env node
/**
 * Task 34 — verify canonical public nav labels across four routes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-34-nav-labels");
const CANONICAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";
const FORBIDDEN_NAV = ["DEMONSTRATION", "ENGINE", "ENTRY", "EXECUTION TEST", "REGULATOR", "REQUEST PILOT"];

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
    const footerHtml = env.renderFooter(route.pageId).trim();
    const navMatch = headerHtml.match(/<nav class="ex-env-flow"[\s\S]*?<\/nav>/);
    const footerNavMatch = footerHtml.match(/<nav class="ex-env-footer-flow"[\s\S]*?<\/nav>/);
    const navText = navMatch
      ? navMatch[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null;
    const footerNavText = footerNavMatch
      ? footerNavMatch[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null;
    const headerNormalized = normalizeHeader(headerHtml);

    results[route.id] = {
      pageId: route.pageId,
      navText,
      footerNavText,
      headerHtml,
      headerNormalized
    };
    normalizedSet.add(headerNormalized);
  }

  const navOk = Object.values(results).every((r) => r.navText === CANONICAL_NAV);
  const footerNavOk = Object.values(results).every(
    (r) => r.footerNavText === CANONICAL_NAV || r.footerNavText === null
  );
  const identicalStructure = normalizedSet.size === 1;
  const forbiddenFound = FORBIDDEN_NAV.filter((label) =>
    Object.values(results).some(
      (r) =>
        (r.navText && r.navText.includes(label)) ||
        (r.footerNavText && r.footerNavText.includes(label))
    )
  );

  const report = {
    pass: navOk && footerNavOk && identicalStructure && forbiddenFound.length === 0,
    canonicalNav: CANONICAL_NAV,
    navOk,
    footerNavOk,
    identicalStructure,
    forbiddenFound,
    routes: results
  };

  writeFileSync(join(OUT_DIR, "local-header-verification.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      { pass: report.pass, navOk, footerNavOk, identicalStructure, forbiddenFound },
      null,
      2
    )
  );
  process.exitCode = report.pass ? 0 : 1;
}

main();
