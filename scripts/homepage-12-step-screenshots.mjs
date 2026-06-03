/**
 * Production 12-step assessment journey screenshots → docs/wireframes/
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "docs", "wireframes");
const BASE = "https://execution.executia.io/";
const NAMES = [
  "prod-01-country",
  "prod-02-sector",
  "prod-03-organization",
  "prod-04-process",
  "prod-05-generate-clicked",
  "prod-06-result-generated",
  "prod-07-executive-summary",
  "prod-08-detected-issues",
  "prod-09-recommended-actions",
  "prod-10-executia-evaluation",
  "prod-11-export-report",
  "prod-12-request-pilot-evaluation"
];

async function shotEl(page, name, selector) {
  const file = path.join(OUT_DIR, `${name}.png`);
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded({ timeout: 8000 });
  await page.waitForTimeout(200);
  await el.screenshot({ path: file, timeout: 10000 });
  console.log("saved", file);
}

async function fillJourney(page) {
  await page.evaluate(() => {
    const set = (id, val, mode) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = val;
      el.dataset.exIntakeConfirmed = mode;
    };
    set("timeline", "Norway", "selected");
    const domain = document.getElementById("domain");
    if (domain) {
      domain.value = "Energy";
      domain.dataset.exIntakeConfirmed = "selected";
    }
    set("budget", "Equinor ASA", "manual");
    set("outcome", "Supplier Payment", "manual");
    window.EXECUTIA_HOMEPAGE_ENGINE_UX?.onAuditFieldChange?.();
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(15000);

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#homeRunAuditBtn");
  await page.waitForFunction(() => window.EXECUTIA_HOMEPAGE_ENGINE_UX?.init, { timeout: 45000 });
  await page.evaluate(() => window.EXECUTIA_HOMEPAGE_ENGINE_UX?.init?.());

  await page.locator("#exHomeAuditForm").scrollIntoViewIfNeeded();

  await page.evaluate(() => {
    const el = document.getElementById("timeline");
    el.value = "Norway";
    el.dataset.exIntakeConfirmed = "selected";
  });
  await shotEl(page, NAMES[0], "#timeline");

  await page.evaluate(() => {
    const el = document.getElementById("domain");
    el.value = "Energy";
    el.dataset.exIntakeConfirmed = "selected";
  });
  await shotEl(page, NAMES[1], "#domain");

  await page.evaluate(() => {
    const el = document.getElementById("budget");
    el.value = "Equinor ASA";
    el.dataset.exIntakeConfirmed = "manual";
  });
  await shotEl(page, NAMES[2], "#budget");

  await page.evaluate(() => {
    const el = document.getElementById("outcome");
    el.value = "Supplier Payment";
    el.dataset.exIntakeConfirmed = "manual";
  });
  await shotEl(page, NAMES[3], "#outcome");

  await fillJourney(page);
  const btn = page.locator("#homeRunAuditBtn");
  await btn.waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.getElementById("homeRunAuditBtn").disabled, { timeout: 15000 });
  await shotEl(page, NAMES[4], "#exHomeAuditGenerate");
  await btn.click();

  await page.waitForSelector("#exHomeResultSection:not([hidden])", { timeout: 60000 });
  await page.waitForSelector("#homeResultExecutiveSummary tr", { timeout: 60000 });

  await shotEl(page, NAMES[5], "#exHomeResultSection");
  await shotEl(page, NAMES[6], "#homeResultExecutiveSummary");
  await shotEl(page, NAMES[7], "#homeDetectedIssuesTable");
  await shotEl(page, NAMES[8], "#homeRecommendedActions");
  await shotEl(page, NAMES[9], "#homeEvaluationScale");
  await shotEl(page, NAMES[10], "#homeExportPdfBtn");
  await shotEl(page, NAMES[11], "#homeRequestPilotBtn");

  await browser.close();
  for (const n of NAMES) console.log(path.join(OUT_DIR, `${n}.png`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
