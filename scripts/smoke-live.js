#!/usr/bin/env node
/**
 * EXECUTIA smoke-live.js
 * Tests real endpoints against production URL.
 * Usage: EXECUTIA_API_KEY=xxx BASE_URL=https://execution.executia.io node scripts/smoke-live.js
 */

const BASE = process.env.BASE_URL || "https://execution.executia.io";
const KEY  = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY || "";

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log("✓", name);
    passed++;
  } catch (e) {
    console.error("✗", name, "—", e.message);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function get(path) {
  const r = await fetch(BASE + path, { headers: { "x-api-key": KEY } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function post(path, body, useKey = true) {
  const headers = { "Content-Type": "application/json" };
  if (useKey) headers["x-api-key"] = KEY;
  const r = await fetch(BASE + path, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

(async () => {
  // 1. Health (public)
  await test("GET /health — public, no key", async () => {
    const { status, body } = await fetch(BASE + "/api/v1/health").then(async r => ({ status: r.status, body: await r.json() }));
    assert(status === 200, "expected 200, got " + status);
    assert(body.status === "OK", "expected status OK");
  });

  // 2. Auth guard
  await test("GET /history — 401 without key", async () => {
    const r = await fetch(BASE + "/api/v1/history");
    assert(r.status === 401, "expected 401, got " + r.status);
  });

  // 3. Public submit (no key from browser)
  await test("POST /submit — public, no key required", async () => {
    const { status, body } = await post("/api/v1/submit", {
      request_type: "PAYMENT",
      actor: "smoke-test",
      subject: "smoke-subject",
      amount: 100,
      rule_context: { approval_limit: 1000 }
    }, false);  // no key
    assert(status === 201, "expected 201, got " + status + " — " + JSON.stringify(body));
    assert(body.ok, "expected ok:true");
    assert(body.decision, "expected decision field");
  });

  // 4. History (authenticated)
  if (KEY) {
    await test("GET /history — authenticated", async () => {
      const { status, body } = await get("/api/v1/history");
      assert(status === 200, "expected 200, got " + status);
      assert(body.ok, "expected ok:true");
    });

    // 5. Ledger verify
    await test("GET /ledger-verify — chain integrity", async () => {
      const { status, body } = await get("/api/v1/ledger-verify");
      assert(status === 200, "expected 200");
      assert(body.ok, "expected ok:true");
      assert(typeof body.verified === "boolean", "expected verified boolean");
    });

    // 6. Audit ledger
    await test("GET /audit-ledger — balance integrity", async () => {
      const { status, body } = await get("/api/v1/audit-ledger");
      assert(status === 200, "expected 200");
      assert(body.ok, "expected ok:true");
    });

    // 7. Operator queue
    await test("GET /operator-queue — authenticated", async () => {
      const { status, body } = await get("/api/v1/operator-queue");
      assert(status === 200, "expected 200");
      assert(body.ok, "expected ok:true");
    });
  } else {
    console.log("  (skipping authenticated tests — no EXECUTIA_API_KEY set)");
  }

  console.log("");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
