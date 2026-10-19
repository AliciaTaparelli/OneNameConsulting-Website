/* OneName Consulting — contact form

   Posts the form to Web3Forms in the background and reports the outcome
   under the button, so the visitor stays on the page rather than being sent
   to Web3Forms' own confirmation screen.

   Web3Forms takes the fields as JSON and emails them to the inbox the access
   key belongs to. The key sits in the page as a hidden field; it is public by
   design and only permits sending to that one address.

   Without this file the form still works: the browser posts it to the same
   endpoint and Web3Forms answers with its confirmation page.              */

(function () {
  "use strict";

  var form = document.getElementById("contact-form");

  if (!form) {
    return;
  }

  var status = document.getElementById("form-status");
  var button = form.querySelector("button[type=submit]");
  var trap = form.querySelector("[data-trap]");
  var endpoint = form.getAttribute("action");

  var MAILTO = "OnenameConsulting@outlook.com";
  var FAILED = "Something went wrong sending this. Please write to " +
    MAILTO + " instead.";

  function say(message, kind) {
    status.textContent = message;
    status.className = "form__status form__status--" + kind;
  }

  // Web3Forms reads a JSON object of name/value pairs. The unchecked botcheck
  // box is absent from FormData, which is what it expects from a person.
  function payload(data) {
    var object = {};

    data.forEach(function (value, key) {
      object[key] = value;
    });

    return JSON.stringify(object);
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
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: payload(new FormData(form))
    }).then(function (response) {
      // Only Web3Forms' own confirmation counts as sent. It answers with
      // success false and a reason when it refuses, which is worth showing.
      return response.json().catch(function () {
        return {};
      }).then(function (reply) {
        if (!response.ok || reply.success !== true) {
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
