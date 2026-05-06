/* EXECUTIA™ Production Engine JS */

// ── Session Manager ───────────────────────────────────────────────────────────
// Browser never stores EXECUTIA_API_KEY after initial login.
// POST /api/v1/session once with the key → receive session token.
// All subsequent requests use x-session-token.
(function () {
  var SESSION_KEY = "executia_session_token";

  function getToken() { return sessionStorage.getItem(SESSION_KEY) || ""; }
  function setToken(t) { sessionStorage.setItem(SESSION_KEY, t.trim()); window.__EXECUTIA_SESSION__ = t.trim(); }
  function clearToken() { sessionStorage.removeItem(SESSION_KEY); window.__EXECUTIA_SESSION__ = ""; }

  window.__EXECUTIA_SESSION__ = getToken();
  window.__executiaLogout = function () { clearToken(); renderBanner(); };

  // Check session validity on load
  window.addEventListener("DOMContentLoaded", function () {
    if (window.__EXECUTIA_PUBLIC_PAGE__) return;

    if (getToken()) {
      // Verify session is still valid
      fetch("/api/v1/session", { headers: { "x-session-token": getToken() } })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d.authenticated) { clearToken(); renderBanner(); } })
        .catch(function () { /* network error — keep token, retry on next request */ });
      return;
    }
    renderBanner();
  });

  function renderBanner() {
    if (document.getElementById("ex-session-banner")) return;

    var banner = document.createElement("div");
    banner.id = "ex-session-banner";
    banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#F4F7FB;color:#1E3A5F;border-top:1px solid #E6ECF2;padding:10px 24px;display:flex;align-items:center;gap:10px;z-index:9999;font-family:system-ui,sans-serif;font-size:13px";

    var label = document.createElement("span");
    label.style.cssText = "font-weight:600;white-space:nowrap";
    label.textContent = "Operator login";

    var input = document.createElement("input");
    input.id = "ex-session-key-input";
    input.type = "password";
    input.placeholder = "Paste EXECUTIA_API_KEY to start session";
    input.style.cssText = "flex:1;padding:5px 10px;border:1px solid #C9D7E3;border-radius:4px;font-size:13px;background:#fff;color:#1E3A5F;min-width:0";

    var status = document.createElement("span");
    status.id = "ex-session-status";
    status.style.cssText = "font-size:12px;color:#666;white-space:nowrap";

    var btn = document.createElement("button");
    btn.textContent = "Login";
    btn.style.cssText = "padding:5px 14px;background:#1E3A5F;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;white-space:nowrap";

    btn.addEventListener("click", function () {
      var key = document.getElementById("ex-session-key-input").value.trim();
      if (!key) return;
      btn.disabled = true;
      status.textContent = "Authenticating...";

      fetch("/api/v1/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key }
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.session_token) {
            setToken(d.session_token);
            document.getElementById("ex-session-banner").remove();
            // Reload page data without full page refresh
            if (typeof window.loadQueue === "function") window.loadQueue();
            if (typeof window.loadLedger === "function") window.loadLedger();
          } else {
            status.textContent = "Invalid key — try again";
            btn.disabled = false;
          }
        })
        .catch(function () { status.textContent = "Connection error"; btn.disabled = false; });
    });

    input.addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });

    banner.appendChild(label);
    banner.appendChild(input);
    banner.appendChild(status);
    banner.appendChild(btn);
    document.body.appendChild(banner);
  }
})();

// ── Header scroll / mobile nav ────────────────────────────────────────────────
(function () {
  var shell = document.querySelector("[data-ex-header]");
  if (!shell) return;
  var toggle = shell.querySelector("[data-ex-menu-toggle]");
  var lastY = window.scrollY, ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (y > 8) shell.classList.add("is-scrolled"); else shell.classList.remove("is-scrolled");
    if (!shell.classList.contains("is-open")) {
      if (y > lastY && y > 180) shell.classList.add("is-hidden"); else shell.classList.remove("is-hidden");
    }
    lastY = y; ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  if (toggle) {
    toggle.addEventListener("click", function () {
      var isOpen = shell.classList.toggle("is-open");
      shell.classList.remove("is-hidden");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { shell.classList.remove("is-open","is-hidden"); if (toggle) toggle.setAttribute("aria-expanded","false"); }
  });
})();

// ── executiaFetchJson — sends session token, never raw API key ────────────────
window.executiaFetchJson = async function executiaFetchJson(url, optionsOrTargetId) {
  var options = {};
  var targetEl = null;

  if (typeof optionsOrTargetId === "string") {
    targetEl = document.getElementById(optionsOrTargetId);
  } else if (optionsOrTargetId && typeof optionsOrTargetId === "object") {
    options = optionsOrTargetId;
  }

  try {
    var sessionToken = window.__EXECUTIA_SESSION__ || sessionStorage.getItem("executia_session_token") || "";
    var headers = Object.assign(
      { "Content-Type": "application/json" },
      sessionToken ? { "x-session-token": sessionToken } : {}
    );

    var res = await fetch(url, Object.assign({ headers: headers }, options));
    var data = await res.json().catch(function () { return {}; });

    if (res.status === 401 && !window.__EXECUTIA_PUBLIC_PAGE__) {
      // Session expired — clear and show login
      sessionStorage.removeItem("executia_session_token");
      window.__EXECUTIA_SESSION__ = "";
      if (typeof window.__executiaLogout === "function") window.__executiaLogout();
    }

    if (targetEl) { targetEl.textContent = JSON.stringify(data, null, 2); return; }
    if (!res.ok) throw new Error((data && (data.error?.code || data.error)) || ("HTTP " + res.status));
    return data;

  } catch (err) {
    if (targetEl) { targetEl.textContent = "Error: " + err.message; return; }
    throw err;
  }
};


/* EXECUTIA SHARED AUTH API HELPER */
window.executiaApi = async function executiaApi(path, options = {}) {
  const key = localStorage.getItem("executia_api_key") || "";

  const headers = {
    ...(options.headers || {}),
    ...(key ? { "x-api-key": key } : {})
  };

  return fetch(path, {
    ...options,
    headers
  });
};

window.executiaGetJson = async function executiaGetJson(path) {
  const res = await window.executiaApi(path);
  return res.json();
};
