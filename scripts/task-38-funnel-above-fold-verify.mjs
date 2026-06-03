#!/usr/bin/env node
/**
 * Task 38 — funnel above-the-fold visibility (local + optional production).
 * Usage: node scripts/task-38-funnel-above-fold-verify.mjs [--production]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-38-funnel-visible");
const production = process.argv.includes("--production");
const BASE = production ? "https://execution.executia.io" : null;
const VIEWPORT_TOP_PX = 800;

const CANONICAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";
const FUNNEL_STRIP = "HOME → VALIDATE EXECUTION → PROOF → PILOT";

const ROUTES = [
  {
    id: "home",
    path: "/",
    funnelContext: "STEP 1 OF 4 — HOME",
    activeFunnelLabel: "HOME"
  },
  {
    id: "execution-test",
    path: "/execution-test/",
    funnelContext: "STEP 2 OF 4 — VALIDATE EXECUTION",
    activeFunnelLabel: "VALIDATE EXECUTION"
  },
  {
    id: "public-proof",
    path: "/public-proof/",
    funnelContext: "STEP 3 OF 4 — EXECUTION PROOF",
    activeFunnelLabel: "PROOF"
  },
  {
    id: "request-pilot",
    path: "/request-pilot/",
    funnelContext: "STEP 4 OF 4 — INSTITUTIONAL PILOT",
    activeFunnelLabel: "PILOT"
  }
];

function startStaticServer(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "python3",
      ["-m", "http.server", String(port), "--bind", "127.0.0.1"],
      { cwd: join(ROOT, "public"),
      stdio: ["ignore", "pipe", "pipe"] }
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
  await page.waitForSelector(".ex-env-funnel", { timeout: 15000 });

  const funnelContext = (await page.locator(".ex-env-funnel-context").innerText()).trim();
  const funnelStripText = (await page.locator(".ex-env-funnel-strip").innerText())
    .replace(/\s+/g, " ")
    .trim();
  const brandHref = await page.locator(".ex-env-brand").first().getAttribute("href");

  const funnelActive =
    (await page
      .locator(`.ex-env-funnel-step.is-active a:has-text("${route.activeFunnelLabel}")`)
      .count()) > 0;

  const layout = await page.evaluate((topPx) => {
    const header = document.querySelector(".ex-env-header");
    const funnel = document.querySelector(".ex-env-funnel");
    const strip = document.querySelector(".ex-env-funnel-strip");
    const context = document.querySelector(".ex-env-funnel-context");
    const band = document.querySelector(".ex-env-chrome-band");
    if (!funnel || !strip) return { ok: false, reason: "missing-funnel" };
    const fr = funnel.getBoundingClientRect();
    const sr = strip.getBoundingClientRect();
    const cr = context ? context.getBoundingClientRect() : sr;
    const hr = header ? header.getBoundingClientRect() : null;
    return {
      ok: fr.top >= 0 && sr.bottom <= topPx && cr.bottom <= topPx,
      funnelTop: fr.top,
      funnelBottom: fr.bottom,
      stripBottom: sr.bottom,
      contextBottom: cr.bottom,
      headerBottom: hr ? hr.bottom : null,
      hasChromeBand: Boolean(band),
      scrollY: window.scrollY
    };
  }, VIEWPORT_TOP_PX);

  const aboveFoldPath = join(OUT_DIR, `${route.id}-above-fold.png`);
  await page.screenshot({
    path: aboveFoldPath,
    clip: { x: 0, y: 0, width: 1440, height: 820 }
  });

  const headerFunnelPath = join(OUT_DIR, `${route.id}-header-funnel-crop.png`);
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

  const comprehensionAudit =
    layout.ok &&
    funnelContext === route.funnelContext &&
    funnelActive &&
    funnelStripText === FUNNEL_STRIP &&
    brandHref === "https://executia.io/";

  return {
    url,
    funnelContext,
    funnelStripText,
    brandHref,
    funnelActive,
    layout,
    comprehensionAudit,
    aboveFoldPath,
    headerFunnelPath
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let proc;
  let base = BASE;

  if (!production) {
    const port = 3580 + Math.floor(Math.random() * 200);
    base = `http://127.0.0.1:${port}`;
    proc = await startStaticServer(port);
    await waitForServer(base);
  }

  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 1440, height: 900, id: "desktop" },
    { width: 390, height: 844, id: "mobile" }
  ];
  const routes = {};
  const viewportResults = {};

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const vpRoutes = {};
    for (const route of ROUTES) {
      vpRoutes[route.id] = await captureRoute(page, base, route);
      if (vp.id === "desktop") routes[route.id] = vpRoutes[route.id];
    }
    viewportResults[vp.id] = vpRoutes;
    await page.close();
  }

  await browser.close();
  if (proc) proc.kill("SIGTERM");

  const checks = ROUTES.map((route) => {
    const r = routes[route.id];
    const mobile = viewportResults.mobile[route.id];
    return {
      id: route.id,
      funnelContextOk: r.funnelContext === route.funnelContext,
      funnelActiveOk: r.funnelActive,
      brandOk: r.brandHref === "https://executia.io/",
      aboveFoldDesktopOk: r.layout.ok,
      aboveFoldMobileOk: mobile.layout.ok,
      chromeBandOk: r.layout.hasChromeBand,
      comprehensionAudit: r.comprehensionAudit && mobile.comprehensionAudit
    };
  });

  const pass = checks.every(
    (c) =>
      c.funnelContextOk &&
      c.funnelActiveOk &&
      c.brandOk &&
      c.aboveFoldDesktopOk &&
      c.aboveFoldMobileOk &&
      c.chromeBandOk &&
      c.comprehensionAudit
  );

  const report = {
    pass,
    comprehensionAudit: pass ? "PASS" : "FAIL",
    viewportTopPx: VIEWPORT_TOP_PX,
    mode: production ? "production" : "local",
    base,
    checks,
    routes,
    viewportResults,
    screenshotsDir: OUT_DIR
  };

  const outName = production
    ? "production-funnel-above-fold-verification.json"
    : "local-funnel-above-fold-verification.json";
  await writeFile(join(OUT_DIR, outName), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        pass,
        comprehensionAudit: report.comprehensionAudit,
        checks
      },
      null,
      2
    )
  );
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
