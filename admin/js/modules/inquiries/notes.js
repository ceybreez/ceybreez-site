import { loadNotes, saveNote } from './api.js';
import { escapeHtml, formatDate } from './helpers.js';

export async function renderNotes(inquiryId,box){
  if(!box) return [];
  const notes=await loadNotes(inquiryId).catch(()=>[]);
  box.innerHTML=notes.length?notes.map(n=>`<div class="inq-note"><strong>${formatDate(n.createdAt||n.created_at)}</strong><p>${escapeHtml(n.note||'')}</p></div>`).join(''):'<p class="empty-row">No notes yet.</p>';
  return notes;
}
export function bindNoteForm(inquiryId,onSaved){
  const btn=document.getElementById('ceySaveInquiryNote');
  const text=document.getElementById('ceyInquiryNoteText');
  if(!btn||!text) return;
  btn.onclick=async()=>{
    const note=text.value.trim();
    if(!note) return alert('Type a note first.');
    await saveNote(inquiryId,note);
    text.value='';
    onSaved?.();
  };
}
