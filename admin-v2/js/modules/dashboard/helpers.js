import { clean, dateOnly } from "../../core/utils.js";

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function isBooked(item) {
  return clean(item?.status || "Booked") === "booked";
}

export function addDays(count) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + count);
  return date.toISOString().slice(0, 10);
}

export function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function bookingCheckIn(booking, date) {
  return isBooked(booking) && dateOnly(booking.dateFrom) === date;
}

export function bookingCheckOut(booking, date) {
  return isBooked(booking) && dateOnly(booking.dateTo) === date;
}

export function bookingInHouse(booking, date) {
  const from = dateOnly(booking.dateFrom);
  const to = dateOnly(booking.dateTo);

  return isBooked(booking) && from && to && from <= date && to > date;
}

export function money(value) {
  const amount = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export function bookingAmount(booking) {
  return money(
    booking.totalAmount ||
    booking.quoteTotalAmount ||
    booking.amount ||
    booking.price ||
    0
  );
}

export function paymentPending(booking) {
  const text = clean(`
    ${booking.paymentStatus || ""}
    ${booking.advanceAmount || ""}
    ${booking.balanceAmount || ""}
  `);

  if (!isBooked(booking)) return false;
  if (text.includes("paid") && !text.includes("partial")) return false;
  if (text.includes("pending") || text.includes("unpaid") || text.includes("partial")) return true;

  return !!money(booking.balanceAmount || 0);
}

export function needsFollowUp(inquiry) {
  const status = clean(inquiry.status || "New");
  return ["new", "contacted", "quoted"].includes(status);
}

export function latest(items, count = 8) {
  return [...safeArray(items)]
    .sort((a, b) =>
      String(b.createdAt || b.created_at || b.dateFrom || "").localeCompare(
        String(a.createdAt || a.created_at || a.dateFrom || "")
      )
    )
    .slice(0, count);
}

export function percent(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function propertyTypeCounts(properties) {
  const map = {
    villa: 0,
    homestay: 0,
    apartment: 0,
    active: 0,
    featured: 0
  };

  safeArray(properties).forEach(property => {
    const type = clean(property.type);

    if (map[type] !== undefined) {
      map[type]++;
    }

    if (property.active !== false && Number(property.active) !== 0) {
      map.active++;
    }

    if (property.featured === true || Number(property.featured) === 1) {
      map.featured++;
    }
  });

  return map;
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
