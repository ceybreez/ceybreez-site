// Shared API helper for V11 modules. Uses the same V10 Worker API base and token key.
export const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
export const TOKEN_KEY = "CEYBREEZ_ADMIN_TOKEN";
export function getToken(){ return localStorage.getItem(TOKEN_KEY) || ""; }
export function authHeaders(){ return { "Content-Type":"application/json", "Authorization":`Bearer ${getToken()}` }; }
export async function apiGet(path){ const r=await fetch(`${API_BASE}${path}`,{headers:authHeaders()}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"API failed"); return d; }
export async function apiPost(path, body={}){ const r=await fetch(`${API_BASE}${path}`,{method:"POST",headers:authHeaders(),body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"API failed"); return d; }
export async function apiPut(path, body={}){ const r=await fetch(`${API_BASE}${path}`,{method:"PUT",headers:authHeaders(),body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"API failed"); return d; }
export async function apiDelete(path){ const r=await fetch(`${API_BASE}${path}`,{method:"DELETE",headers:authHeaders()}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"API failed"); return d; }
