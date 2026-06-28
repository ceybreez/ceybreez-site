import {
  badgeClass,
  bookingType,
  escapeHtml,
  formatDate,
  nightsBetween
} from "./utils.js";

export function renderBookingDetails(ctx, id) {
  const booking = ctx.items.find(x => String(x.id) === String(id));
  const box = document.getElementById("bookingDetailPanel");

  if (!booking || !box) return;

  box.innerHTML = `
    <div class="detail-head">
      <div>
        <h3>${escapeHtml(booking.reference || booking.id || "-")}</h3>
        <p>${bookingType(booking).toUpperCase()} Booking</p>
      </div>

      <span class="badge ${badgeClass(booking.status)}">
        ${escapeHtml(booking.status || "Booked")}
      </span>
    </div>

    <div class="detail-grid">
      <div class="detail-section">
        <h4>Guest Card</h4>
        <p><b>Name:</b> ${escapeHtml(booking.guestName || "-")}</p>
        <p><b>Email:</b> ${escapeHtml(booking.guestEmail || "-")}</p>
        <p><b>Mobile:</b> ${escapeHtml(booking.guestMobile || "-")}</p>
      </div>

      <div class="detail-section">
        <h4>Booking Card</h4>
        <p><b>Item:</b> ${escapeHtml(booking.itemName || "-")}</p>
        <p><b>Service:</b> ${escapeHtml(booking.serviceType || "-")}</p>
        <p><b>Check-in:</b> ${escapeHtml(booking.dateFrom || "-")}</p>
        <p><b>Check-out:</b> ${escapeHtml(booking.dateTo || "-")}</p>
        <p><b>Nights:</b> ${nightsBetween(booking.dateFrom, booking.dateTo)}</p>
        <p><b>Guests:</b> ${escapeHtml(booking.guests || "-")}</p>
      </div>

      <div class="detail-section">
        <h4>Payment Card</h4>
        <p><b>Currency:</b> ${escapeHtml(booking.currency || booking.quoteCurrency || "-")}</p>
        <p><b>Rate:</b> ${escapeHtml(booking.dayRate || booking.quoteUnitRate || "-")}</p>
        <p><b>Total:</b> ${escapeHtml(booking.totalAmount || booking.quoteTotalAmount || "-")}</p>
        <p><b>Advance:</b> ${escapeHtml(booking.advanceAmount || "-")}</p>
        <p><b>Balance:</b> ${escapeHtml(booking.balanceAmount || "-")}</p>
        <p><b>Payment Status:</b> ${escapeHtml(booking.paymentStatus || "Pending")}</p>
      </div>

      <div class="detail-section">
        <h4>Invoice Card</h4>
        <p><b>Invoice:</b> ${escapeHtml(booking.invoiceNo || "Not generated")}</p>
        <p><b>Quote:</b> ${escapeHtml(booking.quoteNo || "Not generated")}</p>
        <p><b>Created:</b> ${formatDate(booking.createdAt || booking.created_at)}</p>
      </div>

      <div class="detail-section full">
        <h4>Timeline</h4>
        ${bookingTimelineHtml(booking)}
      </div>

      <div class="detail-section full">
        <h4>Admin Notes</h4>
        <div class="note-compose">
          <textarea id="bookingAdminNote" placeholder="Add note for this booking..."></textarea>
          <button class="primary-btn" id="saveBookingNoteBtn">Save Note</button>
        </div>
        <div class="notes-list">
          <div class="empty-state small-empty">Booking notes database will be connected in next step.</div>
        </div>
      </div>
    </div>

    <div class="detail-actions">
      <button class="secondary-btn" id="bookingWhatsappBtn">WhatsApp</button>
      <button class="secondary-btn" id="bookingEmailBtn">Email</button>
      <button class="secondary-btn" id="bookingInvoiceBtn">Invoice</button>
      <button class="primary-btn" id="bookingCheckinBtn">Check-in</button>
      <button class="secondary-btn" id="bookingCheckoutBtn">Check-out</button>
      <button class="small-btn danger" id="bookingCancelBtn">Cancel Booking</button>
    </div>
  `;

  document.getElementById("bookingWhatsappBtn")?.addEventListener("click", () => openBookingWhatsApp(booking));
  document.getElementById("bookingEmailBtn")?.addEventListener("click", () => emailBookingGuest(booking));
  document.getElementById("bookingInvoiceBtn")?.addEventListener("click", () => alert("Invoice module will be connected in V2.2D."));
  document.getElementById("bookingCheckinBtn")?.addEventListener("click", () => alert("Check-in workflow will be connected in V2.2E."));
  document.getElementById("bookingCheckoutBtn")?.addEventListener("click", () => alert("Check-out workflow will be connected in V2.2E."));
  document.getElementById("bookingCancelBtn")?.addEventListener("click", () => ctx.cancelBooking(booking.id));
  document.getElementById("saveBookingNoteBtn")?.addEventListener("click", () => alert("Booking notes API will be connected in next step."));
}

function bookingTimelineHtml(booking) {
  const created = booking.createdAt || booking.created_at || booking.dateFrom || "";

  return `
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <strong>Booking Created</strong>
          <small>${formatDate(created)}</small>
        </div>
      </div>

      ${booking.dateFrom ? `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <strong>Check-in Scheduled</strong>
            <small>${formatDate(booking.dateFrom)}</small>
          </div>
        </div>
      ` : ""}

      ${booking.dateTo ? `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <strong>Check-out Scheduled</strong>
            <small>${formatDate(booking.dateTo)}</small>
          </div>
        </div>
      ` : ""}

      ${String(booking.status || "").toLowerCase() === "cancelled" ? `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <strong>Booking Cancelled</strong>
            <small>${formatDate(booking.updatedAt || booking.updated_at || created)}</small>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function openBookingWhatsApp(booking) {
  const phone = String(booking.guestMobile || "").replace(/[^\d]/g, "");

  if (!phone) {
    alert("Guest mobile number not available");
    return;
  }

  const text = encodeURIComponent(
`Hello ${booking.guestName || ""},

Your CeyBreez booking details:

Reference: ${booking.reference || booking.id || ""}
Property / Tour: ${booking.itemName || ""}
Check-in: ${booking.dateFrom || ""}
Check-out: ${booking.dateTo || ""}

Thank you,
CeyBreez`
  );

  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
}

function emailBookingGuest(booking) {
  if (!booking.guestEmail) {
    alert("Guest email not available");
    return;
  }

  window.location.href =
    `mailto:${booking.guestEmail}?subject=CeyBreez Booking ${booking.reference || ""}`;
}
