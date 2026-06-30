/* =====================================================
   CeyBreez Booking Date Guard
   Uses shared core api/utils
===================================================== */

import { apiGet } from "../../core/api.js";
import { clean, dateOnly, getDatesBetween } from "../../core/utils.js";

async function loadBookings() {
  const data = await apiGet("/api/admin/bookings");
  return Array.isArray(data) ? data : [];
}

async function getBookedDatesForProperty(propertyName) {
  const bookings = await loadBookings();
  const property = clean(propertyName);
  const booked = [];

  bookings.forEach(item => {
    if (clean(item.status || "Booked") !== "booked") return;
    if (clean(item.itemName) !== property) return;

    getDatesBetween(
      dateOnly(item.dateFrom),
      dateOnly(item.dateTo)
    ).forEach(date => {
      booked.push({
        date,
        reference: item.reference || item.id || "",
        guestName: item.guestName || "",
        itemName: item.itemName || "",
        type: item.serviceType || "Booking"
      });
    });
  });

  return booked;
}

function showManualAvailabilityMessage(message, type) {
  const box = document.getElementById("manualAvailabilityMsg");
  if (!box) return;

  box.className = `manual-availability-msg ${type}`;
  box.textContent = message;
}

function clearManualAvailabilityMessage() {
  const box = document.getElementById("manualAvailabilityMsg");
  if (!box) return;

  box.className = "manual-availability-msg";
  box.textContent = "";
}

async function checkManualBookingAvailability() {
  const propertyName = document.getElementById("manualItemName")?.value || "";
  const dateFrom = document.getElementById("manualDateFrom")?.value || "";
  const dateTo = document.getElementById("manualDateTo")?.value || "";

  clearManualAvailabilityMessage();

  if (!propertyName || !dateFrom || !dateTo) return true;

  if (dateFrom >= dateTo) {
    showManualAvailabilityMessage(
      "Check-out date must be after check-in date.",
      "bad"
    );
    return false;
  }

  const booked = await getBookedDatesForProperty(propertyName);
  const wantedDates = getDatesBetween(dateFrom, dateTo);

  const conflict = wantedDates
    .map(date => booked.find(item => item.date === date))
    .find(Boolean);

  if (conflict) {
    showManualAvailabilityMessage(
      `Not available: ${conflict.date} already booked (${conflict.reference || "Booking"}).`,
      "bad"
    );
    return false;
  }

  showManualAvailabilityMessage("Available for selected dates.", "good");
  return true;
}

function attachManualBookingGuard() {
  const form = document.getElementById("manualBookingForm");
  if (!form || form.dataset.dateGuardAttached === "1") return;

  form.dataset.dateGuardAttached = "1";

  ["manualItemName", "manualDateFrom", "manualDateTo"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      checkManualBookingAvailability().catch(error => {
        showManualAvailabilityMessage(error.message, "bad");
      });
    });
  });

  form.addEventListener(
    "submit",
    async event => {
      const available = await checkManualBookingAvailability();

      if (!available) {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert("This property is not available for the selected dates.");
      }
    },
    true
  );
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(attachManualBookingGuard, 700);
});
