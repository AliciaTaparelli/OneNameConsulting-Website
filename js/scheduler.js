/* OneName Consulting — booking

   Holds the place for a Calendly scheduler on the contact page.

   To connect it, put the Calendly address on the container in
   contact/index.html:

     <div class="scheduler" id="scheduler"
          data-scheduler-url="https://calendly.com/your-name/30min">

   With an address present this file loads Calendly's widget script and
   builds the inline scheduler inside the container. With the attribute
   empty it does nothing at all, and the fallback written into the page —
   the email address and a button — stays where it is.

   Calendly's script is only fetched once an address is set, so until then
   no third party is contacted and nothing is loaded from outside the site.
   When it is set, remember that the privacy policy has to name Calendly
   as a recipient, since booking sends a name and email address to them. */

(function () {
  "use strict";

  var WIDGET_CSS = "https://assets.calendly.com/assets/external/widget.css";
  var WIDGET_JS = "https://assets.calendly.com/assets/external/widget.js";

  var container = document.getElementById("scheduler");

  if (!container) {
    return;
  }

  var url = (container.getAttribute("data-scheduler-url") || "").trim();

  if (url === "") {
    return;
  }

  // Only a Calendly address is accepted, so a mistyped attribute cannot
  // pull in a script from somewhere else.
  var address;

  try {
    address = new URL(url);
  } catch (error) {
    return;
  }

  if (address.protocol !== "https:" || address.hostname !== "calendly.com") {
    return;
  }

  var fallback = container.querySelector(".scheduler__fallback");
  var mount = document.createElement("div");

  mount.className = "scheduler__widget";
  container.appendChild(mount);

  var styles = document.createElement("link");

  styles.rel = "stylesheet";
  styles.href = WIDGET_CSS;
  document.head.appendChild(styles);

  var script = document.createElement("script");

  script.src = WIDGET_JS;
  script.async = true;

  script.addEventListener("load", function () {
    if (!window.Calendly) {
      return;
    }

    window.Calendly.initInlineWidget({
      url: address.href,
      parentElement: mount,
      prefill: {},
      utm: {}
    });

    // The widget is up, so the email fallback is no longer the way in.
    if (fallback) {
      fallback.hidden = true;
    }

    container.classList.add("scheduler--live");
  });

  // If the script cannot be reached, the fallback is still on the page.
  script.addEventListener("error", function () {
    mount.remove();
  });

  document.head.appendChild(script);
})();
