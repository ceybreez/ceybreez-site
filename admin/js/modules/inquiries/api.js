import { apiGet, apiPost } from '../../core/api.js';

export async function loadInquiries(){ const data=await apiGet('/api/admin/inquiries'); return Array.isArray(data) ? data : []; }
export async function loadNotes(inquiryId){ const data=await apiGet(`/api/admin/inquiries/${inquiryId}/notes`); return Array.isArray(data) ? data : []; }
export async function saveNote(inquiryId,note){ return apiPost(`/api/admin/inquiries/${inquiryId}/notes`,{note}); }
export async function updateStatus(inquiryId,status,sendEmail=false,adminMessage=''){
  const res=await fetch(`${window.CEYBREEZ_API_BASE || 'https://ceybreez-contact-api.ceybreez.workers.dev'}/api/admin/inquiries/${inquiryId}/status`,{
    method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('CEYBREEZ_ADMIN_TOKEN')||''}`}, body:JSON.stringify({status,sendEmail,adminMessage})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || 'Status update failed');
  return data;
}
