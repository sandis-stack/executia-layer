#!/usr/bin/env node
/**
 * Task 35 — production navigation architecture verification + screenshots.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-35-nav-architecture");

const EXECUTION_BASE = "https://execution.executia.io";
const ENTRY_BASE = "https://executia.io";
const ENTRY_LAYER_ORIGIN = "https://executia.io/";
const INSTITUTIONAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";
const ENTRY_NAV_LABELS = ["ENTRY", "GLOBAL", "INSTITUTIONAL"];
const INSTITUTIONAL_FORBIDDEN = ["ENTRY", "GLOBAL", "INSTITUTIONAL"];

const EXECUTION_ROUTES = [
  { id: "execution-home", path: "/" },
  { id: "execution-test", path: "/execution-test/" },
  { id: "public-proof", path: "/public-proof/" },
  { id: "request-pilot", path: "/request-pilot/" }
];

function hashBuffer(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

async function captureExecutionRoute(page, route) {
  const url = `${EXECUTION_BASE}${route.path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".ex-env-header", { timeout: 15000 });

  const header = page.locator(".ex-env-header").first();
  const brandHref = await page.locator(".ex-env-brand").first().getAttribute("href");
  const navText = (await page.locator(".ex-env-flow a").allInnerTexts())
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
    brandHref,
    navText,
    aboveFoldPath,
    headerPath,
    headerCropHash
  };
}

async function captureEntry(page) {
  const url = `${ENTRY_BASE}/`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".site-header", { timeout: 15000 });

  const header = page.locator(".site-header").first();
  const brandHref = await page.locator(".site-header .brand").first().getAttribute("href");
  const navText = (await page.locator(".site-header .nav a").allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const ctaText = (await page.locator(".header-cta a").allInnerTexts()).join(" ").trim();
  const brandSub = await page.locator(".site-header .brand-sub").innerText();

  const aboveFoldPath = join(OUT_DIR, "entry-home-above-fold.png");
  await page.screenshot({
    path: aboveFoldPath,
    clip: { x: 0, y: 0, width: 1440, height: 720 }
  });

  const headerPath = join(OUT_DIR, "entry-home-header-crop.png");
  await header.screenshot({ path: headerPath });

  return {
    url,
    brandHref,
    brandSub,
    navText,
    ctaText,
    aboveFoldPath,
    headerPath
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const execution = {};
  for (const route of EXECUTION_ROUTES) {
    execution[route.id] = await captureExecutionRoute(page, route);
    console.log("execution", route.id, execution[route.id].brandHref, execution[route.id].navText);
  }

  const entry = await captureEntry(page);
  console.log("entry", entry.brandHref, entry.navText, entry.ctaText);

  await browser.close();

  const executionNavOk = Object.values(execution).every((r) => r.navText === INSTITUTIONAL_NAV);
  const executionBrandOk = Object.values(execution).every((r) => r.brandHref === ENTRY_LAYER_ORIGIN);
  const executionForbidden = INSTITUTIONAL_FORBIDDEN.filter((label) =>
    Object.values(execution).some((r) => r.navText.includes(label))
  );

  const entryNavOk = ENTRY_NAV_LABELS.every((label) => entry.navText.includes(label));
  const entryForbidden = ["HOME", "VALIDATE", "PILOT"].filter(
    (label) => entry.navText.toUpperCase().includes(label)
  );
  const entryBrandOk = entry.brandHref === "/" || entry.brandHref === ENTRY_LAYER_ORIGIN;
  const entrySubOk = /execution standard/i.test(entry.brandSub);
  const entryCtaOk = /enter execution test/i.test(entry.ctaText);

  const report = {
    pass:
      executionNavOk &&
      executionBrandOk &&
      executionForbidden.length === 0 &&
      entryNavOk &&
      entryForbidden.length === 0 &&
      entryBrandOk &&
      entrySubOk &&
      entryCtaOk,
    entryLayerOrigin: ENTRY_LAYER_ORIGIN,
    execution: {
      navOk: executionNavOk,
      brandOk: executionBrandOk,
      forbiddenFound: executionForbidden,
      routes: execution
    },
    entry: {
      navOk: entryNavOk,
      brandOk: entryBrandOk,
      sublineOk: entrySubOk,
      ctaOk: entryCtaOk,
      forbiddenFound: entryForbidden,
      ...entry
    }
  };

  await writeFile(
    join(OUT_DIR, "production-nav-architecture-verification.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        pass: report.pass,
        executionNavOk,
        executionBrandOk,
        entryNavOk,
        entryCtaOk
      },
      null,
      2
    )
  );
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
