export function clean(value) {
  return String(value || "").trim().toLowerCase();
}

export function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

export function getDatesBetween(dateFrom, dateTo) {
  const dates = [];
  if (!dateFrom || !dateTo) return dates;

  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  return dates;
}

export function normalizeStatus(status) {
  return String(status || "New").toLowerCase();
}
