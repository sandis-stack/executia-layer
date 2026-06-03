#!/usr/bin/env node
/**
 * Task 34 — production nav label verification + screenshots.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-34-nav-labels");
const BASE = "https://execution.executia.io";
const CANONICAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";
const FORBIDDEN_NAV = ["DEMONSTRATION", "ENGINE", "ENTRY", "EXECUTION TEST", "REGULATOR", "REQUEST PILOT"];

const ROUTES = [
  { id: "production-home", path: "/" },
  { id: "production-execution-test", path: "/execution-test/" },
  { id: "production-public-proof", path: "/public-proof/" },
  { id: "production-request-pilot", path: "/request-pilot/" }
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

function hashBuffer(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

async function captureRoute(page, route) {
  const url = `${BASE}${route.path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".ex-env-header", { timeout: 15000 });

  const header = page.locator(".ex-env-header").first();
  const headerHtml = (await header.innerHTML()).trim();
  const navText = (
    await page.locator(".ex-env-flow a").allInnerTexts()
  )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const aboveFoldPath = join(OUT_DIR, `${route.id}-above-fold.png`);
  await page.screenshot({
    path: aboveFoldPath,
    clip: { x: 0, y: 0, width: 1440, height: 720 }
  });

  const headerPath = join(OUT_DIR, `${route.id}-header-crop.png`);
  await header.screenshot({ path: headerPath });

  const headerCropHash = hashBuffer(await header.screenshot());

  return {
    url,
    navText,
    headerHtml,
    headerNormalized: normalizeHeader(`<div class="ex-env-header">${headerHtml}</div>`),
    aboveFoldPath,
    headerPath,
    headerCropHash
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = {};

  for (const route of ROUTES) {
    results[route.id] = await captureRoute(page, route);
    console.log("captured", route.id, results[route.id].navText);
  }

  await browser.close();

  const navs = ROUTES.map((r) => results[r.id].navText);
  const normalized = ROUTES.map((r) => results[r.id].headerNormalized);
  const cropHashes = ROUTES.map((r) => results[r.id].headerCropHash);

  const navOk = navs.every((n) => n === CANONICAL_NAV);
  const structureOk = new Set(normalized).size === 1;
  const forbiddenFound = FORBIDDEN_NAV.filter((label) =>
    navs.some((n) => n.includes(label))
  );

  const report = {
    pass: navOk && structureOk && forbiddenFound.length === 0,
    canonicalNav: CANONICAL_NAV,
    navOk,
    structureOk,
    forbiddenFound,
    navs,
    headerCropHashes: Object.fromEntries(ROUTES.map((r) => [r.id, results[r.id].headerCropHash])),
    routes: Object.fromEntries(
      ROUTES.map((r) => [
        r.id,
        {
          url: results[r.id].url,
          navText: results[r.id].navText,
          headerNormalized: results[r.id].headerNormalized,
          aboveFoldScreenshot: results[r.id].aboveFoldPath,
          headerCropScreenshot: results[r.id].headerPath
        }
      ])
    )
  };

  await writeFile(join(OUT_DIR, "production-header-verification.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, navOk, structureOk, forbiddenFound }, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
