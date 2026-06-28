const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
const TOKEN_KEY = "CEYBREEZ_ADMIN_TOKEN";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`
  };
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders()
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}

export async function apiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}

export async function apiPut(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}

export async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
