/* EXECUTIA™ FINAL FULL LAYER UI JS */
(function () {
  const shell = document.querySelector("[data-ex-header]");
  if (!shell) return;

  const toggle = shell.querySelector("[data-ex-menu-toggle]");
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;

    if (y > 8) shell.classList.add("is-scrolled");
    else shell.classList.remove("is-scrolled");

    if (!shell.classList.contains("is-open")) {
      if (y > lastY && y > 180) shell.classList.add("is-hidden");
      else shell.classList.remove("is-hidden");
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  if (toggle) {
    toggle.addEventListener("click", function () {
      const isOpen = shell.classList.toggle("is-open");
      shell.classList.remove("is-hidden");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      shell.classList.remove("is-open");
      shell.classList.remove("is-hidden");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  });
})();

async function executiaFetchJson(url, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const res = await fetch(url);
    const data = await res.json();
    target.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    target.textContent = error.message;
  }
}
