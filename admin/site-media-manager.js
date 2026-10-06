(() => {
  'use strict';
  const API_BASE='https://ceybreez-contact-api.ceybreez.workers.dev';
  const TOKEN_KEY='CEYBREEZ_SESSION_TOKEN';
  const VALIDATED_KEY='CEYBREEZ_SESSION_VALIDATED';
  const CONTENT_KEY='site_media_overrides_v1';
  const DRAFT_KEY='CEYBREEZ_SITE_MEDIA_DRAFT_V1';
  const pages=['tours','villas','apartments','homestays','services'];
  const $=(s,r=document)=>r.querySelector(s);
  const clean=v=>String(v??'').trim();
  let manifest={};
  let liveData={};
  let draft={};
  let page='tours';
  let replaceSlot='';
  let revision=0,previewed=-1;

  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  function status(msg,tone=''){const e=$('#smStatus');e.textContent=msg;e.dataset.tone=tone}
  function clone(v){return JSON.parse(JSON.stringify(v||{}))}
  function pageData(){if(!draft[page]) draft[page]={slots:{},gallery:[]};if(!draft[page].slots)draft[page].slots={};if(!Array.isArray(draft[page].gallery))draft[page].gallery=[];return draft[page]}
  function saveLocal(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify({draft,savedAt:new Date().toISOString()}))}catch(_){}}
  function markDirty(msg='Draft changed. Preview before publishing.'){revision++;previewed=-1;saveLocal();updatePublish();status(msg)}
  function updatePublish(){$('#smPublish').disabled=previewed!==revision}
  async function api(path,opt={}){const isFD=opt.body instanceof FormData;const h={Authorization:`Bearer ${token()}`,...(opt.headers||{})};if(!isFD)h['Content-Type']='application/json';const r=await fetch(API_BASE+path,{...opt,headers:h,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||d.message||`Request failed (${r.status})`);e.status=r.status;throw e}return d}
  async function validate(){if(!token()){location.replace('index.html');return false}try{await api('/api/admin/auth/me');sessionStorage.setItem(VALIDATED_KEY,'1');return true}catch(e){sessionStorage.removeItem(VALIDATED_KEY);if(e.status===401)location.replace('index.html');else status(`Session check failed: ${e.message}`,'error');return false}}
  async function loadManifest(){manifest=await fetch('site-media-manifest.json',{cache:'no-store'}).then(r=>r.json())}
  async function load(){status('Loading media settings…');const all=await api('/api/admin/site-content');try{liveData=JSON.parse(all[CONTENT_KEY]||'{}')||{}}catch(_){liveData={}}draft=clone(liveData);try{const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(saved?.draft){draft=saved.draft;status('Recovered your unpublished media draft.')}}catch(_){}pages.forEach(p=>{if(!draft[p])draft[p]={slots:{},gallery:[]}});render();updatePublish();if($('#smStatus').textContent==='Loading media settings…')status('Loaded. Current website remains unchanged until you publish.')}
  function currentSrc(slot){const override=pageData().slots[slot.slot];return clean(override?.src)||slot.src}
  function render(){
    const slots=$('#smSlots');slots.innerHTML='';(manifest[page]||[]).forEach(slot=>{const card=document.createElement('article');card.className='sm-card';card.innerHTML=`<img src="${currentSrc(slot)}" alt=""><div class="sm-card-body"><div class="sm-card-title">${slot.label}</div><div class="sm-actions"><button type="button" data-replace="${slot.slot}">Replace</button><button type="button" data-restore="${slot.slot}">Restore original</button></div></div>`;slots.appendChild(card)});
    slots.querySelectorAll('[data-replace]').forEach(b=>b.onclick=()=>{replaceSlot=b.dataset.replace;$('#smReplaceFile').click()});
    slots.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>{delete pageData().slots[b.dataset.restore];markDirty('Original photo restored in draft.');render()});
    const g=$('#smGallery');g.innerHTML='';pageData().gallery.forEach((item,i)=>{const row=document.createElement('div');row.className='sm-gallery-item';row.innerHTML=`<img src="${clean(item.src)}" alt=""><input value="${clean(item.title).replace(/"/g,'&quot;')}" placeholder="Photo title"><div class="sm-mini"><button type="button" data-up="${i}">↑</button><button type="button" data-down="${i}">↓</button><button type="button" data-remove="${i}">×</button></div>`;row.querySelector('input').onchange=e=>{pageData().gallery[i].title=clean(e.target.value);markDirty('Gallery title changed.')};g.appendChild(row)});
    g.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>move(+b.dataset.up,-1));g.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>move(+b.dataset.down,1));g.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{pageData().gallery.splice(+b.dataset.remove,1);markDirty('Photo removed from draft gallery.');render()});
  }
  function move(i,d){const j=i+d,a=pageData().gallery;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];markDirty('Gallery order changed.');render()}
  async function upload(file,folder){const fd=new FormData();fd.append('file',file);fd.append('folder',folder);const d=await api('/api/admin/upload-image',{method:'POST',body:fd});if(!d.url)throw new Error('Upload returned no URL');return d.url}
  async function replaceFile(file){if(!replaceSlot||!file)return;status('Uploading replacement…');try{const url=await upload(file,`site-media/${page}`);pageData().slots[replaceSlot]={src:url};markDirty('Photo replaced in draft.');render()}catch(e){status(`Upload failed: ${e.message}`,'error')}finally{replaceSlot='';$('#smReplaceFile').value=''}}
  async function addGallery(files){const list=[...files].filter(f=>f.type.startsWith('image/'));if(!list.length)return;if(pageData().gallery.length+list.length>60){alert('Maximum 60 extra gallery photos per page.');return}status(`Uploading ${list.length} photo(s)…`);try{for(const f of list){const url=await upload(f,`site-media/${page}/gallery`);pageData().gallery.push({src:url,title:f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')})}markDirty(`${list.length} photo(s) added to draft gallery.`);render()}catch(e){status(`Upload failed: ${e.message}`,'error')}finally{$('#smGalleryFiles').value=''}}
  function preview(){const dialog=$('#smPreviewDialog'),frame=$('#smPreviewFrame');previewed=revision;updatePublish();frame.onload=()=>{try{frame.contentWindow.postMessage({type:'CB_MEDIA_PREVIEW',page,data:pageData()},location.origin)}catch(_){}};frame.src=`../${page}.html?cb_media_preview=${Date.now()}`;dialog.showModal();status('Private draft preview opened. Publish is unlocked until the draft changes again.')}
  async function publish(){if(previewed!==revision){preview();return}if(!confirm(`Publish photo changes for ${page}? Existing originals remain available as fallback.`))return;status('Publishing media overrides…');$('#smPublish').disabled=true;try{await api('/api/admin/site-content',{method:'PUT',body:JSON.stringify({[CONTENT_KEY]:JSON.stringify(draft)})});liveData=clone(draft);localStorage.removeItem(DRAFT_KEY);status('Published. Only the selected photo overrides / extra gallery changed.');}catch(e){status(`Publish failed: ${e.message}`,'error')}finally{updatePublish()}}
  function discard(){if(!confirm('Discard all unpublished media changes and reload live settings?'))return;draft=clone(liveData);revision++;previewed=-1;localStorage.removeItem(DRAFT_KEY);render();updatePublish();status('Draft discarded. Live website was not changed.')}
  async function boot(){if(!await validate())return;await loadManifest();await load()}
  $('#smPage').onchange=e=>{page=e.target.value;render();status(`Editing ${page}. No live changes until publish.`)};
  $('#smReplaceFile').onchange=e=>replaceFile(e.target.files?.[0]);
  $('#smAddGallery').onclick=()=>$('#smGalleryFiles').click();
  $('#smGalleryFiles').onchange=e=>addGallery(e.target.files||[]);
  $('#smSaveDraft').onclick=()=>{saveLocal();status('Draft saved locally. Live website is unchanged.')};
  $('#smPreview').onclick=preview;
  $('#smClosePreview').onclick=()=>$('#smPreviewDialog').close();
  $('#smPublish').onclick=publish;
  $('#smDiscard').onclick=discard;
  boot().catch(e=>status(`Could not start Media Manager: ${e.message}`,'error'));
})();
