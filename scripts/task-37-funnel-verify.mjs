#!/usr/bin/env node
/**
 * Task 37 — institutional funnel verification (local + optional production).
 * Usage: node scripts/task-37-funnel-verify.mjs [--production]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-37-funnel");
const production = process.argv.includes("--production");
const BASE = production ? "https://execution.executia.io" : null;

const CANONICAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";
const FORBIDDEN_NAV = [
  "ENGINE",
  "ENTRY",
  "DEMO",
  "REGULATOR",
  "REQUEST PILOT",
  "EXECUTION TEST",
  "DEMONSTRATION"
];

const ROUTES = [
  {
    id: "home",
    path: "/",
    funnelContext: "STEP 1 OF 4 — HOME",
    activeNavHref: "/",
    activeFunnelLabel: "HOME"
  },
  {
    id: "execution-test",
    path: "/execution-test/",
    funnelContext: "STEP 2 OF 4 — VALIDATE EXECUTION",
    activeNavHref: "/execution-test/",
    activeFunnelLabel: "VALIDATE EXECUTION"
  },
  {
    id: "public-proof",
    path: "/public-proof/",
    funnelContext: "STEP 3 OF 4 — EXECUTION PROOF",
    activeNavHref: "/public-proof/",
    activeFunnelLabel: "PROOF"
  },
  {
    id: "request-pilot",
    path: "/request-pilot/",
    funnelContext: "STEP 4 OF 4 — INSTITUTIONAL PILOT",
    activeNavHref: "/request-pilot/",
    activeFunnelLabel: "PILOT"
  }
];

const PROOF_FORBIDDEN = ["Review ID is missing"];
const PROOF_REQUIRED = ["PUBLIC EXECUTION PROOF", "RUN VALIDATION"];

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
      await fetch(`${base}/`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("server not ready");
}

async function captureRoute(page, base, route) {
  const url = `${base}${route.path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".ex-env-header", { timeout: 15000 });
  await page.waitForSelector(".ex-env-funnel", { timeout: 15000 });

  const bodyText = await page.locator("body").innerText();
  const navText = (await page.locator(".ex-env-flow a").allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const funnelContext = (await page.locator(".ex-env-funnel-context").innerText()).trim();
  const brandHref = await page.locator(".ex-env-brand").first().getAttribute("href");
  const footerBrandHref = await page
    .locator(".ex-env-footer-brand")
    .first()
    .getAttribute("href");
  const footerNav = (await page.locator(".ex-env-footer-flow a").allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const funnelStripText = (await page.locator(".ex-env-funnel-strip").innerText())
    .replace(/\s+/g, " ")
    .trim();

  const navActive =
    (await page.locator(`.ex-env-flow a[href="${route.activeNavHref}"].is-active`).count()) >
      0 ||
    (await page.locator(
      `.ex-env-flow a[href="${route.activeNavHref}"][aria-current="page"]`
    ).count()) > 0;

  const funnelActive =
    (await page
      .locator(`.ex-env-funnel-step.is-active a:has-text("${route.activeFunnelLabel}")`)
      .count()) > 0;

  const aboveFoldPath = join(OUT_DIR, `${route.id}-above-fold.png`);
  await page.screenshot({
    path: aboveFoldPath,
    clip: { x: 0, y: 0, width: 1440, height: 820 }
  });

  const headerFunnelPath = join(OUT_DIR, `${route.id}-header-funnel-crop.png`);
  const crop = page.locator(".ex-env-header, .ex-env-funnel").first();
  await page.locator(".ex-env-header").first().waitFor();
  await page.locator(".ex-env-funnel").first().waitFor();
  const box = await page.evaluate(() => {
    const header = document.querySelector(".ex-env-header");
    const funnel = document.querySelector(".ex-env-funnel");
    if (!header || !funnel) return null;
    const r1 = header.getBoundingClientRect();
    const r2 = funnel.getBoundingClientRect();
    return {
      x: 0,
      y: 0,
      width: Math.max(r1.width, r2.width, 1440),
      height: Math.ceil(r2.bottom)
    };
  });
  if (box) {
    await page.screenshot({ path: headerFunnelPath, clip: box });
  }

  return {
    url,
    bodyText,
    navText,
    funnelContext,
    brandHref,
    footerBrandHref,
    footerNav,
    funnelStripText,
    navActive,
    funnelActive,
    aboveFoldPath,
    headerFunnelPath
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let proc;
  let base = BASE;

  if (!production) {
    const port = 3550 + Math.floor(Math.random() * 200);
    base = `http://127.0.0.1:${port}`;
    proc = await startStaticServer(port);
    await waitForServer(base);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const routes = {};

  for (const route of ROUTES) {
    routes[route.id] = await captureRoute(page, base, route);
    console.log("captured", route.id, routes[route.id].funnelContext);
  }

  await browser.close();
  if (proc) proc.kill("SIGTERM");

  const checks = [];
  for (const route of ROUTES) {
    const r = routes[route.id];
    const funnelStripText = r.funnelStripText || "";
    const shellNavText = [r.navText, funnelStripText, r.footerNav].join(" ");
    const forbiddenInShellNav = FORBIDDEN_NAV.filter((label) =>
      shellNavText.includes(label)
    );
    checks.push({
      id: route.id,
      navOk: r.navText === CANONICAL_NAV,
      funnelContextOk: r.funnelContext === route.funnelContext,
      navActiveOk: r.navActive,
      funnelActiveOk: r.funnelActive,
      brandOk: r.brandHref === "https://executia.io/",
      footerBrandOk: r.footerBrandHref === "https://executia.io/",
      footerNavOk: r.footerNav === CANONICAL_NAV,
      forbiddenInShellNav
    });
  }

  const proof = routes["public-proof"];
  const pilot = routes["request-pilot"];
  const proofOk =
    PROOF_REQUIRED.every((s) => proof.bodyText.includes(s)) &&
    !PROOF_FORBIDDEN.some((s) => proof.bodyText.includes(s));
  const pilotOk =
    pilot.bodyText.includes("STEP 4 OF 4") &&
    pilot.bodyText.includes(
      "Final onboarding stage after validation and proof review."
    );

  const pass =
    checks.every(
      (c) =>
        c.navOk &&
        c.funnelContextOk &&
        c.navActiveOk &&
        c.funnelActiveOk &&
        c.brandOk &&
        c.footerBrandOk &&
        c.footerNavOk &&
        c.forbiddenInShellNav.length === 0
    ) &&
    proofOk &&
    pilotOk;

  const report = {
    pass,
    mode: production ? "production" : "local",
    base,
    checks,
    proofOk,
    pilotOk,
    routes,
    screenshotsDir: OUT_DIR
  };

  const outName = production
    ? "production-funnel-verification.json"
    : "local-funnel-verification.json";
  await writeFile(join(OUT_DIR, outName), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass, checks, proofOk, pilotOk }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
