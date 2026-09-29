const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

function getAdminToken() {
  return sessionStorage.getItem("CEYBREEZ_SESSION_TOKEN") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getAdminToken()
  };
}

function uploadHeaders() {
  return { "Authorization": "Bearer " + getAdminToken() };
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

export async function uploadPropertyImage(file, folder = "property-images") {
  if (!file) throw new Error("No image selected");
  if (!String(file.type || "").startsWith("image/")) throw new Error("Please select an image file");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch(API_BASE + "/api/admin/upload-image", {
    method: "POST",
    headers: uploadHeaders(),
    body: fd
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Image upload failed");
  if (!data.url) throw new Error("Upload finished without an image URL");
  return data.url;
}
