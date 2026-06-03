#!/usr/bin/env node
/**
 * Task 35 — verify canonical EXECUTIA navigation architecture (layer-separated headers).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-35-nav-architecture");

const INSTITUTIONAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";
const ENTRY_NAV = "ENTRY GLOBAL INSTITUTIONAL";
const ENTRY_FORBIDDEN = ["HOME", "VALIDATE EXECUTION", "PROOF", "PILOT"];
const INSTITUTIONAL_FORBIDDEN = ["ENTRY", "GLOBAL", "INSTITUTIONAL", "EXECUTION STANDARD"];

const EXECUTION_ROUTES = [
  { id: "execution-home", pageId: "homepage", bodyClass: "ex-institutional-env ex-homepage-engine" },
  { id: "execution-test", pageId: "execution", bodyClass: "ex-institutional-env" },
  { id: "public-proof", pageId: "proof", bodyClass: "ex-institutional-env" },
  {
    id: "request-pilot",
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

function loadEnv(bodyClass, hostname) {
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
    location: { pathname: "/", hostname },
    CustomEvent: class {
      constructor() {}
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src.replace(/init\(\);/g, "/* init skipped */"), sandbox);
  return sandbox.EXECUTIA_INSTITUTIONAL_ENV;
}

function extractNavText(headerHtml) {
  const navMatch = headerHtml.match(/<nav class="ex-env-flow[^"]*"[\s\S]*?<\/nav>/);
  return navMatch ? navMatch[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null;
}

function extractBrandHref(headerHtml) {
  const m = headerHtml.match(/<a class="ex-env-brand[^"]*" href="([^"]+)"/);
  return m ? m[1] : null;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const execution = {};
  const entry = loadEnv("ex-institutional-env", "executia.io");
  const entryHeader = entry.renderHeader("homepage").trim();
  const entryNavText = extractNavText(entryHeader);
  const entryBrandHref = extractBrandHref(entryHeader);
  const entryCta = entryHeader.includes("Enter Execution Test");

  for (const route of EXECUTION_ROUTES) {
    const env = loadEnv(route.bodyClass, "execution.executia.io");
    const headerHtml = env.renderHeader(route.pageId).trim();
    execution[route.id] = {
      pageId: route.pageId,
      navText: extractNavText(headerHtml),
      brandHref: extractBrandHref(headerHtml),
      headerNormalized: normalizeHeader(headerHtml),
      headerHtml
    };
  }

  const executionNavOk = Object.values(execution).every((r) => r.navText === INSTITUTIONAL_NAV);
  const executionBrandOk = Object.values(execution).every(
    (r) => r.brandHref === "https://executia.io/"
  );
  const executionStructureOk =
    new Set(Object.values(execution).map((r) => r.headerNormalized)).size === 1;
  const executionForbidden = INSTITUTIONAL_FORBIDDEN.filter((label) =>
    Object.values(execution).some((r) => r.navText && r.navText.includes(label))
  );

  const entryNavOk = entryNavText === ENTRY_NAV;
  const entryBrandOk = entryBrandHref === "https://executia.io/";
  const entryForbidden = ENTRY_FORBIDDEN.filter(
    (label) => entryNavText && entryNavText.includes(label)
  );
  const entryLayer = entry.resolvePublicLayer() === "entry";
  const executionLayer = loadEnv(EXECUTION_ROUTES[0].bodyClass, "execution.executia.io").resolvePublicLayer() === "execution";

  const report = {
    pass:
      executionNavOk &&
      executionBrandOk &&
      executionStructureOk &&
      executionForbidden.length === 0 &&
      entryNavOk &&
      entryBrandOk &&
      entryCta &&
      entryForbidden.length === 0 &&
      entryLayer &&
      executionLayer,
    entryLayerOrigin: "https://executia.io/",
    entrySiteNote:
      "executia.io is served from a separate Vercel deployment (not this repo). ENTRY header path is defensive when hostname is executia.io.",
    institutionalNav: INSTITUTIONAL_NAV,
    entryNav: ENTRY_NAV,
    execution: {
      navOk: executionNavOk,
      brandOk: executionBrandOk,
      identicalStructure: executionStructureOk,
      forbiddenFound: executionForbidden,
      routes: execution
    },
    entry: {
      navOk: entryNavOk,
      brandOk: entryBrandOk,
      ctaOk: entryCta,
      forbiddenFound: entryForbidden,
      navText: entryNavText,
      brandHref: entryBrandHref,
      headerHtml: entryHeader
    }
  };

  writeFileSync(join(OUT_DIR, "local-nav-architecture-verification.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        pass: report.pass,
        executionNavOk,
        executionBrandOk,
        entryNavOk,
        entryBrandOk,
        entryCta
      },
      null,
      2
    )
  );
  process.exitCode = report.pass ? 0 : 1;
}

main();
