/* OneName Consulting — contact form

   Posts the form to Netlify Forms in the background and reports the outcome
   under the button, so the visitor stays on the page instead of being sent
   to Netlify's own confirmation screen.

   Netlify takes the submission from any path on the site and matches it to
   the form by the form-name field, which the page carries as a hidden input.
   The body has to be url-encoded; a FormData body is read as a file upload.

   Without this file the form still works: the browser posts it normally and
   Netlify answers with its default confirmation page.                      */

(function () {
  "use strict";

  var form = document.getElementById("contact-form");

  if (!form) {
    return;
  }

  var status = document.getElementById("form-status");
  var button = form.querySelector("button[type=submit]");
  var trap = form.querySelector("[data-trap]");

  var MAILTO = "OnenameConsulting@outlook.com";
  var FAILED = "Something went wrong sending this. Please write to " +
    MAILTO + " instead.";

  function say(message, kind) {
    status.textContent = message;
    status.className = "form__status form__status--" + kind;
  }

  // Netlify reads the fields as a url-encoded body. URLSearchParams takes the
  // name/value pairs straight from the form, including the hidden form-name.
  function encode(data) {
    var pairs = [];

    data.forEach(function (value, key) {
      pairs.push(encodeURIComponent(key) + "=" +
        encodeURIComponent(String(value)));
    });

    return pairs.join("&");
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

    button.disabled = true;
    say("Sending…", "pending");

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(new FormData(form))
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Not sent (" + response.status + ")");
      }

      form.reset();
      say("Thank you — your message has been sent. I will come back to " +
          "you shortly.", "success");
    }).catch(function () {
      say(FAILED, "error");
    }).then(function () {
      button.disabled = false;
    });
  });
})();
