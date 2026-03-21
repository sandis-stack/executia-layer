/* ═══════════════════════════════════════════════════════════
   EXECUTIA — executia.js  ·  EIF V7
   HTML = structure  ·  CSS = visual  ·  JS = behaviour

   ── New in V7 ───────────────────────────────────────────────
   Rule versioning      Rule({ id: 'budget@v1', ... })
   Integrity            Ledger.hash(result) → SHA-256 digest
                        Ledger.verify(result, hash) → bool
   Persistence          Ledger.store(result) / Ledger.retrieve(id)
                        Browser: sessionStorage (no server needed)
                        Production: swap store/retrieve for fetch()
   API interface        ApiClient.submit(result) → stub ready for
                        POST /execute + GET /trace/{id}

   ── Architecture ────────────────────────────────────────────
   STATE / TRANSITIONS  — frozen legal transition graph
   Rule()               — typed, versioned validation primitive
   Rules                — composable rule library
   ExecutionTrace       — immutable per-check audit record
   ExecutionResult      — typed, frozen, hashable engine output
   Ledger               — integrity + persistence layer
   ApiClient            — external interface stub
   Engine               — PURE: no UI, no DOM
                          Engine.run(checks, ctx) → Promise<ExecutionResult>
                          Engine.cinematic(sequence) → void
   EventBus             — decouples Engine from UI
   Executia.sim         — UI controller
   Executia.demo        — scroll cinematic
   Executia.reveal      — scroll reveal

   ── Data flow ───────────────────────────────────────────────
     [User action]
       → sim.transition(STATE.RUNNING)
       → sim._execute()
       → Engine.run()
       → EventBus.emit('engine:check', trace_entry)
       → EventBus.emit('engine:result', result)
       → Ledger.hash(result)      ← integrity
       → Ledger.store(result)     ← persistence
       → ApiClient.submit(result) ← external interface
       → sim._onResult()          ← UI update
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
     STATE
     ───────────────────────────────────────────────────────── */
  const STATE = Object.freeze({
    IDLE:    'idle',
    RUNNING: 'running',
    BLOCKED: 'blocked',
    FIXED:   'fixed',
    SUCCESS: 'success',
  });

  const TRANSITIONS = Object.freeze({
    [STATE.IDLE]:    [STATE.RUNNING],
    [STATE.RUNNING]: [STATE.BLOCKED, STATE.SUCCESS],
    [STATE.BLOCKED]: [STATE.FIXED],
    [STATE.FIXED]:   [STATE.RUNNING],
    [STATE.SUCCESS]: [STATE.IDLE],
  });

  /* ─────────────────────────────────────────────────────────
     UTILITIES
     ───────────────────────────────────────────────────────── */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function Timeline() {
    const ids = [];
    return {
      at(ms, fn) { ids.push(setTimeout(fn, ms)); return this; },
      cancel()   { ids.forEach(clearTimeout); ids.length = 0; },
    };
  }

  /** Generate a UUID-like execution ID */
  function uid() {
    return 'ex-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ─────────────────────────────────────────────────────────
     EVENTBUS
     ───────────────────────────────────────────────────────── */
  const EventBus = (function () {
    const listeners = {};
    return {
      on(event, fn)     { (listeners[event] = listeners[event] || []).push(fn); },
      off(event, fn)    { if (listeners[event]) listeners[event] = listeners[event].filter(f => f !== fn); },
      emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)); },
    };
  }());

  /* ─────────────────────────────────────────────────────────
     RULE — versioned, typed, composable
     id format: 'ruleId@version'  e.g. 'budget@v1'
     ───────────────────────────────────────────────────────── */
  const Rule = ({ id, version = 'v1', label, validate, error }) =>
    Object.freeze({
      id:      `${id}@${version}`,
      ruleId:  id,
      version,
      label,
      validate,
      error: error || (() => `${label} check failed`),
    });

  const Rules = {
    withinBudget: Rule({
      id: 'budget', version: 'v1',
      label:    'Budget threshold',
      validate: ctx => ctx.amount <= ctx.limit,
      error:    ctx => `Exceeded by ${(ctx.amount - ctx.limit).toFixed(2)}M \u2014 ${Math.round((ctx.amount / ctx.limit - 1) * 100)}% over limit`,
    }),

    isAuthorized: Rule({
      id: 'authorization', version: 'v1',
      label:    'Authorization confirmed',
      validate: ctx => ctx.authorized === true,
      error:    () => 'Requesting entity lacks authorization for this action',
    }),

    hasResponsibility: Rule({
      id: 'responsibility', version: 'v1',
      label:    'Responsibility assigned',
      validate: ctx => ctx.actorLevel >= ctx.requiredLevel,
      error:    ctx => `Actor level ${ctx.actorLevel} below required level ${ctx.requiredLevel}`,
    }),

    supplierRegistered: Rule({
      id: 'supplier', version: 'v1',
      label:    'Supplier registry',
      validate: ctx => ctx.supplierRegistered === true,
      error:    () => 'Supplier not found in active procurement registry',
    }),

    alwaysPass: Rule({
      id: 'pass', version: 'v1',
      label:    'Structural check',
      validate: () => true,
      error:    () => '',
    }),

    /* Composers — each returns a new versioned Rule */
    all(...rules) {
      return Rule({
        id:      rules.map(r => r.ruleId).join('+'),
        version: rules.map(r => r.version).join('+'),
        label:   rules.map(r => r.label).join(' + '),
        validate: ctx => rules.every(r => r.validate(ctx)),
        error:    ctx => (rules.find(r => !r.validate(ctx)) || rules[0]).error(ctx),
      });
    },
    any(...rules) {
      return Rule({
        id:      rules.map(r => r.ruleId).join('|'),
        version: rules.map(r => r.version).join('|'),
        label:   rules.map(r => r.label).join(' or '),
        validate: ctx => rules.some(r => r.validate(ctx)),
        error:    ctx => rules.map(r => r.error(ctx)).join('; '),
      });
    },
    not(rule) {
      return Rule({
        id:      `not-${rule.ruleId}`,
        version: rule.version,
        label:   `Not: ${rule.label}`,
        validate: ctx => !rule.validate(ctx),
        error:    () => `Condition must not hold: ${rule.label}`,
      });
    },
  };

  /* ─────────────────────────────────────────────────────────
     ExecutionTrace — immutable per-check audit record
     ───────────────────────────────────────────────────────── */
  function ExecutionTrace({ index, ruleId, ruleVersion, ruleLabel, passed, errorMsg, ctx, timestamp }) {
    return Object.freeze({
      index, ruleId, ruleVersion, ruleLabel,
      passed, errorMsg,
      ctx:       Object.freeze({ ...ctx }),
      timestamp,
    });
  }

  /* ─────────────────────────────────────────────────────────
     ExecutionResult — typed, frozen, hashable output
     ───────────────────────────────────────────────────────── */
  function ExecutionResult({ id, status, failedIndex, trace, meta, timestamp, hash }) {
    return Object.freeze({
      id,           /* unique execution ID (ex-xxxxx) */
      status,       /* 'blocked' | 'success' */
      failedIndex,  /* index of first failing check, -1 on success */
      trace,        /* ExecutionTrace[] — full audit log */
      meta,         /* display strings — decoupled from engine logic */
      timestamp,    /* execution start time (ms) */
      hash,         /* SHA-256 of canonical JSON — set by Ledger */
    });
  }

  /* ─────────────────────────────────────────────────────────
     LEDGER — integrity + persistence layer
     hash:     SubtleCrypto SHA-256 of canonical trace JSON
     verify:   recompute and compare
     store:    sessionStorage (swap for fetch() in production)
     retrieve: sessionStorage get by execution ID
     ───────────────────────────────────────────────────────── */
  const Ledger = {
    _store_key: 'executia:ledger',

    /** Canonical JSON for hashing — excludes the hash field itself */
    _canonical(result) {
      const { hash: _h, ...rest } = result; // eslint-disable-line no-unused-vars
      return JSON.stringify({
        id:          rest.id,
        status:      rest.status,
        failedIndex: rest.failedIndex,
        timestamp:   rest.timestamp,
        trace:       rest.trace.map(t => ({
          index:       t.index,
          ruleId:      t.ruleId,
          ruleVersion: t.ruleVersion,
          passed:      t.passed,
          errorMsg:    t.errorMsg,
          timestamp:   t.timestamp,
        })),
      });
    },

    /** SHA-256 via SubtleCrypto. Returns Promise<string hex> */
    async hash(result) {
      try {
        const encoded = new TextEncoder().encode(this._canonical(result));
        const buffer  = await crypto.subtle.digest('SHA-256', encoded);
        return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch {
        /* Fallback for non-HTTPS / older browsers — deterministic but not cryptographic */
        const str = this._canonical(result);
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
        return 'fallback-' + Math.abs(h).toString(16);
      }
    },

    /** Verify: recompute hash and compare to stored */
    async verify(result) {
      const recomputed = await this.hash(result);
      return recomputed === result.hash;
    },

    /** Persist result to sessionStorage (swap .setItem for fetch() in production) */
    store(result) {
      try {
        const ledger = this._getLedger();
        ledger[result.id] = {
          id:          result.id,
          status:      result.status,
          failedIndex: result.failedIndex,
          timestamp:   result.timestamp,
          hash:        result.hash,
          trace:       result.trace,
          meta:        result.meta,
        };
        sessionStorage.setItem(this._store_key, JSON.stringify(ledger));
        EventBus.emit('ledger:stored', { id: result.id, hash: result.hash });
      } catch (e) {
        /* sessionStorage unavailable (private browsing, etc.) — degrade gracefully */
        EventBus.emit('ledger:error', { error: 'storage_unavailable', id: result.id });
      }
    },

    /** Retrieve result by execution ID */
    retrieve(id) {
      try {
        const ledger = this._getLedger();
        return ledger[id] || null;
      } catch {
        return null;
      }
    },

    /** List all stored execution IDs */
    list() {
      try {
        return Object.keys(this._getLedger());
      } catch {
        return [];
      }
    },

    _getLedger() {
      try {
        return JSON.parse(sessionStorage.getItem(this._store_key) || '{}');
      } catch {
        return {};
      }
    },
  };

  /* ─────────────────────────────────────────────────────────
     API CLIENT — external interface stub
     Production: replace stub bodies with real fetch() calls.
     Interface is stable — no other code changes needed.
     ───────────────────────────────────────────────────────── */
  const ApiClient = {
    baseUrl: '',            /* set to 'https://api.executia.io' in production */
    mode:    'stub',        /* 'stub' | 'live' — explicit execution mode */

    /**
     * POST /execute  — submit execution result to backend
     * @param {ExecutionResult} result
     * @returns {Promise<{accepted: bool, serverId: string}>}
     */
    async submit(result) {
      if (this.mode !== 'live') {
        /* Stub mode — log payload, return mock response */
        EventBus.emit('api:stub', { method: 'POST', endpoint: '/execute', payload: result });
        return Promise.resolve({ accepted: true, serverId: `srv-${result.id}` });
      }
      const resp = await fetch(`${this.baseUrl}/execute`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:          result.id,
          status:      result.status,
          failedIndex: result.failedIndex,
          timestamp:   result.timestamp,
          hash:        result.hash,
          trace:       result.trace,
        }),
      });
      return resp.json();
    },

    /**
     * GET /trace/{id}  — retrieve execution record from backend
     * @param {string} id
     * @returns {Promise<ExecutionResult|null>}
     */
    async getTrace(id) {
      if (this.mode !== 'live') {
        EventBus.emit('api:stub', { method: 'GET', endpoint: `/trace/${id}` });
        return Promise.resolve(Ledger.retrieve(id));
      }
      const resp = await fetch(`${this.baseUrl}/trace/${id}`);
      return resp.ok ? resp.json() : null;
    },
  };

  /* ─────────────────────────────────────────────────────────
     ENGINE — PURE
     No UI hooks. No DOM. No side effects outside EventBus.
     ───────────────────────────────────────────────────────── */
  const Engine = {
    _tl: null,

    cancel() {
      if (this._tl) { this._tl.cancel(); this._tl = null; }
    },

    cinematic(sequence) {
      this.cancel();
      const tl = this._tl = new Timeline();
      sequence.forEach(({ id, ms, fade }) => {
        tl.at(ms, () => EventBus.emit('engine:cinematic:tick', { id, fade: !!fade }));
      });
    },

    /**
     * Pure validation loop.
     * @param {Rule[]} checks
     * @param {Object} ctx
     * @param {Object} meta    — display strings, not engine logic
     * @param {number} interval
     * @returns {Promise<ExecutionResult>}
     */
    run(checks, ctx, meta, interval = 600) {
      this.cancel();
      const tl    = this._tl = new Timeline();
      const trace = [];
      const execId    = uid();
      const startTime = Date.now();

      return new Promise(resolve => {
        let settled = false;

        checks.forEach((rule, i) => {
          tl.at(i * interval, () => {
            if (settled) return;

            const passed   = rule.validate(ctx);
            const errorMsg = passed ? '' : rule.error(ctx);
            const entry    = ExecutionTrace({
              index: i, ruleId: rule.ruleId, ruleVersion: rule.version,
              ruleLabel: rule.label, passed, errorMsg,
              ctx, timestamp: Date.now(),
            });
            trace.push(entry);
            EventBus.emit('engine:check', { index: i, entry });

            if (!passed || i === checks.length - 1) {
              settled = true;
              const status = passed ? 'success' : 'blocked';

              /* Build preliminary result (no hash yet) */
              const preliminary = ExecutionResult({
                id: execId, status,
                failedIndex: passed ? -1 : i,
                trace:       Object.freeze(trace.map(t => Object.freeze(t))),
                meta, timestamp: startTime, hash: null,
              });

              /* Hash async, then finalize and persist */
              Ledger.hash(preliminary).then(hash => {
                const result = ExecutionResult({ ...preliminary, hash });

                Ledger.store(result);
                ApiClient.submit(result);
                EventBus.emit('engine:result', result);
                resolve(result);
              });
            }
          });
        });
      });
    },
  };

  /* ─────────────────────────────────────────────────────────
     SCENARIO DEFINITIONS
     ───────────────────────────────────────────────────────── */
  const SCENARIOS = {
    budget: {
      display: {
        ctx: [
          { label: 'Settlement decision', val: 'Board approves fuel distribution contract' },
          { label: 'Payment request',     val: '\u20ac2.4M <span class="rs-tag rs-tag-bad mono">22% over approved limit</span>' },
          { label: 'Responsible officer', val: 'Regional Distribution Director' },
        ],
        fixCtxVal: '\u20ac1.96M <span class="rs-tag rs-tag-good mono">Within approved limit</span>',
      },
      ctxBase:  { amount: 2.4,  limit: 2.0, authorized: true,  actorLevel: 2, requiredLevel: 2, supplierRegistered: true },
      ctxFixed: { amount: 1.96, limit: 2.0, authorized: true,  actorLevel: 2, requiredLevel: 2, supplierRegistered: true },
      checks: [Rules.isAuthorized, Rules.alwaysPass, Rules.alwaysPass, Rules.withinBudget],
      meta: {
        fixLabel:   'Restructure payment',
        blockedSub: 'Payment exceeds approved limit by 22% \u2014 settlement cannot proceed',
        impact:     '\u20ac440K risk prevented before execution',
        validSub:   '\u20ac1.96M settlement approved \u00b7 Immutable ledger written \u00b7 Responsibility confirmed',
        validImpact:'Execution verified before funds released',
      },
    },

    actor: {
      display: {
        ctx: [
          { label: 'Decision',           val: 'Ministry approves infrastructure contract' },
          { label: 'Executing officer',  val: 'J. Kowalski <span class="rs-tag rs-tag-bad mono">Not authorized</span>' },
          { label: 'Required authority', val: 'Deputy Minister level or above' },
        ],
        fixCtxVal: 'A. Nowak <span class="rs-tag rs-tag-good mono">Deputy Minister \u2014 Authorized</span>',
      },
      ctxBase:  { amount: 0, limit: 999, authorized: false, actorLevel: 1, requiredLevel: 3, supplierRegistered: true },
      ctxFixed: { amount: 0, limit: 999, authorized: true,  actorLevel: 3, requiredLevel: 3, supplierRegistered: true },
      checks: [Rules.alwaysPass, Rules.alwaysPass, Rules.alwaysPass, Rules.all(Rules.isAuthorized, Rules.hasResponsibility)],
      meta: {
        fixLabel:   'Assign authorized officer',
        blockedSub: 'Executing officer lacks required authority level \u2014 action blocked',
        impact:     'Unauthorized actor stopped before contract execution',
        validSub:   'Authorized officer confirmed \u00b7 Contract proceeds \u00b7 Full chain recorded',
        validImpact:'Verified authority linked to execution permanently',
      },
    },

    fraud: {
      display: {
        ctx: [
          { label: 'Decision',             val: 'Ministry approves \u20ac4.2M vendor contract' },
          { label: 'Supplier',             val: 'TechBuild Ltd. <span class="rs-tag rs-tag-bad mono">Registry mismatch</span>' },
          { label: 'Procurement registry', val: 'No active registration found' },
        ],
        fixCtxVal: 'BuildTech Solutions <span class="rs-tag rs-tag-good mono">Registry verified</span>',
      },
      ctxBase:  { amount: 4.2, limit: 5.0, authorized: true, actorLevel: 3, requiredLevel: 2, supplierRegistered: false },
      ctxFixed: { amount: 4.2, limit: 5.0, authorized: true, actorLevel: 3, requiredLevel: 2, supplierRegistered: true },
      checks: [Rules.isAuthorized, Rules.hasResponsibility, Rules.alwaysPass, Rules.supplierRegistered],
      meta: {
        fixLabel:   'Submit valid supplier',
        blockedSub: 'Supplier not found in procurement registry \u2014 possible fraudulent entity',
        impact:     '\u20ac4.2M fraud prevented before payment',
        validSub:   'Verified supplier confirmed \u00b7 Payment authorised \u00b7 Ledger written',
        validImpact:'Corrupt execution chain structurally blocked',
      },
    },
  };

  /* ─────────────────────────────────────────────────────────
     EXECUTIA NAMESPACE
     ───────────────────────────────────────────────────────── */
  const Executia = {

    reveal: {
      init() {
        const els = $$('.reveal');
        if (!els.length) return;
        const obs = new IntersectionObserver(
          entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
          { threshold: 0.1 }
        );
        els.forEach(el => obs.observe(el));
      },
    },

    demo: {
      init() {
        const section = $('.execution-demo');
        if (!section) return;
        EventBus.on('engine:cinematic:tick', ({ id, fade }) => {
          const el = $(`#${id}`);
          if (!el) return;
          if (fade) el.classList.add('fade-out');
          else      el.classList.add('is-active');
        });
        const obs = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) { this.run(); obs.disconnect(); }
        }, { threshold: 0.3 });
        obs.observe(section);
      },
      run() {
        Engine.cinematic([
          { id: 'nodeDecision1', ms:    0 },
          { id: 'nodeExecBad',   ms:  700 },
          { id: 'nodeError',     ms: 1400 },
          /* nodeError stays visible — no fade */
          { id: 'nodeDecision2', ms: 2600 },
          { id: 'nodeExecutia',  ms: 3300 },
          { id: 'check1',        ms: 3800 },
          { id: 'check2',        ms: 4100 },
          { id: 'check3',        ms: 4400 },
          { id: 'check4',        ms: 4700 },
          { id: 'nodeSuccess',   ms: 5100 },
        ]);
      },
    },

    sim: {
      state:     STATE.IDLE,
      activeKey: 'budget',
      _ctx:      null,
      _dom:      null,

      transition(next) {
        const allowed = TRANSITIONS[this.state] || [];
        if (!allowed.includes(next)) { Engine.cancel(); return false; }
        this.state = next;
        this._render();
        return true;
      },

      _render() {
        const d = this._q();
        if (!d.resultBox) return;
        d.resultBox.dataset.state = this.state;
        d.runBtn.disabled         = this.state === STATE.RUNNING;
        d.fixBtn.hidden           = this.state !== STATE.BLOCKED;
        const labels = {
          [STATE.IDLE]:    'Run Scenario',
          [STATE.RUNNING]: 'Verifying\u2026',
          [STATE.BLOCKED]: 'Run Scenario',
          [STATE.FIXED]:   'Run Scenario',
          [STATE.SUCCESS]: 'Run Again',
        };
        if (labels[this.state]) d.runBtn.textContent = labels[this.state];
      },

      _resetUI() {
        const d = this._q();
        d.resultText.textContent    = '\u2014';
        d.resultSub.textContent     = '';
        d.resultImpact.textContent  = '';
        d.checkRows.forEach(row => row.classList.remove('rs-pass', 'rs-fail', 'is-active'));
        d.checkResults.forEach(res => { res.textContent = ''; res.className = 'rs-check-res mono'; });
      },

      _load(key) {
        const s = SCENARIOS[key || this.activeKey];
        const d = this._q();
        s.display.ctx.forEach((row, i) => {
          if (d.ctxLabels[i]) d.ctxLabels[i].textContent = row.label;
          if (d.ctxValues[i]) d.ctxValues[i].innerHTML   = row.val;
        });
        s.checks.forEach((rule, i) => {
          if (d.checkLabels[i]) d.checkLabels[i].textContent = rule.label;
        });
        d.hint.textContent = 'Select a scenario and run';
        this._ctx = { ...s.ctxBase };
      },

      _q() {
        if (this._dom) return this._dom;
        this._dom = {
          tabs:         $$('[data-role="scenario-tab"]'),
          ctxLabels:    $$('[data-role="ctx-label"]'),
          ctxValues:    $$('[data-role="ctx-value"]'),
          checkRows:    $$('[data-role="check-row"]'),
          checkLabels:  $$('[data-role="check-label"]'),
          checkResults: $$('[data-role="check-result"]'),
          resultBox:    $('[data-role="result-box"]'),
          resultText:   $('[data-role="result-text"]'),
          resultSub:    $('[data-role="result-sub"]'),
          resultImpact: $('[data-role="result-impact"]'),
          hint:         $('[data-role="sim-hint"]'),
          runBtn:       $('[data-role="run-btn"]'),
          fixBtn:       $('[data-role="fix-btn"]'),
        };
        return this._dom;
      },

      _subscribe() {
        EventBus.on('engine:check', ({ index, entry }) => {
          const d = this._q();
          const row = d.checkRows[index];
          const res = d.checkResults[index];
          if (!row || !res) return;
          row.classList.add('is-active');
          if (entry.passed) {
            row.classList.add('rs-pass');
            res.textContent = '\u2713';
            res.classList.add('is-success');
          } else {
            row.classList.add('rs-fail');
            res.textContent = SCENARIOS[this.activeKey].meta.failMsg || '\u2715';
            res.classList.add('is-error');
            d.hint.textContent   = 'Press Fix & Re-run to resolve';
            d.fixBtn.textContent = (SCENARIOS[this.activeKey].meta.fixLabel || 'Fix') + ' \u2192';
          }
        });

        EventBus.on('engine:result', (result) => {
          /* Expand full simulation UI on first result */
          const rsBox = $('[data-role="result-box"]');
          if (rsBox) { const box = rsBox.closest('#rsBox'); if (box) box.classList.add('rs-box--expanded'); }
          const d = this._q();
          if (result.status === 'blocked') {
            d.resultText.textContent    = '\u2715 EXECUTION BLOCKED';
            d.resultSub.textContent     = result.meta.blockedSub;
            d.resultImpact.textContent  = result.meta.impact;
            this.transition(STATE.BLOCKED);
          } else {
            d.resultText.textContent    = '\u2713 VALID EXECUTION';
            d.resultSub.textContent     = result.meta.validSub;
            d.resultImpact.textContent  = result.meta.validImpact;
            d.hint.textContent          = 'Complete chain recorded \u00b7 decision \u00b7 verification \u00b7 execution \u00b7 ledger';
            this.transition(STATE.SUCCESS);
          }
          /* Show execution ID + hash as proof signal */
          this._showProof(result);
        });

        EventBus.on('ledger:stored', ({ id, hash }) => {
          const el = $('[data-role="execution-id"]');
          if (el) el.textContent = `${id} · ${hash.slice(0, 12)}\u2026`;
        });
      },

      /** Render execution proof (id + hash) below result box */
      _showProof(result) {
        const d = this._q();
        let proofEl = $('[data-role="execution-proof"]');
        if (!proofEl) {
          proofEl = document.createElement('div');
          proofEl.setAttribute('data-role', 'execution-proof');
          proofEl.className = 'mono rs-proof-signal';
          if (d.resultBox) d.resultBox.after(proofEl);
        }
        const shortHash = result.hash
          ? result.hash.slice(0, 16) + '\u2026'
          : 'computing\u2026';
        proofEl.textContent = `ID: ${result.id}  ·  SHA-256: ${shortHash}`;
      },

      init() {
        const d = this._q();
        if (!d.runBtn) return;

        this._subscribe();

        d.tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            d.tabs.forEach(t => t.classList.remove('rs-tab-active'));
            tab.classList.add('rs-tab-active');
            this.activeKey = tab.dataset.scenario;
            Engine.cancel();
            this.state = STATE.IDLE;
            this._resetUI();
            this._load(this.activeKey);
            this._render();
            const proof = $('[data-role="execution-proof"]');
            if (proof) proof.textContent = '';
          });
        });

        d.runBtn.addEventListener('click', () => {
          if (this.state === STATE.SUCCESS) {
            this.transition(STATE.IDLE);
            this._resetUI();
            this._load(this.activeKey);
          }
          if (this.transition(STATE.RUNNING)) {
            this._resetUI();
            this._execute();
          }
        });

        d.fixBtn.addEventListener('click', () => {
          if (!this.transition(STATE.FIXED)) return;
          const s = SCENARIOS[this.activeKey];
          const valEl = d.ctxValues[1];
          if (valEl) valEl.innerHTML = s.display.fixCtxVal;
          this._ctx = { ...s.ctxFixed };
          if (this.transition(STATE.RUNNING)) {
            this._resetUI();
            this._execute();
          }
        });

        this._load(this.activeKey);
        this._render();
      },

      _execute() {
        const s = SCENARIOS[this.activeKey];
        Engine.run(s.checks, this._ctx || { ...s.ctxBase }, s.meta);
      },
    },

    init() {
      Executia.reveal.init();
      Executia.demo.init();
      Executia.sim.init();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Executia.init());
  } else {
    Executia.init();
  }

}());
