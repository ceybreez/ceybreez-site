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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function getDestinations() {
  return requestJson("/api/admin/destinations");
}

export function getTourPackages() {
  return requestJson("/api/admin/tour-packages");
}

export function saveTourPackage(payload, id = "") {
  return requestJson(id ? `/api/admin/tour-packages/${encodeURIComponent(id)}` : "/api/admin/tour-packages", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteTourPackage(id) {
  return requestJson(`/api/admin/tour-packages/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
