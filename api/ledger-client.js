/**
 * EXECUTIA Ledger Client
 * Drop this into execution.executia.io — imports cleanly, no deps.
 *
 * Usage:
 *   import { LedgerClient } from '/js/ledger-client.js';
 *   const ledger = new LedgerClient();
 *   await ledger.log({ event: 'MATERIAL_DELAYED', detail: '...', rule: '...' });
 */

const API_BASE = "https://execution.executia.io/api";

export class LedgerClient {
  constructor(sessionId = null) {
    this.sessionId = sessionId || this._makeSessionId();
    this._persist();
  }

  _makeSessionId() {
    const id = "EX-" + Date.now().toString(36).toUpperCase() + "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    return id;
  }

  _persist() {
    try {
      const stored = sessionStorage.getItem("executia_session");
      if (stored) {
        this.sessionId = stored;
      } else {
        sessionStorage.setItem("executia_session", this.sessionId);
      }
    } catch (_) {}
  }

  /**
   * Log a ledger event.
   * @param {object} opts
   * @param {string} opts.event         - Event type, e.g. "MATERIAL_DELAYED"
   * @param {string} [opts.detail]      - Human-readable detail
   * @param {string} [opts.rule]        - Rule that triggered this
   * @param {string} [opts.scenarioId]  - Scenario identifier (A/B/C/D)
   * @param {Array}  [opts.tasksBefore] - Task state snapshot before
   * @param {Array}  [opts.tasksAfter]  - Task state snapshot after
   * @returns {Promise<{ok:boolean, entryId:string}>}
   */
  async log({ event, detail = "", rule = "", scenarioId = null, tasksBefore = [], tasksAfter = [] }) {
    try {
      const res = await fetch(`${API_BASE}/log-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          event,
          detail,
          rule,
          scenarioId,
          tasksBefore,
          tasksAfter,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn("[EXECUTIA Ledger] log failed:", err);
        return { ok: false };
      }

      return await res.json();
    } catch (err) {
      console.warn("[EXECUTIA Ledger] network error:", err);
      return { ok: false };
    }
  }

  /**
   * Fetch all ledger entries for this session.
   * @param {number} [limit=50]
   * @returns {Promise<Array>}
   */
  async fetch(limit = 50) {
    try {
      const res = await fetch(
        `${API_BASE}/get-ledger?sessionId=${encodeURIComponent(this.sessionId)}&limit=${limit}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.entries || [];
    } catch (_) {
      return [];
    }
  }

  getSessionId() {
    return this.sessionId;
  }
}

/**
 * Singleton — use this if you only need one ledger instance per page.
 */
export const ledger = new LedgerClient();
