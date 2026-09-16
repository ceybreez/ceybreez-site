import { updateStatus } from './api.js';

export function bindStatusAction(item,onUpdated){
  const btn=document.getElementById('ceyUpdateInquiryStatus');
  const select=document.getElementById('ceyInquiryDetailStatus');
  const send=document.getElementById('ceyInquirySendEmail');
  if(!btn||!select) return;
  btn.onclick=async()=>{
    await updateStatus(item.id,select.value,!!send?.checked);
    alert('Inquiry status updated.');
    onUpdated?.();
  };
}
