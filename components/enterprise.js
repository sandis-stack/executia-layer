/* EXECUTIA™ PRODUCTION ENGINE JS */

// ── Key Manager ──────────────────────────────────────────────────────────────
(function () {
  var STORAGE_KEY = "executia_api_key";
  function getKey() { return sessionStorage.getItem(STORAGE_KEY) || ""; }
  function setKey(k) { sessionStorage.setItem(STORAGE_KEY, k.trim()); window.__EXECUTIA_KEY__ = k.trim(); }
  window.__EXECUTIA_KEY__ = getKey();
  window.__executiaSetKey = function (k) { setKey(k); return !!k.trim(); };
  window.__executiaGetKey = getKey;

  window.addEventListener("DOMContentLoaded", function () {
    if (getKey()) return;
    if (window.__EXECUTIA_PUBLIC_PAGE__) return;

    var banner = document.createElement("div");
    banner.id = "ex-key-banner";
    banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#F4F7FB;color:#1E3A5F;border-top:1px solid #E6ECF2;padding:10px 24px;display:flex;align-items:center;gap:10px;z-index:9999;font-family:system-ui,sans-serif;font-size:13px";

    var label = document.createElement("span");
    label.style.cssText = "font-weight:600;opacity:.8";
    label.textContent = "Demo key";

    var input = document.createElement("input");
    input.id = "ex-key-input";
    input.type = "password";
    input.placeholder = "Paste EXECUTIA_API_KEY";
    input.style.cssText = "flex:1;padding:5px 10px;border:1px solid #C9D7E3;border-radius:4px;font-size:13px;background:#fff;color:#1E3A5F";

    var btn = document.createElement("button");
    btn.textContent = "Set";
    btn.style.cssText = "padding:5px 14px;background:#1E3A5F;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px";
    btn.addEventListener("click", function () {
      var v = document.getElementById("ex-key-input").value;
      if (window.__executiaSetKey(v)) {
        document.getElementById("ex-key-banner").remove();
      }
    });

    banner.appendChild(label);
    banner.appendChild(input);
    banner.appendChild(btn);
    document.body.appendChild(banner);
  });
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
    if (e.key === "Escape") {
      shell.classList.remove("is-open", "is-hidden");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  });
})();

// ── executiaFetchJson — SINGLE GLOBAL, bound to window ───────────────────────
window.executiaFetchJson = async function executiaFetchJson(url, optionsOrTargetId) {
  var options = {};
  var targetEl = null;

  if (typeof optionsOrTargetId === "string") {
    targetEl = document.getElementById(optionsOrTargetId);
  } else if (optionsOrTargetId && typeof optionsOrTargetId === "object") {
    options = optionsOrTargetId;
  }

  try {
    var headers = Object.assign(
      { "Content-Type": "application/json" },
      window.__EXECUTIA_KEY__ ? { "x-api-key": window.__EXECUTIA_KEY__ } : {}
    );

    var res = await fetch(url, Object.assign({ headers: headers }, options));
    var data = await res.json().catch(function () { return {}; });

    if (targetEl) { targetEl.textContent = JSON.stringify(data, null, 2); return; }
    if (!res.ok) throw new Error((data && data.error && (data.error.code || data.error)) || ("HTTP " + res.status));
    return data;

  } catch (err) {
    if (targetEl) { targetEl.textContent = "Error: " + err.message; return; }
    throw err;
  }
};
