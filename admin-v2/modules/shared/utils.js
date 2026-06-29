export function escapeHtml(value){ return String(value || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
export function normalizeStatus(status){ return String(status || "New").toLowerCase(); }
export function formatDate(value){ if(!value) return "-"; const d=new Date(value); return isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
