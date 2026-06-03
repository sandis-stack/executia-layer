#!/usr/bin/env node
/**
 * Task 31 — production above-fold header screenshots + cross-route identity check.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-31-header-freeze");
const BASE = "https://execution.executia.io";
const CANONICAL_BRAND = "EXECUTIA™ EXECUTION GOVERNANCE INFRASTRUCTURE";
const CANONICAL_NAV = "HOME EXECUTION PROOF REQUEST PILOT";

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
  const brandText = await page.locator(".ex-env-brand").first().innerText();
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
    brandText: brandText.replace(/\s+/g, " ").trim(),
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
    console.log("captured", route.id, results[route.id].brandText);
  }

  await browser.close();

  const brands = ROUTES.map((r) => results[r.id].brandText);
  const navs = ROUTES.map((r) => results[r.id].navText);
  const normalized = ROUTES.map((r) => results[r.id].headerNormalized);
  const cropHashes = ROUTES.map((r) => results[r.id].headerCropHash);

  const brandOk = brands.every((b) => b.toUpperCase() === CANONICAL_BRAND);
  const navOk = navs.every((n) => n === CANONICAL_NAV);
  const structureOk = new Set(normalized).size === 1;
  const visualOk = new Set(cropHashes).size === 1;

  const report = {
    pass: brandOk && navOk && structureOk && visualOk,
    canonicalBrand: CANONICAL_BRAND,
    canonicalNav: CANONICAL_NAV,
    brandOk,
    navOk,
    structureOk,
    visualOk,
    brands,
    headerCropHashes: Object.fromEntries(ROUTES.map((r) => [r.id, results[r.id].headerCropHash])),
    routes: Object.fromEntries(
      ROUTES.map((r) => [
        r.id,
        {
          url: results[r.id].url,
          brandText: results[r.id].brandText,
          navText: results[r.id].navText,
          headerNormalized: results[r.id].headerNormalized,
          aboveFoldScreenshot: results[r.id].aboveFoldPath,
          headerCropScreenshot: results[r.id].headerPath
        }
      ])
    )
  };

  await writeFile(join(OUT_DIR, "production-header-verification.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, brandOk, navOk, structureOk, visualOk }, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
