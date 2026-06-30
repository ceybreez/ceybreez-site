const FINANCE_API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

function getAdminToken() {
  return localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || "";
}

function financeHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getAdminToken()}`
  };
}

async function parseJsonResponse(response) {
  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    throw new Error((data && data.error) || "Finance request failed");
  }

  return data;
}

export async function fetchFinanceBookings() {
  const response = await fetch(`${FINANCE_API_BASE}/api/admin/bookings`, {
    headers: financeHeaders()
  });

  const data = await parseJsonResponse(response);
  return Array.isArray(data) ? data : [];
}

export async function saveBookingFinance(bookingId, payload) {
  const response = await fetch(`${FINANCE_API_BASE}/api/admin/bookings/${encodeURIComponent(bookingId)}/finance`, {
    method: "PUT",
    headers: financeHeaders(),
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response);
}
