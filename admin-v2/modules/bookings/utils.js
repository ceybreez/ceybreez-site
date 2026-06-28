export function normalizeStatus(status) {
  return String(status || "Booked").toLowerCase();
}

export function bookingType(item) {
  const text = `
    ${item.bookingCategory || ""}
    ${item.serviceType || ""}
    ${item.itemName || ""}
    ${item.reference || ""}
  `.toLowerCase();

  if (text.includes("tour") || text.includes("trip") || text.includes("safari")) return "tour";
  if (text.includes("manual") || String(item.reference || "").startsWith("MAN-")) return "manual";

  return "property";
}

export function bookingCoversDate(booking, dateValue) {
  if (!booking.dateFrom || !booking.dateTo) return false;
  return dateValue >= booking.dateFrom && dateValue < booking.dateTo;
}

export function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function moneyValue(value) {
  return Number(String(value || "0").replace(/[^\d.]/g, "")) || 0;
}

export function nightsBetween(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return 0;

  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);

  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));

  return diff > 0 ? diff : 0;
}

export function badgeClass(status) {
  const s = normalizeStatus(status);

  if (s.includes("booked") || s.includes("paid") || s.includes("confirmed")) return "badge-booked";
  if (s.includes("pending") || s.includes("quoted")) return "badge-quoted";
  if (s.includes("cancel") || s.includes("closed")) return "badge-cancelled";

  return "badge-new";
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
