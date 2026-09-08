/* OneName Consulting — contact form

   Two filters run before a message is sent:

   1. A honeypot field that no visitor can see, tab to or hear. Bots fill
      every input they find, so anything in it means the sender is not a
      person and the message is refused.
   2. Google reCAPTCHA v2. The widget and Google's script are injected only
      once a site key is configured, so an unconfigured page never contacts
      Google at all.

   Both filters live in the browser, which means both can be walked past by
   anything that ignores this file and posts straight to the endpoint. They
   are the first line, not the only one: whatever backend receives the POST
   must verify the reCAPTCHA token with its own secret key and reject a
   non-empty "website" field as well.                                        */

(function () {
  "use strict";

  var form = document.getElementById("contact-form");

  if (!form) {
    return;
  }

  var status = document.getElementById("form-status");
  var button = form.querySelector("button[type=submit]");
  var trap = form.querySelector("[data-trap]");
  var endpoint = form.getAttribute("data-endpoint");
  var siteKey = form.getAttribute("data-recaptcha-site-key");

  var MAILTO = "OnenameConsulting@outlook.com";

  function say(message, kind) {
    status.textContent = message;
    status.className = "form__status form__status--" + kind;
  }

  // The widget is rendered by Google's own script, which is why the key is
  // set here rather than in the markup: no key, no request to Google.
  if (siteKey) {
    var slot = form.querySelector(".g-recaptcha");

    if (slot) {
      slot.setAttribute("data-sitekey", siteKey);

      var script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (trap && trap.value !== "") {
      say("This message could not be sent.", "error");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Nothing has been wired up yet. Say so plainly rather than accepting a
    // message that would go nowhere.
    if (!endpoint) {
      say("This form is not connected yet. Please write to " + MAILTO +
          " and your message will reach me directly.", "error");
      return;
    }

    if (siteKey) {
      if (!window.grecaptcha || !window.grecaptcha.getResponse()) {
        say("Please confirm you are not a robot before sending.", "error");
        return;
      }
    }

    button.disabled = true;
    say("Sending…", "pending");

    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Endpoint returned " + response.status);
      }

      form.reset();

      if (window.grecaptcha) {
        window.grecaptcha.reset();
      }

      say("Thank you — your message has been sent. I will come back to " +
          "you shortly.", "success");
    }).catch(function () {
      say("Something went wrong sending this. Please write to " + MAILTO +
          " instead.", "error");
    }).then(function () {
      button.disabled = false;
    });
  });
})();
