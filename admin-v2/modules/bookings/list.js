import {
  badgeClass,
  bookingType,
  escapeHtml,
  formatDate
} from "./utils.js";

export function renderBookingList(ctx) {
  const container = document.getElementById("bookingsList");

  if (!container) return;

  if (!ctx.filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        No bookings found.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="booking-pro-layout">

      <div class="booking-list-panel">

        ${ctx.filtered.map(item => bookingCard(ctx, item)).join("")}

      </div>

      <div
        id="bookingDetailPanel"
        class="booking-detail-panel">

        <div class="empty-state">
          Select a booking to view details.
        </div>

      </div>

    </div>
  `;

  container
    .querySelectorAll("[data-booking-id]")
    .forEach(card => {

      card.addEventListener("click", () => {

        ctx.selectedId = card.dataset.bookingId;

        renderBookingList(ctx);

        ctx.renderDetails(ctx.selectedId);

      });

    });

}

function bookingCard(ctx, booking) {

  const active =
    String(ctx.selectedId) === String(booking.id)
      ? "active"
      : "";

  return `
<button
class="booking-list-item ${active}"
data-booking-id="${escapeHtml(booking.id)}">

<div>

<strong>

${escapeHtml(
booking.reference || booking.id || "-"
)}

</strong>

<span>

${escapeHtml(
booking.guestName || "Guest"
)}

</span>

<small>

${escapeHtml(
booking.itemName ||
booking.serviceType ||
"CeyBreez Booking"
)}

</small>

</div>

<div class="booking-list-side">

<span
class="badge ${badgeClass(
booking.status
)}">

${escapeHtml(
booking.status || "Booked"
)}

</span>

<small>

${bookingType(booking)
.toUpperCase()}

</small>

<small>

${formatDate(
booking.dateFrom
)}

</small>

</div>

</button>

`;
}
