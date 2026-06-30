import { escapeHtml } from "./helpers.js";

export function stat(label,value,sub){ return `<div class="v14-stat-card"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(sub||"")}</small></div>`; }
export function listHtml(items, empty){ if(!items || !items.length) return `<p class="empty-row">${escapeHtml(empty)}</p>`; return `<div class="v14-list">${items.slice(0,8).map(b=>`<div class="v14-list-item"><div><strong>${escapeHtml(b.guestName||b.name||"Guest")}</strong><small>${escapeHtml(b.itemName||b.serviceType||b.location||"-")}</small></div><span class="v14-pill">${escapeHtml(b.reference||b.status||b.id||"")}</span></div>`).join("")}</div>`; }
export function smallMetric(label,value,tone=""){ return `<div class="v17-mini-metric ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }
