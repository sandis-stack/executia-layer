#!/usr/bin/env node
/**
 * EXECUTIA smoke-live.js
 * Tests real live flow against production URL.
 * Usage: EXECUTIA_API_KEY=xxx BASE_URL=https://execution.executia.io node scripts/smoke-live.js
 */

const BASE = process.env.BASE_URL || "https://execution.executia.io";
const KEY  = process.env.EXECUTIA_API_KEY || process.env.EXECUTIA_INTERNAL_KEY || "";

let passed = 0, failed = 0;
let reviewExecutionId = null;

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

async function request(method, path, body, useKey = true) {
  const headers = { "Content-Type": "application/json" };
  if (useKey && KEY) headers["x-api-key"] = KEY;
  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const r = await fetch(BASE + path, init);
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const get = (path, useKey = true) => request("GET", path, undefined, useKey);
const post = (path, body, useKey = true) => request("POST", path, body, useKey);

(async () => {
  await test("GET /health — public", async () => {
    const { status, body } = await get("/api/v1/health", false);
    assert(status === 200, "expected 200, got " + status);
    assert(body.status === "OK", "expected status OK");
  });

  await test("GET /live-state — public V8 data", async () => {
    const { status, body } = await get("/api/v1/live-state", false);
    assert(status === 200, "expected 200, got " + status);
    assert(body.ok, "expected ok:true");
    assert(body.execution_volume >= 500000000, "expected enterprise scale execution_volume");
  });

  await test("GET /history — 401 without key", async () => {
    const { status } = await get("/api/v1/history", false);
    assert(status === 401, "expected 401, got " + status);
  });

  await test("POST /submit — public create reviewed execution", async () => {
    const { status, body } = await post("/api/v1/submit", {
      request_type: "PROJECT_EXECUTION",
      actor: "smoke-test-operator",
      subject: "Strategic Energy Corridor Smoke Test",
      project: "Strategic Energy Corridor",
      amount: 1200000000,
      currency: "EUR",
      rule_context: { requires_operator: true, approval_limit: 2000000000 }
    }, false);
    assert(status === 201, "expected 201, got " + status + " — " + JSON.stringify(body));
    assert(body.ok, "expected ok:true");
    assert(body.execution_id, "expected execution_id");
    assert(body.status === "PENDING_REVIEW", "expected PENDING_REVIEW, got " + body.status);
    reviewExecutionId = body.execution_id;
  });

  if (!KEY) {
    console.log("  (skipping authenticated flow — no EXECUTIA_API_KEY set)");
  } else {
    await test("GET /operator-queue — contains real UUID execution", async () => {
      const { status, body } = await get("/api/v1/operator-queue");
      assert(status === 200, "expected 200, got " + status);
      assert(body.ok, "expected ok:true");
      const ids = (body.items || []).map(i => i.execution_id);
      assert(ids.includes(reviewExecutionId), "operator queue missing smoke execution_id");
    });

    await test("POST /operator-approve — atomic operator RPC", async () => {
      const { status, body } = await post("/api/v1/operator-approve", {
        execution_id: reviewExecutionId,
        actor: "smoke-live",
        reason: "SMOKE_TEST_APPROVAL"
      });
      assert(status === 200, "expected 200, got " + status + " — " + JSON.stringify(body));
      assert(body.ok, "expected ok:true");
      const approvedStatus = body.status || body.execution?.status;
      assert(approvedStatus === "APPROVED", "expected APPROVED, got " + approvedStatus);
    });

    await test("GET /ledger-verify — hash chain matches SQL formula", async () => {
      const { status, body } = await get("/api/v1/ledger-verify");
      assert(status === 200, "expected 200, got " + status);
      assert(body.ok, "expected ok:true");
      assert(body.verified === true, "expected verified:true — " + JSON.stringify(body));
    });
  }

  console.log("");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
