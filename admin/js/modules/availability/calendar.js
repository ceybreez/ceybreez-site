import { getBookedDatesForProperty } from "./helpers.js";

let fromPicker = null;
let toPicker = null;
let disabledDates = [];

function decorateBookedDay(dayElem) {
  const date = dayElem.dateObj.toISOString().slice(0, 10);

  if (disabledDates.includes(date)) {
    dayElem.classList.add("cey-booked-date");
    dayElem.title = "Not Available";
  }
}

export function initBlockDatePickers(bookings = []) {
  const propertyInput = document.getElementById("v18BlockProperty");
  const fromInput = document.getElementById("v18BlockFrom");
  const toInput = document.getElementById("v18BlockTo");

  if (!propertyInput || !fromInput || !toInput) return;
  if (typeof flatpickr === "undefined") return;

  if (fromPicker) fromPicker.destroy();
  if (toPicker) toPicker.destroy();

  function refreshDisabledDates() {
    disabledDates = getBookedDatesForProperty(propertyInput.value, bookings);

    if (fromPicker) {
      fromPicker.set("disable", disabledDates);
      fromPicker.redraw();
    }

    if (toPicker) {
      toPicker.set("disable", disabledDates);
      toPicker.redraw();
    }
  }

  fromPicker = flatpickr(fromInput, {
    dateFormat: "Y-m-d",
    disable: disabledDates,
    onChange: function (_selectedDates, dateStr) {
      if (toPicker) {
        toPicker.set("minDate", dateStr);
      }
    },
    onDayCreate: function (_dObj, _dStr, _fp, dayElem) {
      decorateBookedDay(dayElem);
    }
  });

  toPicker = flatpickr(toInput, {
    dateFormat: "Y-m-d",
    disable: disabledDates,
    onDayCreate: function (_dObj, _dStr, _fp, dayElem) {
      decorateBookedDay(dayElem);
    }
  });

  propertyInput.addEventListener("change", refreshDisabledDates);
  propertyInput.addEventListener("input", refreshDisabledDates);

  refreshDisabledDates();
}

export function refreshBlockDatePickers(bookings = []) {
  const propertyInput = document.getElementById("v18BlockProperty");
  if (!propertyInput) return;

  disabledDates = getBookedDatesForProperty(propertyInput.value, bookings);

  if (fromPicker) {
    fromPicker.set("disable", disabledDates);
    fromPicker.redraw();
  }

  if (toPicker) {
    toPicker.set("disable", disabledDates);
    toPicker.redraw();
  }
}
