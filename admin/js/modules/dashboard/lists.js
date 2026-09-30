import { escapeHtml, formatDate } from "./helpers.js";

export function stat(label,value,sub,{icon="•",tone="",action=""}={}){
  const actionAttr=action ? ` data-dashboard-action="${escapeHtml(action)}" tabindex="0" role="button"` : "";
  return `<div class="v63-stat-card ${tone ? `tone-${escapeHtml(tone)}` : ""}"${actionAttr}>
    <div class="v63-stat-icon" aria-hidden="true">${escapeHtml(icon)}</div>
    <div class="v63-stat-copy"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(sub||"")}</small></div>
  </div>`;
}

export function listHtml(items, empty,{showDate=false}={}){
  if(!items || !items.length) return `<div class="v63-empty"><span>✓</span><p>${escapeHtml(empty)}</p></div>`;
  return `<div class="v63-list">${items.slice(0,8).map(b=>{
    const date=showDate ? (b.dateFrom||b.createdAt||b.created_at||"") : "";
    return `<div class="v63-list-item"><div class="v63-list-main"><strong>${escapeHtml(b.guestName||b.name||b.itemName||"Guest")}</strong><small>${escapeHtml(b.itemName||b.serviceType||b.location||b.title||"-")}</small>${date?`<em>${escapeHtml(formatDate(date))}</em>`:""}</div><span class="v63-pill">${escapeHtml(b.reference||b.status||b.paymentStatus||b.id||"")}</span></div>`;
  }).join("")}</div>`;
}

export function smallMetric(label,value,tone=""){
  return `<div class="v63-mini-metric ${tone ? `tone-${escapeHtml(tone)}` : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

export function panel(title,body,{subtitle="",action="",actionLabel="View all"}={}){
  return `<section class="v63-panel"><div class="v63-panel-head"><div><h3>${escapeHtml(title)}</h3>${subtitle?`<p>${escapeHtml(subtitle)}</p>`:""}</div>${action?`<button type="button" data-dashboard-action="${escapeHtml(action)}">${escapeHtml(actionLabel)} →</button>`:""}</div>${body}</section>`;
}
