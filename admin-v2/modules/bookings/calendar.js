import {
  bookingCoversDate,
  escapeHtml,
  formatDate
} from "./utils.js";

export function renderBookingCalendar(ctx) {
  const container = document.getElementById("bookingsList");
  if (!container) return;

  const days = nextDays(14);
  const items = uniqueItems(ctx.items);

  if (!items.length) {
    container.innerHTML = `<div class="empty-state">No booking items found for calendar.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="calendar-pro-panel">
      <div class="calendar-head">
        <h3>Availability Calendar</h3>
        <p>Next 14 days booking availability overview.</p>
      </div>

      <div class="availability-table">
        <div class="availability-row availability-header">
          <div class="availability-item">Property / Tour</div>
          ${days.map(day => `
            <div class="availability-day">
              <strong>${day.label}</strong>
              <small>${day.date.slice(5)}</small>
            </div>
          `).join("")}
        </div>

        ${items.map(itemName => rowHtml(ctx, itemName, days)).join("")}
      </div>
    </div>
  `;
}

function rowHtml(ctx, itemName, days) {
  return `
    <div class="availability-row">
      <div class="availability-item">
        <strong>${escapeHtml(itemName)}</strong>
      </div>

      ${days.map(day => {
        const booking = ctx.items.find(b =>
          String(b.itemName || "").trim() === itemName &&
          bookingCoversDate(b, day.date) &&
          String(b.status || "").toLowerCase() !== "cancelled"
        );

        return `
          <div
            class="availability-cell ${booking ? "booked" : "available"}"
            title="${booking ? escapeHtml(booking.guestName || "Booked") : "Available"}"
          >
            ${booking ? "Booked" : "Free"}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function uniqueItems(bookings) {
  return [...new Set(
    bookings
      .map(b => String(b.itemName || b.serviceType || "").trim())
      .filter(Boolean)
  )].sort();
}

function nextDays(count) {
  const today = new Date();
  const days = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    days.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      display: formatDate(date.toISOString().slice(0, 10))
    });
  }

  return days;
}
