import { API_BASE, TOKEN_KEY } from "./config.js";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAdminToken()}`
  };
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders()
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "API request failed");
  }

  return data;
}

export async function apiPost(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload || {})
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "API request failed");
  }

  return data;
}
