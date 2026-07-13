import { dateRange, bookingCovers } from "./helpers.js";

const STORAGE_KEY = "CEYBREEZ_V18_AVAILABILITY_BLOCKS";

export function availabilityBlocks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAvailabilityBlocks(rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows || []));
}

export function deleteBlock(id, renderCallback) {
  if (!confirm("Delete this availability block?")) return;

  saveAvailabilityBlocks(
    availabilityBlocks().filter(item => String(item.id) !== String(id))
  );

  if (typeof renderCallback === "function") {
    renderCallback();
  }
}

export function attachBlockForm(bookings, renderCallback) {
  const form = document.getElementById("v18BlockForm");
  if (!form || form.dataset.blockAttached === "1") return;

  form.dataset.blockAttached = "1";

  form.addEventListener("submit", event => {
    event.preventDefault();

    const propertyName = document.getElementById("v18BlockProperty")?.value || "";
    const type = document.getElementById("v18BlockType")?.value || "";
    const dateFrom = document.getElementById("v18BlockFrom")?.value || "";
    const dateTo = document.getElementById("v18BlockTo")?.value || "";
    const reason = document.getElementById("v18BlockReason")?.value.trim() || "";
    const dates = dateRange(dateFrom, dateTo);

    if (!propertyName || !type || !dates.length) {
      alert("Please select property and valid date range. End date must be after start date.");
      return;
    }

    const conflictBooking = bookings.find(booking =>
      dates.some(date => bookingCovers(booking, propertyName, date))
    );

    if (conflictBooking) {
      alert("This property is already booked in the selected date range.");
      return;
    }

    const rows = availabilityBlocks();

    rows.push({
      id: `BLK-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      propertyName,
      type,
      dateFrom,
      dateTo,
      reason,
      dates,
      createdAt: new Date().toISOString()
    });

    saveAvailabilityBlocks(rows);
    alert("Availability block saved.");

    if (typeof renderCallback === "function") {
      renderCallback();
    }
  });
}
