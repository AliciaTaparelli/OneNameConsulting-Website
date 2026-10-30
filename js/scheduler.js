/* OneName Consulting — booking

   Holds the place for a booking scheduler on the contact page, whichever
   company ends up providing it.

   To connect one, put its booking address on the container in
   contact/index.html:

     <div class="scheduler" id="scheduler"
          data-scheduler-url="https://cal.com/lisette/30min">

   The page then shows that booking page in a frame inside the section, and
   the email fallback written into the HTML is hidden. With the attribute
   empty nothing is loaded and the fallback stands, so no third party is
   contacted until an address is set.

   A frame rather than the provider's own script: it works the same way for
   every scheduler worth using (Cal.com, Calendly, TidyCal, SavvyCal,
   Acuity, Microsoft Bookings, Google appointment pages, YouCanBook.me),
   and it keeps their code out of this page, where it could otherwise read
   anything on it.

   HOSTS below is the list of providers the page will embed. Add the host
   to it when the choice is made; an address on any other host is ignored,
   so a mistyped attribute cannot frame something unexpected.

   When a scheduler is connected, the privacy policy has to name the
   provider as a recipient: booking sends a name and an email address to
   them, and most are outside Switzerland.                                */

(function () {
  "use strict";

  var HOSTS = [
    "cal.com",
    "calendly.com",
    "tidycal.com",
    "savvycal.com",
    "app.squarespacescheduling.com",
    "app.acuityscheduling.com",
    "outlook.office365.com",
    "calendar.google.com",
    "youcanbook.me"
  ];

  var container = document.getElementById("scheduler");

  if (!container) {
    return;
  }

  var url = (container.getAttribute("data-scheduler-url") || "").trim();

  if (url === "") {
    return;
  }

  var address;

  try {
    address = new URL(url);
  } catch (error) {
    return;
  }

  var host = address.hostname.replace(/^www\./, "");
  var allowed = HOSTS.some(function (known) {
    return host === known || host.endsWith("." + known);
  });

  if (address.protocol !== "https:" || !allowed) {
    return;
  }

  var frame = document.createElement("iframe");

  frame.className = "scheduler__frame";
  frame.src = address.href;
  frame.title = "Booking calendar";
  frame.loading = "lazy";
  frame.setAttribute("frameborder", "0");

  // The frame may open the provider's own pages and ask for a payment sheet
  // on a paid booking; it has no reason to reach anything else on this site.
  frame.setAttribute(
    "sandbox",
    "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  );

  var fallback = container.querySelector(".scheduler__fallback");

  frame.addEventListener("load", function () {
    if (fallback) {
      fallback.hidden = true;
    }

    container.classList.add("scheduler--live");
  });

  // If it cannot be reached, the email fallback is still on the page.
  frame.addEventListener("error", function () {
    frame.remove();
  });

  container.appendChild(frame);
})();
