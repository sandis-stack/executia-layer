#!/usr/bin/env node
/** Task 31 — verify served local headers match across four routes. */
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "docs/governance/screenshots/task-31-header-freeze");
const BASE = "http://127.0.0.1:3456";

const ROUTES = [
  { id: "local-home", path: "/" },
  { id: "local-execution-test", path: "/execution-test/" },
  { id: "local-public-proof", path: "/public-proof/" },
  { id: "local-request-pilot", path: "/request-pilot/" }
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = {};

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".ex-env-header");
    const header = page.locator(".ex-env-header").first();
    const headerHtml = await header.evaluate((el) => el.outerHTML);
    results[route.id] = {
      url: `${BASE}${route.path}`,
      brandText: (await page.locator(".ex-env-brand").first().innerText()).replace(/\s+/g, " ").trim(),
      navText: (await page.locator(".ex-env-flow a").allInnerTexts()).join(" ").replace(/\s+/g, " ").trim(),
      headerHtml,
      headerNormalized: normalizeHeader(headerHtml)
    };
  }

  await browser.close();

  const normalized = Object.values(results).map((r) => r.headerNormalized);
  const pass =
    new Set(normalized).size === 1 &&
    Object.values(results).every((r) => r.brandText.toUpperCase() === "EXECUTIA™ EXECUTION GOVERNANCE INFRASTRUCTURE") &&
    Object.values(results).every((r) => r.navText === "HOME EXECUTION PROOF REQUEST PILOT");

  await writeFile(join(OUT_DIR, "local-header-served.json"), JSON.stringify({ pass, routes: results }, null, 2));
  console.log(JSON.stringify({ pass }, null, 2));
  process.exitCode = pass ? 0 : 1;
}

main();
