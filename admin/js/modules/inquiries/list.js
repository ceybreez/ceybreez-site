import { classifyInquiry, escapeHtml, formatDate, getItemName, statusClass } from './helpers.js';

export function renderStats(box,items){
  if(!box) return;
  const total=items.length;
  const c=s=>items.filter(x=>String(x.status||'New').toLowerCase()===s).length;
  const t=type=>items.filter(x=>classifyInquiry(x)===type).length;
  box.innerHTML=`
    <div class="inq-stat"><span>Total</span><strong>${total}</strong></div>
    <div class="inq-stat"><span>New</span><strong>${c('new')}</strong></div>
    <div class="inq-stat"><span>Quoted</span><strong>${c('quoted')}</strong></div>
    <div class="inq-stat"><span>Booked</span><strong>${c('booked')}</strong></div>
    <div class="inq-stat"><span>Properties</span><strong>${t('property')}</strong></div>
    <div class="inq-stat"><span>Tours</span><strong>${t('tour')}</strong></div>`;
}

export function renderList(box,items,onOpen){
  if(!box) return;
  if(!items.length){ box.innerHTML='<div class="empty-row">No inquiries found.</div>'; return; }
  box.innerHTML=`<div class="inq-table-wrap"><table class="inq-table"><thead><tr><th>Reference</th><th>Date</th><th>Guest</th><th>Type</th><th>Item</th><th>Dates</th><th>Status</th></tr></thead><tbody>${items.map(item=>`
    <tr data-id="${escapeHtml(item.id)}">
      <td><strong>${escapeHtml(item.reference||item.id||'-')}</strong></td>
      <td>${formatDate(item.createdAt||item.created_at)}</td>
      <td><strong>${escapeHtml(item.guestName||'-')}</strong><small>${escapeHtml(item.guestEmail||'')}</small><small>${escapeHtml(item.guestMobile||'')}</small></td>
      <td>${escapeHtml(classifyInquiry(item))}</td>
      <td>${escapeHtml(getItemName(item))}</td>
      <td>${escapeHtml(item.dateFrom||'-')} → ${escapeHtml(item.dateTo||'-')}</td>
      <td><span class="inq-badge ${statusClass(item.status)}">${escapeHtml(item.status||'New')}</span></td>
    </tr>`).join('')}</tbody></table></div>`;
  box.querySelectorAll('tr[data-id]').forEach(row=>row.addEventListener('click',()=>onOpen?.(row.dataset.id)));
}
