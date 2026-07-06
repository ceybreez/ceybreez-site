import { clean, dateOnly, getDatesBetween } from "../../core/utils.js";

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function isBooked(item) {
  return clean(item?.status || "Booked") === "booked";
}

export function bookingCovers(booking, propertyName, date) {
  const from = dateOnly(booking?.dateFrom);
  const to = dateOnly(booking?.dateTo);

  return (
    isBooked(booking) &&
    clean(booking?.itemName) === clean(propertyName) &&
    from &&
    to &&
    from <= date &&
    to > date
  );
}

export function activePropertiesByType(properties, type = "all") {
  return safeArray(properties).filter(property => {
    const active = property.active !== false && Number(property.active) !== 0;
    const typeOk = !type || type === "all" || clean(property.type) === clean(type);
    return active && typeOk;
  });
}

export function dateRange(from, to) {
  return getDatesBetween(from, to);
}

export function blockCovers(block, propertyName, date) {
  return (
    clean(block?.propertyName) === clean(propertyName) &&
    Array.isArray(block?.dates) &&
    block.dates.includes(date)
  );
}

export function availabilityTypeClass(type) {
  const value = clean(type);

  if (value.includes("owner")) return "owner";
  if (value.includes("maintenance")) return "maintenance";
  if (value.includes("private")) return "private";
  if (value.includes("hold")) return "hold";

  return "blocked";
}

export function availabilityShort(type) {
  const value = clean(type);

  if (value.includes("owner")) return "O";
  if (value.includes("maintenance")) return "M";
  if (value.includes("private")) return "P";
  if (value.includes("hold")) return "H";

  return "X";
}

export function getBookedDatesForProperty(propertyName, bookings) {
  const disabled = [];

  safeArray(bookings).forEach(booking => {
    if (!isBooked(booking)) return;
    if (clean(booking.itemName) !== clean(propertyName)) return;

    dateRange(dateOnly(booking.dateFrom), dateOnly(booking.dateTo)).forEach(date => {
      disabled.push(date);
    });
  });

  return disabled;
}

export function toISO(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(count) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + count);
  return toISO(date);
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

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
export function dateOnly(value) {
  return String(value || "").slice(0, 10);
}
