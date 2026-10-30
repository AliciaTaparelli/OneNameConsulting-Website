/* OneName Consulting — booking picker

   The interface shown on the contact page until a scheduling provider is
   connected. It books nothing: picking a day and a time composes an email
   asking for that slot, which is what the page did before, with the asking
   done for the visitor.

   When a provider is connected, js/scheduler.js frames their booking page
   and hides this, so none of it has to be unpicked.

   Weekdays only, from tomorrow to the last day of UNTIL_MONTH, with
   weekends closed. The hours are the placeholder ones: change WINDOW to
   match whatever is actually offered.

   UNTIL_MONTH is a fixed end rather than a rolling window, so it needs
   moving before it arrives or the calendar runs out.                     */

(function () {
  "use strict";

  var MAILTO = "OnenameConsulting@outlook.com";
  var WINDOW = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
  var UNTIL_MONTH = [2027, 12];        // year, month — December 2027

  var root = document.getElementById("booking-picker");

  if (!root) {
    return;
  }

  var today = new Date();

  today.setHours(0, 0, 0, 0);

  // A booking needs a day's notice, so the calendar opens tomorrow.
  var first = new Date(today);

  first.setDate(first.getDate() + 1);

  // The last day of the closing month.
  var last = new Date(UNTIL_MONTH[0], UNTIL_MONTH[1], 0);

  // Open on the first month that actually has a day to offer: late in a
  // month the next free weekday is often in the one after it.
  var opening = new Date(first);

  while (opening <= last &&
      (opening.getDay() === 0 || opening.getDay() === 6)) {
    opening.setDate(opening.getDate() + 1);
  }

  var month = new Date(opening.getFullYear(), opening.getMonth(), 1);
  var chosenDay = null;
  var chosenTime = null;

  var monthName = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric"
  });
  var dayName = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  function sameDay(a, b) {
    return a && b && a.getTime() === b.getTime();
  }

  function selectable(date) {
    var weekday = date.getDay();

    return date >= first && date <= last && weekday !== 0 && weekday !== 6;
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  var head = element("div", "booking__head");
  var back = element("button", "booking__step", "‹");
  var forward = element("button", "booking__step", "›");
  var label = element("p", "booking__month");

  back.type = "button";
  forward.type = "button";
  back.setAttribute("aria-label", "Previous month");
  forward.setAttribute("aria-label", "Next month");

  head.appendChild(back);
  head.appendChild(label);
  head.appendChild(forward);

  var weekdays = element("div", "booking__weekdays");

  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (name) {
    weekdays.appendChild(element("span", null, name));
  });

  var grid = element("div", "booking__grid");
  var slots = element("div", "booking__slots");
  var confirm = element("a", "btn btn--solid booking__confirm", "Request this time");

  confirm.hidden = true;

  root.appendChild(head);
  root.appendChild(weekdays);
  root.appendChild(grid);
  root.appendChild(slots);
  root.appendChild(confirm);

  function drawSlots() {
    slots.textContent = "";
    confirm.hidden = true;

    if (!chosenDay) {
      return;
    }

    slots.appendChild(element("p", "booking__slots-title",
      dayName.format(chosenDay)));

    var list = element("div", "booking__slot-row");

    WINDOW.forEach(function (time) {
      var slot = element("button", "booking__slot", time);

      slot.type = "button";

      if (time === chosenTime) {
        slot.classList.add("is-chosen");
        slot.setAttribute("aria-pressed", "true");
      } else {
        slot.setAttribute("aria-pressed", "false");
      }

      slot.addEventListener("click", function () {
        chosenTime = time;
        drawSlots();
      });

      list.appendChild(slot);
    });

    slots.appendChild(list);

    if (chosenTime) {
      var when = dayName.format(chosenDay) + " at " + chosenTime + " CET";

      confirm.href = "mailto:" + MAILTO +
        "?subject=" + encodeURIComponent("Conversation: " + when) +
        "&body=" + encodeURIComponent(
          "Hello Lisette,\n\nI would like to book a conversation on " +
          when + ".\n\n"
        );
      confirm.hidden = false;
    }
  }

  function drawMonth() {
    label.textContent = monthName.format(month);
    grid.textContent = "";

    var start = new Date(month.getFullYear(), month.getMonth(), 1);
    var lead = (start.getDay() + 6) % 7;   // weeks start on Monday
    var days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var i;

    for (i = 0; i < lead; i += 1) {
      grid.appendChild(element("span", "booking__day is-empty"));
    }

    for (i = 1; i <= days; i += 1) {
      var date = new Date(month.getFullYear(), month.getMonth(), i);
      var open = selectable(date);
      var day = element(open ? "button" : "span", "booking__day", String(i));

      if (open) {
        day.type = "button";

        if (sameDay(date, chosenDay)) {
          day.classList.add("is-chosen");
          day.setAttribute("aria-pressed", "true");
        } else {
          day.setAttribute("aria-pressed", "false");
        }

        day.addEventListener("click", function (picked) {
          return function () {
            chosenDay = picked;
            chosenTime = null;
            drawMonth();
            drawSlots();
          };
        }(date));
      } else {
        day.classList.add("is-closed");
      }

      grid.appendChild(day);
    }

    back.disabled = month <= new Date(first.getFullYear(), first.getMonth(), 1);
    forward.disabled = month >= new Date(last.getFullYear(), last.getMonth(), 1);
  }

  back.addEventListener("click", function () {
    month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    drawMonth();
  });

  forward.addEventListener("click", function () {
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    drawMonth();
  });

  drawMonth();
})();
