import { escapeHtml, formatDate } from './helpers.js';

export function renderTimeline(item,notes=[]){
  const events=[];
  events.push({title:'Inquiry received',date:item.createdAt||item.created_at,body:item.message||''});
  if(item.status) events.push({title:`Status: ${item.status}`,date:item.updatedAt||item.updated_at||item.createdAt||item.created_at,body:''});
  notes.forEach(n=>events.push({title:'Admin note',date:n.createdAt||n.created_at,body:n.note||''}));
  return `<div class="inq-timeline">${events.map(e=>`<div class="inq-time-item"><span></span><div><strong>${escapeHtml(e.title)}</strong><small>${formatDate(e.date)}</small>${e.body?`<p>${escapeHtml(e.body)}</p>`:''}</div></div>`).join('')}</div>`;
}
