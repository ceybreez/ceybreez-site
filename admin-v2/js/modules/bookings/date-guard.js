/* =====================================================
   CeyBreez Booking Date Guard
   Prevent manual booking overlap without touching admin.js
===================================================== */

const API_BASE =
  window.CEYBREEZ_API_BASE ||
  "https://ceybreez-contact-api.ceybreez.workers.dev";

function getAdminToken() {
  return localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAdminToken()}`
  };
}

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function getDatesBetween(dateFrom, dateTo) {
  const dates = [];

  if (!dateFrom || !dateTo) return dates;

  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  return dates;
}

async function loadBookings() {
  const res = await fetch(`${API_BASE}/api/admin/bookings`, {
    headers: authHeaders()
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to load bookings");
  }

  return Array.isArray(data) ? data : [];
}

async function getBookedDatesForProperty(propertyName) {
  const bookings = await loadBookings();
  const property = clean(propertyName);
  const booked = [];

  bookings.forEach(item => {
    if (clean(item.status || "Booked") !== "booked") return;
    if (clean(item.itemName) !== property) return;

    const dates = getDatesBetween(
      dateOnly(item.dateFrom),
      dateOnly(item.dateTo)
    );

    dates.forEach(date => {
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
