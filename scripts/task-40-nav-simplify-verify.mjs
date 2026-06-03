#!/usr/bin/env node
/**
 * Task 40 — header-only navigation: no funnel strip or STEP labels.
 * Usage: node scripts/task-40-nav-simplify-verify.mjs [--production]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs/governance/screenshots/task-40-nav-simplify");
const production = process.argv.includes("--production");
const BASE = production ? "https://execution.executia.io" : null;
const MAX_CHROME_BOTTOM_DESKTOP_PX = 72;
const MAX_CHROME_BOTTOM_MOBILE_PX = 96;
const STEP_PATTERN = /STEP\s+\d+\s+OF\s+4/i;

const CANONICAL_NAV = "HOME VALIDATE EXECUTION PROOF PILOT";

const ROUTES = [
  { id: "home", path: "/", activeNavLabel: "HOME", scrollTarget: "#exHomeHero" },
  {
    id: "execution-test",
    path: "/execution-test/",
    activeNavLabel: "VALIDATE EXECUTION",
    scrollTarget: "section.hero"
  },
  {
    id: "public-proof",
    path: "/public-proof/",
    activeNavLabel: "PROOF",
    scrollTarget: "#app"
  },
  {
    id: "request-pilot",
    path: "/request-pilot/",
    activeNavLabel: "PILOT",
    scrollTarget: "#exPilotOnboardingPrimary"
  }
];

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

async function captureRoute(page, base, route, viewport) {
  const maxChromeBottom =
    viewport.width >= 1024 ? MAX_CHROME_BOTTOM_DESKTOP_PX : MAX_CHROME_BOTTOM_MOBILE_PX;
  const url = `${base}${route.path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".ex-env-header", { timeout: 15000 });
  if (route.id === "public-proof") {
    await page
      .waitForFunction(
        () =>
          document.querySelector("#app section, #app .panel, #app .status-card"),
        { timeout: 20000 }
      )
      .catch(() => {});
  }

  const funnelCount = await page.locator(".ex-env-funnel").count();
  const funnelMountCount = await page.locator("[data-ex-env-funnel]").count();
  const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const stepLabelsInBody = STEP_PATTERN.test(bodyText);
  const brandHref = await page.locator(".ex-env-brand").first().getAttribute("href");
  const brandSubline = (
    await page.locator(".ex-env-brand span").first().innerText()
  ).trim();
  const headerNav = (await page.locator(".ex-env-flow a").allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const headerNavLinkCount = await page.locator(".ex-env-flow a").count();
  const footerNav = (await page.locator(".ex-env-footer-flow a").allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const navActive =
    (await page
      .locator(`.ex-env-flow a.is-active:has-text("${route.activeNavLabel}")`)
      .count()) > 0;

  const layout = await page.evaluate(() => {
    const header = document.querySelector(".ex-env-header");
    const band = document.querySelector(".ex-env-chrome-band");
    const main =
      document.querySelector("#main-content") ||
      document.querySelector("main.shell") ||
      document.querySelector(".ex-inst-shell") ||
      document.querySelector(".shell");
    if (!band || !main || !header) {
      return { ok: false, reason: "missing-layout-nodes" };
    }
    const br = band.getBoundingClientRect();
    const hr = header.getBoundingClientRect();
    const mr = main.getBoundingClientRect();
    const rootStyle = getComputedStyle(document.documentElement);
    const scrollPadding =
      parseFloat(rootStyle.scrollPaddingTop) ||
      parseFloat(rootStyle.getPropertyValue("--ex-env-chrome-scroll-padding")) ||
      0;
    return {
      ok: hr.bottom <= br.bottom + 1,
      headerBottom: hr.bottom,
      chromeBottom: br.bottom,
      chromeHeight: br.height,
      contentTop: mr.top,
      contentClearOfChrome: mr.top >= br.bottom - 1,
      scrollPaddingTop: scrollPadding,
      scrollPaddingMatchesChrome:
        Math.abs(scrollPadding - br.height) <= 2 || scrollPadding >= br.height - 2,
      hasChromeBand: Boolean(band),
      hasFunnel: Boolean(document.querySelector(".ex-env-funnel"))
    };
  });

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
      bandBottom
    };
  }, route.scrollTarget);

  await page.evaluate(() => window.scrollTo(0, 0));

  const aboveFoldPath = join(OUT_DIR, `${route.id}-above-fold.png`);
  await page.screenshot({
    path: aboveFoldPath,
    clip: { x: 0, y: 0, width: 1440, height: 820 }
  });

  const headerOnlyPath = join(OUT_DIR, `${route.id}-header-only-crop.png`);
  const box = await page.evaluate(() => {
    const header = document.querySelector(".ex-env-header");
    if (!header) return null;
    const r = header.getBoundingClientRect();
    return {
      x: 0,
      y: 0,
      width: Math.max(1440, window.innerWidth),
      height: Math.ceil(r.bottom)
    };
  });
  if (box) {
    await page.screenshot({ path: headerOnlyPath, clip: box });
  }

  const audit =
    funnelCount === 0 &&
    funnelMountCount === 0 &&
    !stepLabelsInBody &&
    !layout.hasFunnel &&
    layout.ok &&
    layout.contentClearOfChrome &&
    layout.scrollPaddingMatchesChrome &&
    layout.chromeBottom <= maxChromeBottom &&
    scrollCheck.ok &&
    navActive &&
    headerNav === CANONICAL_NAV &&
    headerNavLinkCount === 4 &&
    footerNav === CANONICAL_NAV &&
    brandHref === "https://executia.io/" &&
    brandSubline === "EXECUTION GOVERNANCE INFRASTRUCTURE";

  return {
    url,
    funnelCount,
    funnelMountCount,
    stepLabelsInBody,
    headerNav,
    headerNavLinkCount,
    footerNav,
    brandHref,
    brandSubline,
    navActive,
    layout,
    scrollCheck,
    audit,
    aboveFoldPath,
    headerOnlyPath
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let proc;
  let base = BASE;

  if (!production) {
    const port = 3610 + Math.floor(Math.random() * 200);
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
      noFunnelOk: r.funnelCount === 0 && r.funnelMountCount === 0,
      noStepLabelsOk: !r.stepLabelsInBody,
      navActiveOk: r.navActive,
      headerNavOk: r.headerNav === CANONICAL_NAV && r.headerNavLinkCount === 4,
      footerNavOk: r.footerNav === CANONICAL_NAV,
      brandOk: r.brandHref === "https://executia.io/",
      sublineOk: r.brandSubline === "EXECUTION GOVERNANCE INFRASTRUCTURE",
      chromeCompactOk: r.layout.chromeBottom <= MAX_CHROME_BOTTOM_DESKTOP_PX,
      scrollPaddingOk: r.layout.scrollPaddingMatchesChrome,
      scrollAnchorOk: r.scrollCheck.ok,
      audit: r.audit && mobile.audit
    };
  });

  const pass = checks.every(
    (c) =>
      c.noFunnelOk &&
      c.noStepLabelsOk &&
      c.navActiveOk &&
      c.headerNavOk &&
      c.footerNavOk &&
      c.brandOk &&
      c.sublineOk &&
      c.chromeCompactOk &&
      c.scrollPaddingOk &&
      c.scrollAnchorOk &&
      c.audit
  );

  const report = {
    pass,
    navSimplifyAudit: pass ? "PASS" : "FAIL",
    mode: production ? "production" : "local",
    base,
    checks,
    routes,
    viewportResults,
    screenshotsDir: OUT_DIR
  };

  const outName = production
    ? "production-nav-simplify-verification.json"
    : "local-nav-simplify-verification.json";
  await writeFile(join(OUT_DIR, outName), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        pass,
        navSimplifyAudit: report.navSimplifyAudit,
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
