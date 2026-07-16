import { loadInquiries } from './api.js';
import { state, setItems, bindFilterEvents, applyFilters } from './filters.js';
import { renderList, renderStats } from './list.js';
import { openDetails } from './details.js';
import { escapeHtml } from './helpers.js';

let initialized=false;

function ensureRoot(){
  const tab=document.getElementById('inquiriesTab');
  if(!tab) return null;
  let root=document.getElementById('ceyInquiryCRM');
  if(root) return root;
  root=document.createElement('div');
  root.id='ceyInquiryCRM';
  root.className='cey-inquiry-crm';
  root.innerHTML=`
    <div class="inq-head"><div><h2>Inquiry CRM</h2><p>Manage inquiries, follow-up, notes and booking conversion.</p></div><button id="ceyRefreshInquiries" type="button">Refresh</button></div>
    <div class="inq-filterbar"><input id="ceyInquirySearch" placeholder="Search reference, guest, email, phone, item..."><select id="ceyInquiryType"><option value="all">All Types</option><option value="property">Property</option><option value="tour">Tour</option><option value="service">Service</option></select><select id="ceyInquiryStatus"><option value="all">All Status</option><option value="new">New</option><option value="contacted">Contacted</option><option value="quoted">Quoted</option><option value="booked">Booked</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option></select></div>
    <div id="ceyInquiryStats" class="inq-stats"></div>
    <div id="ceyInquiryList"></div>`;
  tab.prepend(root);
  return root;
}

function render(){
  renderStats(document.getElementById('ceyInquiryStats'),state.items);
  renderList(document.getElementById('ceyInquiryList'),state.filtered,(id)=>{
    const item=state.items.find(x=>String(x.id)===String(id));
    if(item) openDetails(item,refresh);
  });
}

export async function refresh(){
  const root=ensureRoot();
  if(!root) return;
  const list=document.getElementById('ceyInquiryList');
  if(list) list.innerHTML='<div class="empty-row">Loading inquiries...</div>';
  try{
    const items=await loadInquiries();
    setItems(items);
    render();
  }catch(error){
    if(list) list.innerHTML=`<div class="empty-row">${escapeHtml(error.message)}</div>`;
  }
}

export function initInquiryModule(){
  if(initialized) return;
  initialized=true;
  ensureRoot();
  bindFilterEvents(render);
  document.getElementById('ceyRefreshInquiries')?.addEventListener('click',refresh);
  window.ceyRefreshInquiryCRM=refresh;
  setTimeout(refresh,500);
}
