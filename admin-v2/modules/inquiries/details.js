import { apiGet } from "../../utils/api.js";
import { updateStatus, confirmBooking, deleteItem } from "./actions.js";
import { saveNote, notesHtml } from "./notes.js";
import { timelineHtml } from "./timeline.js";

export async function renderDetails(ctx, id) {
  const item = ctx.items.find(x => String(x.id) === String(id));
  const box = document.getElementById("inquiryDetailPanel");
  if (!item || !box) return;

  ctx.notes = await safeNotes(ctx, id);

  box.innerHTML = `
    <div class="detail-head">
      <div><h3>${ctx.escape(item.reference || item.id || "-")}</h3><p>${ctx.escape(ctx.type(item).toUpperCase())} Inquiry</p></div>
      <span class="badge ${ctx.badgeClass(item.status)}">${ctx.escape(item.status || "New")}</span>
    </div>

    <div class="detail-grid">
      <div class="detail-section"><h4>Guest Card</h4>
        <p><b>Name:</b> ${ctx.escape(item.guestName || "-")}</p>
        <p><b>Email:</b> ${ctx.escape(item.guestEmail || "-")}</p>
        <p><b>Mobile:</b> ${ctx.escape(item.guestMobile || "-")}</p>
        <p><b>Country:</b> ${ctx.escape(item.guestCountry || "-")}</p>
      </div>

      <div class="detail-section"><h4>Booking / Inquiry Card</h4>
        <p><b>Service:</b> ${ctx.escape(item.serviceType || "-")}</p>
        <p><b>Selected:</b> ${ctx.escape(item.itemName || "-")}</p>
        <p><b>Guests:</b> ${ctx.escape(item.guests || "-")}</p>
        <p><b>Dates:</b> ${ctx.escape(item.dateFrom || "-")} → ${ctx.escape(item.dateTo || "-")}</p>
      </div>

      <div class="detail-section full"><h4>Guest Message</h4><div class="message-box">${ctx.escape(item.message || "No message")}</div></div>

      <div class="detail-section"><h4>Status Control</h4>
        <div class="detail-status-row">
          <select id="detailStatusSelect">
            ${["New", "Contacted", "Quoted", "Guest Confirmed", "Admin Confirmed", "Booked", "Cancelled", "Closed"].map(s => `<option value="${s}" ${String(item.status || "New") === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <button class="primary-btn" id="updateDetailStatusBtn">Update</button>
        </div>
      </div>

      <div class="detail-section"><h4>Timeline</h4>${timelineHtml(ctx, item)}</div>

      <div class="detail-section full"><h4>Internal Notes</h4>
        <div class="note-compose"><textarea id="newInquiryNote" placeholder="Add internal note for this inquiry..."></textarea><button class="primary-btn" id="saveInquiryNoteBtn">Save Note</button></div>
        <div class="notes-list">${notesHtml(ctx)}</div>
      </div>
    </div>

    <div class="detail-actions">
      <button class="secondary-btn" id="detailWhatsappBtn">WhatsApp</button>
      <button class="secondary-btn" id="detailEmailBtn">Email</button>
      <button class="secondary-btn" id="detailCopyBtn">Copy</button>
      <button class="primary-btn" id="detailConfirmBookingBtn">Confirm Booking</button>
      <button class="small-btn danger" id="detailDeleteBtn">Delete</button>
    </div>
  `;

  document.getElementById("updateDetailStatusBtn")?.addEventListener("click", () => updateStatus(ctx, item.id, document.getElementById("detailStatusSelect")?.value || "New"));
  document.getElementById("saveInquiryNoteBtn")?.addEventListener("click", () => saveNote(ctx, item.id));
  document.getElementById("detailWhatsappBtn")?.addEventListener("click", () => openWhatsApp(ctx, item));
  document.getElementById("detailEmailBtn")?.addEventListener("click", () => emailGuest(item));
  document.getElementById("detailCopyBtn")?.addEventListener("click", () => copyItem(item));
  document.getElementById("detailDeleteBtn")?.addEventListener("click", () => deleteItem(ctx, item.id));
  document.getElementById("detailConfirmBookingBtn")?.addEventListener("click", () => confirmBooking(ctx, item));
}

async function safeNotes(ctx, id) {
  try {
    const data = await apiGet(`/api/admin/inquiries/${id}/notes`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function openWhatsApp(ctx, item) {
  const phone = String(item.guestMobile || "").replace(/[^\d]/g, "");
  if (!phone) { alert("Guest mobile number not available"); return; }
  const text = encodeURIComponent(`Hello ${item.guestName || ""},\n\nThank you for contacting CeyBreez.\n\nReference: ${item.reference || item.id || ""}\n\nWe will contact you shortly.\n\nBest Regards,\nCeyBreez`);
  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
}

function emailGuest(item) {
  if (!item.guestEmail) { alert("Guest email not available"); return; }
  window.location.href = `mailto:${item.guestEmail}?subject=CeyBreez Inquiry ${item.reference || ""}`;
}

function copyItem(item) {
  navigator.clipboard.writeText(JSON.stringify(item, null, 2));
  alert("Inquiry copied");
}