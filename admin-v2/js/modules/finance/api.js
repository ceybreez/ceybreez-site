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
  if (!res.ok) throw new Error(data.error || data.message || "Finance request failed");
  return data;
}

export function loadFinanceSummary() {
  return requestJson("/api/admin/finance/summary");
}

export function loadBookingFinanceHistory(bookingId) {
  return requestJson(`/api/admin/finance/history/${encodeURIComponent(bookingId)}`);
}

export function savePayment(payload) {
  return requestJson("/api/admin/finance/payments", { method: "POST", body: JSON.stringify(payload) });
}

export function updatePayment(id, payload) {
  return requestJson(`/api/admin/finance/payments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deletePayment(id) {
  return requestJson(`/api/admin/finance/payments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function saveRefund(payload) {
  return requestJson("/api/admin/finance/refunds", { method: "POST", body: JSON.stringify(payload) });
}

export function updateRefund(id, payload) {
  return requestJson(`/api/admin/finance/refunds/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteRefund(id) {
  return requestJson(`/api/admin/finance/refunds/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function financeCsvUrl() {
  return API_BASE + "/api/admin/finance/export/csv?token=" + encodeURIComponent(getAdminToken());
}

export function financeReceiptUrl(kind, id) {
  return API_BASE + `/api/admin/finance/receipt/${encodeURIComponent(kind)}/${encodeURIComponent(id)}?token=` + encodeURIComponent(getAdminToken());
}


export function financeInvoiceUrl(bookingId) {
  return API_BASE + `/api/admin/finance/invoice/${encodeURIComponent(bookingId)}?token=` + encodeURIComponent(getAdminToken());
}

export function emailFinanceReceipt(kind, id) {
  return requestJson('/api/admin/finance/email-receipt', {
    method: 'POST',
    body: JSON.stringify({ kind, id })
  });
}

export function emailFinanceInvoice(bookingId) {
  return requestJson('/api/admin/finance/email-invoice', {
    method: 'POST',
    body: JSON.stringify({ bookingId })
  });
}
export function saveAdjustment(payload) {
  return requestJson("/api/admin/finance/adjustments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function saveCommission(payload) {
  return requestJson("/api/admin/finance/commissions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
