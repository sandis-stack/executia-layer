#!/usr/bin/env node
/**
 * Task 36 — public proof demonstration verification + screenshots.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { mkdir as mkdirP } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-36-public-proof");
const CANONICAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";
const FORBIDDEN = ["Review ID is missing", "DEMONSTRATION", "ENGINE"];

const REQUIRED_SECTIONS = [
  "PUBLIC EXECUTION PROOF",
  "EXECUTION SUMMARY",
  "GOVERNANCE RESULT",
  "PROOF CHAIN",
  "EVIDENCE RECORDS",
  "EXECUTIA RESULT",
  "RUN VALIDATION",
  "REQUEST PILOT"
];

function hashBuffer(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

function startStaticServer(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "python3",
      ["-m", "http.server", String(port), "--bind", "127.0.0.1"],
      { cwd: join(ROOT, "public"), stdio: ["ignore", "pipe", "pipe"] }
    );
    const timer = setTimeout(() => reject(new Error("static server timeout")), 8000);
    const onReady = () => {
      clearTimeout(timer);
      resolve(proc);
    };
    proc.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Serving HTTP")) onReady();
    });
    proc.stderr.on("data", (chunk) => {
      if (chunk.toString().includes("Serving HTTP")) onReady();
    });
    setTimeout(onReady, 1200);
    proc.on("error", reject);
  });
}

async function waitForServer(base, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(`${base}/public-proof/`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("server not ready");
}

async function capture(page, base, id, path) {
  const url = `${base}${path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".ex-env-header", { timeout: 15000 });
  await page.waitForSelector("#app", { timeout: 15000 });

  const bodyText = await page.locator("body").innerText();
  const navText = (await page.locator(".ex-env-flow a").allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const proofNavActive =
    (await page.locator('.ex-env-flow a[href="/public-proof/"].is-active').count()) > 0 ||
    (await page.locator('.ex-env-flow a[href="/public-proof/"][aria-current="page"]').count()) > 0;

  const header = page.locator(".ex-env-header").first();
  const aboveFoldPath = join(OUT_DIR, `${id}-above-fold.png`);
  await page.screenshot({
    path: aboveFoldPath,
    clip: { x: 0, y: 0, width: 1440, height: 720 }
  });
  const headerPath = join(OUT_DIR, `${id}-header-crop.png`);
  await header.screenshot({ path: headerPath });

  return { url, bodyText, navText, aboveFoldPath, headerPath, proofNavActive };
}

async function main() {
  const port = 3456 + Math.floor(Math.random() * 200);
  const base = `http://127.0.0.1:${port}`;
  await mkdirP(OUT_DIR, { recursive: true });

  let proc;
  try {
    proc = await startStaticServer(port);
    await waitForServer(base);
  } catch (e) {
    console.error("local server failed", e.message);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const local = await capture(page, base, "local-public-proof", "/public-proof/");
  const ctaValidation = await page.locator('a.btn.primary[href="/execution-test/"]').count();
  const ctaPilot = await page.locator('a.btn.soft[href="/request-pilot/"]').count();
  await browser.close();
  if (proc) proc.kill("SIGTERM");

  const sectionOk = REQUIRED_SECTIONS.every((s) => local.bodyText.includes(s));
  const proofNavActive = local.proofNavActive;
  const forbiddenFound = FORBIDDEN.filter((f) => local.bodyText.includes(f));
  const navOk = local.navText === CANONICAL_NAV;
  const report = {
    pass:
      sectionOk &&
      forbiddenFound.length === 0 &&
      navOk &&
      ctaValidation > 0 &&
      ctaPilot > 0 &&
      proofNavActive,
    local,
    checks: {
      sectionOk,
      forbiddenFound,
      navOk,
      navText: local.navText,
      ctaValidation,
      ctaPilot,
      proofNavActive
    },
    screenshots: {
      aboveFold: local.aboveFoldPath,
      header: local.headerPath
    }
  };

  writeFileSync(
    join(OUT_DIR, "local-public-proof-verification.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
