const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

function getAdminToken() {
  return localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || localStorage.getItem("adminToken") || "";
}

function authHeaders() {
  return { "Content-Type": "application/json", "Authorization": "Bearer " + getAdminToken() };
}

async function requestJson(path, options = {}) {
  const res = await fetch(API_BASE + path, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Reports request failed");
  return data;
}

function queryString(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") q.set(key, String(value));
  });
  const text = q.toString();
  return text ? "?" + text : "";
}

export function loadReports(filters = {}) {
  return requestJson("/api/admin/reports" + queryString(filters));
}

export function reportsCsvUrl(filters = {}) {
  return API_BASE + "/api/admin/reports/export/csv" + queryString({ ...filters, token: getAdminToken() });
}
