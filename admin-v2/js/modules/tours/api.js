const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
const TOKEN_KEY = "CEYBREEZ_ADMIN_TOKEN";

export function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`
  };
}

async function requestJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    console.error("Tours API error", { path, status: res.status, data });
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }
  return data;
}

export function getDestinations() {
  return requestJson("/api/admin/destinations");
}

export function getTourPackages() {
  return requestJson("/api/admin/tour-packages");
}

export function saveTourPackage(payload, id = "") {
  const path = id
    ? `/api/admin/tour-packages/${encodeURIComponent(id)}`
    : "/api/admin/tour-packages";

  console.log("Saving tour package", { path, payload });

  return requestJson(path, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteTourPackage(id) {
  return requestJson(`/api/admin/tour-packages/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
