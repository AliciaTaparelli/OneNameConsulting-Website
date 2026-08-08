/* OneName Consulting — site behaviour */

(function () {
  "use strict";

  // Marks that scripting is available. The CSS only collapses the menu behind
  // the hamburger when this class is present, so with JS off the links stay
  // visible instead of becoming unreachable.
  document.documentElement.classList.add("js");

  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("nav-menu");

  if (!toggle || !menu) {
    return;
  }

  // Matches the tablet breakpoint in styles.css
  var wideEnough = window.matchMedia("(min-width: 481px)");

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("nav__links--open", open);
  }

  function isOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  toggle.addEventListener("click", function () {
    setOpen(!isOpen());
  });

  // Choosing a destination closes the menu behind you
  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Growing past the breakpoint reveals the full menu anyway, so drop the
  // open state rather than letting it linger into the desktop layout.
  wideEnough.addEventListener("change", function () {
    setOpen(false);
  });

  setOpen(false);
})();

/* Pattern drift ------------------------------------------------------------
   The artwork moves slowly against the page while the typography stays put.
   Each image is taller than its frame, so the movement is absorbed by the
   overflow and no edge is ever exposed. Nothing here conveys information —
   if the reader has asked for less motion, it simply never starts.          */

(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var drifters = document.querySelectorAll("[data-drift]");

  if (!drifters.length) {
    return;
  }

  var ticking = false;

  function update() {
    var viewport = window.innerHeight;

    drifters.forEach(function (img) {
      var frame = img.parentElement.getBoundingClientRect();

      // -1 when the frame sits below the fold, +1 when it has passed above.
      var progress = (frame.top + frame.height / 2 - viewport / 2) / viewport;
      progress = Math.max(-1, Math.min(1, progress));

      // Held well inside the 32% overflow the CSS reserves.
      var shift = progress * parseFloat(img.dataset.drift) * frame.height;

      img.style.transform = "translate3d(0," + shift.toFixed(1) + "px,0)";
    });

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
})();
