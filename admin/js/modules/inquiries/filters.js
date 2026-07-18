import { classifyInquiry, inquirySearchText, normalizeStatus, safeArray } from './helpers.js';

export const state={ items:[], filtered:[], selectedId:null, search:'', status:'all', type:'all' };

export function setItems(items){ state.items=safeArray(items); applyFilters(); }
export function applyFilters(){
  const s=state.search.trim().toLowerCase();
  state.filtered=state.items.filter(item=>{
    const statusOk=state.status==='all' || normalizeStatus(item.status)===state.status;
    const typeOk=state.type==='all' || classifyInquiry(item)===state.type;
    const searchOk=!s || inquirySearchText(item).includes(s);
    return statusOk && typeOk && searchOk;
  });
  return state.filtered;
}
export function bindFilterEvents(onChange){
  document.getElementById('ceyInquirySearch')?.addEventListener('input',e=>{ state.search=e.target.value||''; applyFilters(); onChange?.(); });
  document.getElementById('ceyInquiryStatus')?.addEventListener('change',e=>{ state.status=e.target.value||'all'; applyFilters(); onChange?.(); });
  document.getElementById('ceyInquiryType')?.addEventListener('change',e=>{ state.type=e.target.value||'all'; applyFilters(); onChange?.(); });
}
