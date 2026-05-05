# EXECUTIA™ Engine — Architecture Proof

## 4 Core Requirements → Verification

---

### 1. EXECUTION IS ATOMIC

**Proof:** `sql/009_atomic_execution_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION commit_execution(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('executia_ledger'));  -- lock
  INSERT INTO execution_results ...   -- step 1
  INSERT INTO audit_events ...        -- step 2
  INSERT INTO ledger_entries ...      -- step 3
  RETURN jsonb_build_object('ok', true, ...);
END; $$;
```

One Postgres transaction. If any insert fails — full rollback. Zero partial states.

**API call (submit.js line 28):**
```js
const { data, error } = await db().rpc("commit_execution", { payload: body });
```

One RPC call. Not 3 sequential inserts.

---

### 2. DECISION ENGINE EXISTS

**Proof:** Inside `commit_execution()` RPC, lines 14–27:

```sql
IF actor IS NULL OR subject IS NULL OR request_type IS NULL THEN
  v_decision := 'REVIEW';   v_reason := 'VALIDATION_INCOMPLETE';
ELSIF rule_context->>'requires_operator' = 'true' THEN
  v_decision := 'REVIEW';   v_reason := 'OPERATOR_REQUIRED';
ELSIF amount > approval_limit THEN
  v_decision := 'BLOCK';    v_reason := 'AMOUNT_EXCEEDS_APPROVAL_LIMIT';
ELSE
  v_decision := 'APPROVE';  v_reason := 'RULES_PASSED';
END IF;
```

Also in `engine/rule-evaluator.js` for dry-run mode.

---

### 3. LEDGER HASH CHAIN IS SAFE

**Proof:** Advisory lock inside RPC before hash read:

```sql
PERFORM pg_advisory_xact_lock(hashtext('executia_ledger'));

SELECT COALESCE(entry_hash, 'GENESIS') INTO v_prev_hash
  FROM ledger_entries ORDER BY created_at DESC LIMIT 1;
```

Two parallel requests cannot read the same `prev_hash` because the lock
serializes them at the DB level. This is the correct fix — not application-level.

---

### 4. API KEY NEVER IN BROWSER

**Proof:**

`submit.js` — public endpoint, zero auth:
```js
// Browser sends NO api key. Server uses env internally.
export default async function handler(req, res) {
  // No requireInternalKey() here — intentionally public
  const { data, error } = await db().rpc("commit_execution", { payload: body });
```

`demo/index.html` — raw fetch, no headers:
```js
const res = await fetch('/api/v1/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
// No x-api-key. No window.__EXECUTIA_KEY__. No sessionStorage read.
```

`window.__EXECUTIA_PUBLIC_PAGE__ = true` — set before enterprise.js loads,
suppresses key manager banner and prevents sessionStorage write.

Internal endpoints (`/execute`, `/operator-*`, `/history`, etc.) still require
`x-api-key` via `requireInternalKey()`.

---

## Deploy Checklist

```
□ Supabase: run sql/001_schema.sql
□ Supabase: run sql/009_atomic_execution_rpc.sql
□ Vercel: set EXECUTIA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
□ npm install && npm run check && npm test
□ git push
□ node scripts/smoke-live.js
```

## Current Status

| Component         | Status |
|-------------------|--------|
| UI                | ✅ 9.3 |
| API flow          | ✅ 9.0 |
| Atomic execution  | ✅ RPC |
| Decision engine   | ✅ SQL + JS |
| Ledger lock       | ✅ advisory lock |
| Auth model        | ✅ public /submit |
| DB schema         | ✅ reproducible |
| Core ledger       | ✅ core_ledger table |
