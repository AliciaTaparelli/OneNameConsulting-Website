/* OneName Consulting — contact form

   Sends the form in the background to contact/process.php, which emails it
   from the site's own server, and reports the outcome under the button.

   The hidden trap field is checked here so a bot's message goes no further,
   but anything can post straight to process.php without loading this file.
   So the server checks the trap again and does the real validation and rate
   limiting. This file is the courtesy; process.php is the guard.          */

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

  var MAILTO = "OnenameConsulting@outlook.com";
  var FAILED = "Something went wrong sending this. Please write to " +
    MAILTO + " instead.";

  function say(message, kind) {
    status.textContent = message;
    status.className = "form__status form__status--" + kind;
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

    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    }).then(function (response) {
      // Only process.php's own confirmation counts as sent. A host without
      // PHP can answer 200 with the script's source, which is not a sent
      // message. A refusal from process.php carries a message worth showing.
      return response.json().catch(function () {
        return {};
      }).then(function (reply) {
        if (!response.ok || reply.sent !== true) {
          var refused = new Error("Not sent (" + response.status + ")");
          refused.reason = reply.message;
          throw refused;
        }
      });
    }).then(function () {
      form.reset();
      say("Thank you — your message has been sent. I will come back to " +
          "you shortly.", "success");
    }).catch(function (error) {
      say(error.reason || FAILED, "error");
    }).then(function () {
      button.disabled = false;
    });
  });
})();
