import { clean, dateOnly } from "../../core/utils.js";

export function safeArray(value) { return Array.isArray(value) ? value : []; }
export function isBooked(item) { return clean(item?.status || "Booked") === "booked"; }
export function addDays(count) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+count); return d.toISOString().slice(0,10); }
export function formatDate(value) { if(!value) return "-"; const d=new Date(`${String(value).slice(0,10)}T00:00:00`); if(Number.isNaN(d.getTime())) return value; return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
export function bookingCheckIn(b, d) { return isBooked(b) && dateOnly(b.dateFrom) === d; }
export function bookingCheckOut(b, d) { return isBooked(b) && dateOnly(b.dateTo) === d; }
export function bookingInHouse(b, d) { const f=dateOnly(b.dateFrom), t=dateOnly(b.dateTo); return isBooked(b) && f && t && f <= d && t > d; }
export function money(value) { const n=Number(String(value||"0").replace(/[^0-9.-]/g,"")); return Number.isFinite(n)?n:0; }
export function bookingAmount(b) { return money(b.totalAmount || b.quoteTotalAmount || b.amount || b.price || 0); }
export function paymentPending(b) { const text=clean(`${b.paymentStatus||""} ${b.advanceAmount||""} ${b.balanceAmount||""}`); if(!isBooked(b)) return false; if(text.includes("paid") && !text.includes("partial")) return false; if(text.includes("pending")||text.includes("unpaid")||text.includes("partial")) return true; return !!money(b.balanceAmount||0); }
export function needsFollowUp(i) { const s=clean(i.status || "New"); return ["new","contacted","quoted"].includes(s); }
export function latest(items, count=8) { return [...safeArray(items)].sort((a,b)=>String(b.createdAt||b.created_at||b.dateFrom||"").localeCompare(String(a.createdAt||a.created_at||a.dateFrom||""))).slice(0,count); }
export function percent(value,total) { return total ? Math.round((value/total)*100) : 0; }
export function propertyTypeCounts(properties) { const map={villa:0,homestay:0,apartment:0,active:0,featured:0}; safeArray(properties).forEach(p=>{ const type=clean(p.type); if(map[type]!==undefined) map[type]++; if(p.active!==false && Number(p.active)!==0) map.active++; if(p.featured===true || Number(p.featured)===1) map.featured++; }); return map; }
export function escapeHtml(value) { return String(value||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
