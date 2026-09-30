const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

function authHeaders() {
  if (typeof window.authHeaders === "function") return window.authHeaders();
  const token = sessionStorage.getItem("CEYBREEZ_SESSION_TOKEN") || "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function uploadHeaders() {
  if (typeof window.uploadHeaders === "function") return window.uploadHeaders();
  const token = sessionStorage.getItem("CEYBREEZ_SESSION_TOKEN") || "";
  return { Authorization: `Bearer ${token}` };
}

async function jsonOrThrow(res, fallback) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || fallback);
  return data;
}

export async function loadServices() {
  const res = await fetch(`${API_BASE}/api/admin/services`, { headers: authHeaders() });
  return jsonOrThrow(res, "Failed to load services");
}

export async function saveService(payload) {
  const res = await fetch(`${API_BASE}/api/admin/services`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res, "Service save failed");
}

export async function deleteService(id) {
  const res = await fetch(`${API_BASE}/api/admin/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return jsonOrThrow(res, "Service delete failed");
}

export async function uploadServiceImage(file, folder = "services") {
  if (!file) throw new Error("Select an image first.");
  if (!String(file.type || "").startsWith("image/")) throw new Error("Only image files are allowed.");
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
    method: "POST",
    headers: uploadHeaders(),
    body: form,
  });
  const data = await jsonOrThrow(res, "Image upload failed");
  if (!data.url) throw new Error("Upload completed but no image URL was returned.");
  return data.url;
}
