const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

function getAdminToken() {
  return sessionStorage.getItem("CEYBREEZ_SESSION_TOKEN") || "";
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

// Existing admin APIs are used only to correct report semantics on the frontend.
// No Worker/API/schema changes are required.
export function loadTourCostings() {
  return requestJson("/api/admin/finance/tour-costings");
}

export function loadReportProperties() {
  return requestJson("/api/admin/properties");
}

export function reportsCsvUrl(filters = {}) {
  return "/api/admin/reports/export/csv" + queryString(filters);
}
