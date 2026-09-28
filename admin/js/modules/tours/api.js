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


export async function uploadTourImage(file, folder = "tour-packages") {
  if (!file) throw new Error("Please select an image");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`
    },
    body: formData
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Upload failed: ${res.status}`);
  }

  if (!data.url) throw new Error("Upload completed, but no image URL was returned");
  return data.url;
}
