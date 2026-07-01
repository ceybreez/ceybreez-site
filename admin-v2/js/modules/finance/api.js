const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

function getAdminToken() {
  return (
    localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") ||
    localStorage.getItem("adminToken") ||
    ""
  );
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getAdminToken()
  };
}

async function requestJson(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || "Finance request failed");
  }
  return data;
}

export async function loadFinanceSummary() {
  return requestJson("/api/admin/finance/summary");
}

export async function savePayment(payload) {
  return requestJson("/api/admin/finance/payments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function saveRefund(payload) {
  return requestJson("/api/admin/finance/refunds", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
