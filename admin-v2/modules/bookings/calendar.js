import { loadAvailability, deleteAvailabilityBlock } from "./api.js";
import { escapeHtml, formatDate } from "./utils.js";

let availabilityCache = [];

export async function renderBookingCalendar(ctx) {
  const container = document.getElementById("bookingsList");
  if (!container) return;

  try {
    availabilityCache = await loadAvailability();
  } catch (e) {
    console.error(e);
    availabilityCache = [];
  }

  const properties = uniqueProperties(ctx.items, availabilityCache);
  const days = nextDays(14);

  container.innerHTML = `
    <div class="calendar-pro-panel">
      <div class="calendar-head">
        <div>
          <h3>Availability Calendar</h3>
          <p>Live availability from Availability Engine</p>
        </div>

        <div class="calendar-legend">
          <span class="legend green">Available</span>
          <span class="legend red">Booked</span>
          <span class="legend blue">Owner</span>
          <span class="legend grey">Maintenance</span>
          <span class="legend orange">Hold</span>
          <span class="legend purple">Private</span>
        </div>
      </div>

      <div class="availability-table">
        <div class="availability-row availability-header">
          <div class="availability-item">Property</div>

          ${days.map(day => `
            <div class="availability-day">
              <strong>${day.label}</strong>
              <small>${day.display}</small>
            </div>
          `).join("")}
        </div>

        ${properties.map(property => propertyRow(property, days)).join("")}
      </div>
    </div>
  `;

  container.querySelectorAll("[data-availability-id]").forEach(cell => {
    cell.addEventListener("click", () => {
      const id = cell.dataset.availabilityId;
      const row = availabilityCache.find(x => String(x.id) === String(id));
      if (row) openAvailabilityDetails(ctx, row);
    });
  });
}

function propertyRow(property, days) {
  return `
    <div class="availability-row">
      <div class="availability-item">
        <strong>${escapeHtml(property)}</strong>
      </div>

      ${days.map(day => {
        const state = getAvailability(property, day.date);

        return `
          <div
            class="availability-cell ${state.className} ${state.row ? "clickable" : ""}"
            title="${escapeHtml(state.title)}"
            ${state.row ? `data-availability-id="${escapeHtml(state.row.id)}"` : ""}
          >
            ${state.short}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function getAvailability(property, date) {
  const row = availabilityCache.find(a =>
    String(a.propertyName || "").trim().toLowerCase() ===
    String(property || "").trim().toLowerCase() &&
    a.date === date
  );

  if (!row) {
    return {
      className: "available",
      short: "✓",
      title: "Available",
      row: null
    };
  }

  switch (String(row.type || "")) {
    case "Owner Stay":
      return { className: "owner", short: "O", title: "Owner Stay", row };

    case "Maintenance":
      return { className: "maintenance", short: "M", title: "Maintenance", row };

    case "Private":
      return { className: "private", short: "P", title: "Private", row };

    case "Hold":
      return { className: "hold", short: "H", title: "Hold", row };

    default:
      return {
        className: "booked",
        short: "B",
        title: row.guestName || "Booked",
        row
      };
  }
}

function openAvailabilityDetails(ctx, row) {
  const root = document.getElementById("modalRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal small-modal">
        <div class="modal-header">
          <h3 class="modal-title">Availability Details</h3>
          <button class="close-btn" id="closeAvailabilityModal" type="button">×</button>
        </div>

        <div class="modal-body">
          <div class="availability-detail-card">
            <p><b>Property:</b> ${escapeHtml(row.propertyName || "-")}</p>
            <p><b>Date:</b> ${escapeHtml(row.date || "-")}</p>
            <p><b>Type:</b> ${escapeHtml(row.type || "-")}</p>
            <p><b>Status:</b> ${escapeHtml(row.status || "-")}</p>
            <p><b>Source:</b> ${escapeHtml(row.source || "-")}</p>
            <p><b>Guest:</b> ${escapeHtml(row.guestName || "-")}</p>
            <p><b>Mobile:</b> ${escapeHtml(row.guestMobile || "-")}</p>
            <p><b>Reason:</b> ${escapeHtml(row.reason || "-")}</p>
            <p><b>Created:</b> ${formatDate(row.createdAt || row.created_at)}</p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="secondary-btn" id="closeAvailabilityFooter" type="button">Close</button>
          <button class="small-btn danger" id="releaseAvailabilityBtn" type="button">Release / Delete</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("closeAvailabilityModal")?.addEventListener("click", closeModal);
  document.getElementById("closeAvailabilityFooter")?.addEventListener("click", closeModal);

  document.getElementById("releaseAvailabilityBtn")?.addEventListener("click", async () => {
    if (!confirm("Release/delete this availability block?")) return;

    try {
      await deleteAvailabilityBlock(row.bookingId || row.id);
      closeModal();
      await ctx.load();
      alert("Availability released.");
    } catch (error) {
      alert(error.message);
    }
  });
}

function closeModal() {
  const root = document.getElementById("modalRoot");
  if (root) root.innerHTML = "";
}

function uniqueProperties(bookings, availability) {
  const names = new Set();

  bookings.forEach(x => {
    if (x.itemName) names.add(String(x.itemName).trim());
  });

  availability.forEach(x => {
    if (x.propertyName) names.add(String(x.propertyName).trim());
  });

  return [...names].sort();
}

function nextDays(total) {
  const list = [];
  const today = new Date();

  for (let i = 0; i < total; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const iso = d.toISOString().slice(0, 10);

    list.push({
      date: iso,
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      display: formatDate(iso)
    });
  }

  return list;
}
