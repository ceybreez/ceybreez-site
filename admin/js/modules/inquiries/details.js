import { escapeHtml, formatDate, getItemName, statusClass, telClean } from './helpers.js';
import { renderTimeline } from './timeline.js';
import { renderNotes, bindNoteForm } from './notes.js';
import { bindStatusAction } from './status.js';
import { bindConvertAction } from './convert.js';

function ensureDrawer(){
  let drawer=document.getElementById('ceyInquiryDrawer');
  if(drawer) return drawer;
  drawer=document.createElement('div');
  drawer.id='ceyInquiryDrawer';
  drawer.className='inq-drawer hidden';
  document.body.appendChild(drawer);
  return drawer;
}

export async function openDetails(item,onRefresh){
  const drawer=ensureDrawer();
  drawer.innerHTML=`<div class="inq-drawer-card"><div class="inq-drawer-head"><div><h2>${escapeHtml(item.reference||'Inquiry')}</h2><p>${escapeHtml(item.serviceType||'-')}</p></div><button id="ceyCloseInquiryDrawer">×</button></div>
  <div class="inq-drawer-body">
    <div class="inq-detail-grid">
      <section><h3>Guest</h3><p><b>Name:</b> ${escapeHtml(item.guestName||'-')}</p><p><b>Email:</b> ${escapeHtml(item.guestEmail||'-')}</p><p><b>Mobile:</b> ${escapeHtml(item.guestMobile||'-')}</p><p><b>Country:</b> ${escapeHtml(item.guestCountry||'-')}</p></section>
      <section><h3>Inquiry</h3><p><b>Item:</b> ${escapeHtml(getItemName(item))}</p><p><b>Dates:</b> ${escapeHtml(item.dateFrom||'-')} → ${escapeHtml(item.dateTo||'-')}</p><p><b>Guests:</b> ${escapeHtml(item.guests||'-')}</p><p><b>Created:</b> ${formatDate(item.createdAt||item.created_at)}</p><p><b>Status:</b> <span class="inq-badge ${statusClass(item.status)}">${escapeHtml(item.status||'New')}</span></p></section>
    </div>
    <section class="inq-message"><h3>Message</h3><p>${escapeHtml(item.message||'No message')}</p></section>
    <section class="inq-actions"><button id="ceyWhatsAppGuest">WhatsApp</button><button id="ceyEmailGuest">Email</button><button id="ceyCopyInquiry">Copy</button><button id="ceyConvertInquiryBooking">Convert to Booking</button></section>
    <section class="inq-status-panel"><h3>Status</h3><select id="ceyInquiryDetailStatus"><option>New</option><option>Contacted</option><option>Quoted</option><option>Booked</option><option>Closed</option><option>Cancelled</option></select><label><input type="checkbox" id="ceyInquirySendEmail" checked> Send email</label><button id="ceyUpdateInquiryStatus">Update</button></section>
    <section><h3>Timeline</h3><div id="ceyInquiryTimeline"></div></section>
    <section><h3>Internal Notes</h3><textarea id="ceyInquiryNoteText" placeholder="Add internal note..."></textarea><button id="ceySaveInquiryNote">Save Note</button><div id="ceyInquiryNotes"></div></section>
  </div></div>`;
  drawer.classList.remove('hidden');
  document.getElementById('ceyCloseInquiryDrawer').onclick=()=>drawer.classList.add('hidden');
  document.getElementById('ceyInquiryDetailStatus').value=item.status||'New';
  document.getElementById('ceyWhatsAppGuest').onclick=()=>{ const n=telClean(item.guestMobile); if(n) window.open(`https://wa.me/${n}`,'_blank'); else alert('No mobile number.'); };
  document.getElementById('ceyEmailGuest').onclick=()=>{ if(item.guestEmail) location.href=`mailto:${item.guestEmail}`; else alert('No email.'); };
  document.getElementById('ceyCopyInquiry').onclick=()=>{ navigator.clipboard.writeText(JSON.stringify(item,null,2)); alert('Copied.'); };
  let notes=[];
  notes=await renderNotes(item.id,document.getElementById('ceyInquiryNotes'));
  document.getElementById('ceyInquiryTimeline').innerHTML=renderTimeline(item,notes);
  bindNoteForm(item.id,async()=>{ const ns=await renderNotes(item.id,document.getElementById('ceyInquiryNotes')); document.getElementById('ceyInquiryTimeline').innerHTML=renderTimeline(item,ns); });
  bindStatusAction(item,onRefresh);
  bindConvertAction(item);
}
