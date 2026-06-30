const API_BASE =
  window.CEYBREEZ_API_BASE ||
  "https://ceybreez-contact-api.ceybreez.workers.dev";

function authHeaders() {
  const token = localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function toDateOnly(value) {
  return String(value || "").slice(0, 10);
}

function dateRange(start, end) {
  const out = [];
  if (!start || !end) return out;

  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);

  for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }

  return out;
}

export async function loadBookedDates(propertyName) {
  if (!propertyName) return [];

  const res = await fetch(`${API_BASE}/api/admin/bookings`, {
    headers: authHeaders()
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to load bookings");
  }

  const booked = [];

  (data || []).forEach(item => {
    const status = String(item.status || "Booked").toLowerCase();
    const itemName = normalizeName(item.itemName);

    if (status !== "booked") return;
    if (itemName !== normalizeName(propertyName)) return;

    dateRange(toDateOnly(item.dateFrom), toDateOnly(item.dateTo)).forEach(d => {
      booked.push({
        date: d,
        reference: item.reference || item.id || "",
        guestName: item.guestName || "",
        type: item.serviceType || "Booking"
      });
    });
  });

  return booked;
}

export async function checkDateConflict(propertyName, dateFrom, dateTo) {
  const booked = await loadBookedDates(propertyName);
  const wanted = dateRange(dateFrom, dateTo);

  const conflict = wanted
    .map(d => booked.find(b => b.date === d))
    .find(Boolean);

  return {
    available: !conflict,
    conflict,
    booked
  };
}

export function showAvailabilityMessage(message, type = "bad") {
  const box = document.getElementById("manualAvailabilityMsg");
  if (!box) return;

  box.className = `manual-availability-msg ${type}`;
  box.textContent = message;
}

export function clearAvailabilityMessage() {
  const box = document.getElementById("manualAvailabilityMsg");
  if (!box) return;

  box.className = "manual-availability-msg";
  box.textContent = "";
}
