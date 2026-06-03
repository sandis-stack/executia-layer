#!/usr/bin/env node
/**
 * Task 39 — funnel polish: compact chrome, scroll offset, footer nav parity.
 * Usage: node scripts/task-39-funnel-polish-verify.mjs [--production]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-39-funnel-polish");
const production = process.argv.includes("--production");
const BASE = production ? "https://execution.executia.io" : null;
const VIEWPORT_TOP_PX = 800;
const MAX_CHROME_BOTTOM_DESKTOP_PX = 118;
const MAX_CHROME_BOTTOM_MOBILE_PX = 148;

const CANONICAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";
const FUNNEL_STRIP = "HOME → VALIDATE EXECUTION → PROOF → PILOT";

const ROUTES = [
  {
    id: "home",
    path: "/",
    funnelContext: "STEP 1 OF 4 — HOME",
    activeFunnelLabel: "HOME",
    scrollTarget: "#exHomeHero"
  },
  {
    id: "execution-test",
    path: "/execution-test/",
    funnelContext: "STEP 2 OF 4 — VALIDATE EXECUTION",
    activeFunnelLabel: "VALIDATE EXECUTION",
    scrollTarget: "section.hero"
  },
  {
    id: "public-proof",
    path: "/public-proof/",
    funnelContext: "STEP 3 OF 4 — EXECUTION PROOF",
    activeFunnelLabel: "PROOF",
    scrollTarget: "#app"
  },
  {
    id: "request-pilot",
    path: "/request-pilot/",
    funnelContext: "STEP 4 OF 4 — INSTITUTIONAL PILOT",
    activeFunnelLabel: "PILOT",
    scrollTarget: "#exPilotOnboardingPrimary"
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

async function captureRoute(page, base, route, viewport) {
  const maxChromeBottom =
    viewport.width >= 1024 ? MAX_CHROME_BOTTOM_DESKTOP_PX : MAX_CHROME_BOTTOM_MOBILE_PX;
  const url = `${base}${route.path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".ex-env-funnel", { timeout: 15000 });
  if (route.id === "public-proof") {
    await page
      .waitForFunction(
        () =>
          document.querySelector("#app section, #app .panel, #app .status-card"),
        { timeout: 20000 }
      )
      .catch(() => {});
  }

  const funnelContext = (await page.locator(".ex-env-funnel-context").innerText()).trim();
  const funnelStripText = (await page.locator(".ex-env-funnel-strip").innerText())
    .replace(/\s+/g, " ")
    .trim();
  const brandHref = await page.locator(".ex-env-brand").first().getAttribute("href");
  const headerNav = (await page.locator(".ex-env-flow a").allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const footerNav = (await page.locator(".ex-env-footer-flow a").allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

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
    const main =
      document.querySelector("#main-content") ||
      document.querySelector("main.shell") ||
      document.querySelector(".ex-inst-shell") ||
      document.querySelector("main.shell") ||
      document.querySelector(".shell");
    if (!funnel || !strip || !band || !main) {
      return { ok: false, reason: "missing-layout-nodes" };
    }
    const fr = funnel.getBoundingClientRect();
    const sr = strip.getBoundingClientRect();
    const cr = context ? context.getBoundingClientRect() : sr;
    const hr = header ? header.getBoundingClientRect() : null;
    const br = band.getBoundingClientRect();
    const mr = main.getBoundingClientRect();
    const rootStyle = getComputedStyle(document.documentElement);
    const scrollPadding =
      parseFloat(rootStyle.scrollPaddingTop) ||
      parseFloat(rootStyle.getPropertyValue("--ex-env-chrome-scroll-padding")) ||
      0;
    return {
      ok: fr.top >= 0 && sr.bottom <= topPx && cr.bottom <= topPx,
      funnelTop: fr.top,
      funnelBottom: fr.bottom,
      stripBottom: sr.bottom,
      contextBottom: cr.bottom,
      headerBottom: hr ? hr.bottom : null,
      chromeBottom: br.bottom,
      chromeHeight: br.height,
      contentTop: mr.top,
      contentClearOfChrome: mr.top >= br.bottom - 1,
      scrollPaddingTop: scrollPadding,
      scrollPaddingMatchesChrome:
        Math.abs(scrollPadding - br.height) <= 2 || scrollPadding >= br.height - 2,
      hasChromeBand: Boolean(band),
      scrollY: window.scrollY
    };
  }, VIEWPORT_TOP_PX);

  const scrollCheck = await page.evaluate((selector) => {
    const band = document.querySelector(".ex-env-chrome-band");
    let target = document.querySelector(selector);
    if (!target && selector === "main.shell") {
      target = document.querySelector("main.shell section, main.shell .hero, main.shell #app");
    }
    if (!band || !target) {
      return { ok: false, reason: "missing-scroll-target" };
    }
    target.scrollIntoView({ block: "start", behavior: "instant" });
    const tr = target.getBoundingClientRect();
    const bandBottom = band.getBoundingClientRect().bottom;
    return {
      ok: tr.top >= bandBottom - 3,
      targetTop: tr.top,
      bandBottom,
      scrollY: window.scrollY
    };
  }, route.scrollTarget);

  await page.evaluate(() => window.scrollTo(0, 0));

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
    const r2 = funnel.getBoundingClientRect();
    return {
      x: 0,
      y: 0,
      width: Math.max(1440, window.innerWidth),
      height: Math.ceil(r2.bottom)
    };
  });
  if (box) {
    await page.screenshot({ path: headerFunnelPath, clip: box });
  }

  const scrolledPath = join(OUT_DIR, `${route.id}-scrolled-anchor.png`);
  await page.evaluate((selector) => {
    let target = document.querySelector(selector);
    if (!target && selector === "main.shell") {
      target = document.querySelector("main.shell section, main.shell #app");
    }
    if (target) target.scrollIntoView({ block: "start", behavior: "instant" });
  }, route.scrollTarget);
  await page.screenshot({
    path: scrolledPath,
    clip: { x: 0, y: 0, width: 1440, height: 520 }
  });

  const polishAudit =
    layout.ok &&
    layout.contentClearOfChrome &&
    layout.scrollPaddingMatchesChrome &&
    layout.chromeBottom <= maxChromeBottom &&
    scrollCheck.ok &&
    funnelContext === route.funnelContext &&
    funnelActive &&
    funnelStripText === FUNNEL_STRIP &&
    headerNav === CANONICAL_NAV &&
    footerNav === CANONICAL_NAV &&
    brandHref === "https://executia.io/";

  return {
    url,
    funnelContext,
    funnelStripText,
    headerNav,
    footerNav,
    brandHref,
    funnelActive,
    layout,
    scrollCheck,
    polishAudit,
    aboveFoldPath,
    headerFunnelPath,
    scrolledPath
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let proc;
  let base = BASE;

  if (!production) {
    const port = 3590 + Math.floor(Math.random() * 200);
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
      vpRoutes[route.id] = await captureRoute(page, base, route, vp);
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
      headerNavOk: r.headerNav === CANONICAL_NAV,
      footerNavOk: r.footerNav === CANONICAL_NAV,
      brandOk: r.brandHref === "https://executia.io/",
      aboveFoldDesktopOk: r.layout.ok,
      aboveFoldMobileOk: mobile.layout.ok,
      chromeBandOk: r.layout.hasChromeBand,
      contentClearOk: r.layout.contentClearOfChrome,
      scrollPaddingOk: r.layout.scrollPaddingMatchesChrome,
      chromeCompactOk: r.layout.chromeBottom <= MAX_CHROME_BOTTOM_DESKTOP_PX,
      scrollAnchorOk: r.scrollCheck.ok,
      polishAudit: r.polishAudit && mobile.polishAudit
    };
  });

  const pass = checks.every(
    (c) =>
      c.funnelContextOk &&
      c.funnelActiveOk &&
      c.headerNavOk &&
      c.footerNavOk &&
      c.brandOk &&
      c.aboveFoldDesktopOk &&
      c.aboveFoldMobileOk &&
      c.chromeBandOk &&
      c.contentClearOk &&
      c.scrollPaddingOk &&
      c.chromeCompactOk &&
      c.scrollAnchorOk &&
      c.polishAudit
  );

  const report = {
    pass,
    polishAudit: pass ? "PASS" : "FAIL",
    viewportTopPx: VIEWPORT_TOP_PX,
    maxChromeBottomDesktopPx: MAX_CHROME_BOTTOM_DESKTOP_PX,
    maxChromeBottomMobilePx: MAX_CHROME_BOTTOM_MOBILE_PX,
    mode: production ? "production" : "local",
    base,
    checks,
    routes,
    viewportResults,
    screenshotsDir: OUT_DIR
  };

  const outName = production
    ? "production-funnel-polish-verification.json"
    : "local-funnel-polish-verification.json";
  await writeFile(join(OUT_DIR, outName), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        pass,
        polishAudit: report.polishAudit,
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
