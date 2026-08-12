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

/* Reveal on scroll ---------------------------------------------------------
   Rows arrive as they enter the viewport. The CSS only hides them when the
   .js class is set, so if this script never runs the content is simply
   visible. Anyone who asked for less motion gets everything at once.       */

(function () {
  "use strict";

  var targets = document.querySelectorAll(".reveal");

  if (!targets.length) {
    return;
  }

  function showAll() {
    targets.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)) {
    showAll();
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);   // reveal once, not on every pass
      }
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });

  targets.forEach(function (el) {
    observer.observe(el);
  });
})();
