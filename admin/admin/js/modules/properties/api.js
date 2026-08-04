const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

function getAdminToken() {
  return localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || localStorage.getItem("adminToken") || "";
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
  if (!res.ok) throw new Error(data.error || data.message || "Properties request failed");
  return data;
}

export function loadProperties() {
  return requestJson("/api/admin/properties");
}

export function saveProperty(payload) {
  const id = payload.id || payload.editId || "";
  if (id) {
    return requestJson(`/api/admin/properties/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }
  return requestJson("/api/admin/properties", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteProperty(id) {
  return requestJson(`/api/admin/properties/${encodeURIComponent(id)}`, { method: "DELETE" });
}
