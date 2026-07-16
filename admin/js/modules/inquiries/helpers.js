export function safeArray(value){ return Array.isArray(value) ? value : []; }
export function clean(value){ return String(value || '').trim().toLowerCase(); }
export function dateOnly(value){ return String(value || '').slice(0,10); }
export function normalizeStatus(status){ return clean(status || 'New'); }
export function escapeHtml(value){ return String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
export function formatDate(value){ if(!value) return '-'; const d=new Date(String(value).slice(0,10)+'T00:00:00'); if(Number.isNaN(d.getTime())) return String(value); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
export function classifyInquiry(item){ const text=clean(`${item?.category||''} ${item?.serviceType||''} ${item?.itemName||''} ${item?.experiences||''} ${item?.message||''}`); if(text.includes('tour')||text.includes('trip')||text.includes('safari')||text.includes('excursion')) return 'tour'; if(text.includes('service')||text.includes('cafe')||text.includes('restaurant')||text.includes('contact')) return 'service'; return 'property'; }
export function inquirySearchText(item){ return clean(`${item?.id||''} ${item?.reference||''} ${item?.guestName||''} ${item?.guestEmail||''} ${item?.guestMobile||''} ${item?.guestCountry||''} ${item?.serviceType||''} ${item?.itemName||''} ${item?.message||''} ${item?.status||''}`); }
export function statusClass(status){ const s=normalizeStatus(status); if(s.includes('booked')||s.includes('confirmed')) return 'booked'; if(s.includes('cancel')) return 'cancelled'; if(s.includes('closed')) return 'closed'; if(s.includes('quote')) return 'quoted'; if(s.includes('contact')) return 'contacted'; return 'new'; }
export function getItemName(item){ return item?.itemName || String(item?.serviceType||'').replace('Villa Inquiry - ','').replace('Apartment Inquiry - ','').replace('Homestay Inquiry - ','').replace('Tour Inquiry - ','').trim() || '-'; }
export function telClean(value){ return String(value || '').replace(/\D/g,''); }
export function latest(items,count=20){ return [...safeArray(items)].sort((a,b)=>String(b.createdAt||b.created_at||'').localeCompare(String(a.createdAt||a.created_at||''))).slice(0,count); }
export function countBy(items, predicate){ return safeArray(items).filter(predicate).length; }
