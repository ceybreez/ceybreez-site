/* =========================
   CMS TABLE HELPERS
========================= */
function toggleCmsForm(id){ const box=document.getElementById(id); if(!box) return; box.classList.toggle('hidden'); }
function showCmsForm(id){
  const titleMap = {
    destinationFormBox: "Tour Location Details",
    propertyFormBox: "Property Details",
    serviceFormBox: "Cafe / Service Details"
  };

  if(["destinationFormBox","propertyFormBox","serviceFormBox"].includes(id)){
    v6OpenCmsModal(id, titleMap[id] || "Edit Details");
    return;
  }

  document.getElementById(id)?.classList.remove("hidden");
  setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}),80);
}
function sortCmsTable(type,key){ if(!cmsSort[type]) cmsSort[type]={key,dir:1}; if(cmsSort[type].key===key) cmsSort[type].dir*=-1; else cmsSort[type]={key,dir:1}; if(type==="destinations") renderDestinationsTable(); if(type==="properties") renderPropertiesTable(); if(type==="services") renderServicesTable(); }
function sortByCms(type,data){ const s=cmsSort[type]||{key:"name",dir:1}; return [...data].sort((a,b)=>String(a[s.key]||"").localeCompare(String(b[s.key]||""))*s.dir); }
function statusFilterMatch(item,filter){ if(filter==="active") return !!item.active; if(filter==="hidden") return !item.active; if(filter==="featured") return !!item.featured; return true; }
function setFilterOptions(selectId,values,label){ const box=document.getElementById(selectId); if(!box) return; const current=box.value||"all"; const unique=[...new Set(values.filter(Boolean).map(x=>String(x).trim()))].sort(); box.innerHTML=`<option value="all">${label}</option>`+unique.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join(""); if([...box.options].some(o=>o.value===current)) box.value=current; }
function cmsStatusBadge(active){ return active ? `<span class="status-badge status-booked">Active</span>` : `<span class="status-badge status-cancelled">Hidden</span>`; }
function cmsFeaturedBadge(featured){ return featured ? `<span class="status-badge status-quoted">Featured</span>` : `<span class="status-badge">No</span>`; }
async function uploadSingleFile(file,targetInputId,folder){ if(!file) return alert("Please select a file first."); const target=document.getElementById(targetInputId); if(target) target.value="Uploading..."; const formData=new FormData(); formData.append("file",file); formData.append("folder",folder||"uploads"); try{ const res=await fetch(`${API_BASE}/api/admin/upload-image`,{method:"POST",headers:uploadHeaders(),body:formData}); const result=await res.json(); if(!res.ok) throw new Error(result.error||"Upload failed"); if(target) target.value=result.url; alert("Upload completed"); }catch(err){ if(target) target.value=""; alert(err.message); } }
function uploadSingleFileFromInput(inputId,targetInputId,folder){ const input=document.getElementById(inputId); if(!input||!input.files.length) return; uploadSingleFile(input.files[0],targetInputId,folder); input.value=""; }
function handleSingleUploadDrop(event,targetInputId,folder){ event.preventDefault(); event.currentTarget.classList.remove("drag-active"); uploadSingleFile(event.dataTransfer.files[0],targetInputId,folder); }

