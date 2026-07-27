(()=>{
'use strict';
const API_BASE='https://ceybreez-contact-api.ceybreez.workers.dev';
const PAGES=[['home','Home','../index.html'],['villas','Villas','../villas.html'],['apartments','Apartments','../apartments.html'],['homestays','Homestays','../homestays.html'],['tours','Tours','../tours.html'],['tour-details','Tour Details','../tour-details.html'],['services','Services','../services.html'],['contact','Contact','../contact.html'],['privacy','Privacy','../privacy.html'],['terms','Terms','../terms.html'],['404','404','../404.html']];
const DEVICES={desktop:1440,tablet:900,mobile:390};
const $=id=>document.getElementById(id);
const state={page:'home',device:'desktop',zoom:null,frameDoc:null,selected:null,section:null,sections:[],records:{},history:[],future:[],dirty:false,token:'',manualZoom:0};

function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function auth(){return{'Content-Type':'application/json','Authorization':`Bearer ${state.token}`,'X-Admin-Token':state.token}}
function showApp(){ $('loginGate').classList.add('hidden'); $('builderApp').classList.remove('hidden') }
function boot(){
 state.token=localStorage.getItem('ceybreezAdminToken')||localStorage.getItem('adminToken')||sessionStorage.getItem('ceybreezAdminToken')||'';
 if(!state.token){$('loginGate').classList.remove('hidden');$('loginForm').onsubmit=e=>{e.preventDefault();state.token=$('tokenInput').value.trim();if(!state.token)return;localStorage.setItem('ceybreezAdminToken',state.token);showApp();init()};return}
 showApp();init();
}
function init(){
 $('pageSelect').innerHTML=PAGES.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('');
 $('pageSelect').onchange=()=>{state.page=$('pageSelect').value;loadPage()};
 document.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>setDevice(b.dataset.device));
 $('refreshBtn').onclick=loadPage;$('openPageBtn').onclick=()=>window.open(pageInfo()[2].replace('../','/'),'_blank');
 $('zoomOut').onclick=()=>{state.manualZoom=Math.max(-.4,state.manualZoom-.05);fitFrame()};$('zoomIn').onclick=()=>{state.manualZoom=Math.min(.5,state.manualZoom+.05);fitFrame()};
 $('saveBtn').onclick=saveCurrent;$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addElement(b.dataset.add));
 ['textValue','linkValue','imageValue','widthMode','widthValue','heightMode','heightValue','paddingValue','marginValue','fontSize','lineHeight','textColor','textAlign','fontWeight','bgColor','borderColor','borderWidth','borderRadius','opacity','shadow','hoverTextColor','hoverBgColor','hoverScale'].forEach(id=>$(id).addEventListener('input',()=>updateFromInspector(id)));
 $('uploadImageBtn').onclick=()=>$('imageFile').click();$('imageFile').onchange=uploadImage;
 $('duplicateBtn').onclick=duplicateSelected;$('deleteBtn').onclick=deleteSelected;$('resetBtn').onclick=resetSelected;
 window.addEventListener('resize',fitFrame);loadPage();
}
function pageInfo(){return PAGES.find(p=>p[0]===state.page)||PAGES[0]}
function setDevice(d){state.device=d;document.querySelectorAll('[data-device]').forEach(b=>b.classList.toggle('active',b.dataset.device===d));state.manualZoom=0;renderAll();fitFrame();fillInspector()}
function loadPage(){
 state.selected=null;state.section=null;state.sections=[];state.records={};$('inspector').classList.add('hidden');$('emptyInspector').classList.remove('hidden');$('editingLabel').textContent=`Loading ${pageInfo()[1]}…`;
 const f=$('previewFrame');f.onload=onFrameLoad;f.src=`${pageInfo()[2]}?pb=${Date.now()}`;
}
async function onFrameLoad(){
 try{
  state.frameDoc=$('previewFrame').contentDocument;
  const d=state.frameDoc;
  d.documentElement.classList.add('pb-live-editor');
  injectEditorCss(d);autoKeySections(d);assignStableUids(d);bindCanvas(d);await loadSaved();discoverSections();renderAll();fitFrame();
  setTimeout(()=>{fitFrame();discoverSections()},600);
  if(d.fonts?.ready)d.fonts.ready.then(fitFrame);
 }catch(e){toast('Unable to open live page');console.error(e)}
}
function injectEditorCss(d){
 const s=d.createElement('style');s.id='pb-live-editor-style';s.textContent=`
 html.pb-live-editor *{cursor:default!important}html.pb-live-editor a{cursor:pointer!important}.pb-editor-selected{outline:3px solid #00a49d!important;outline-offset:2px!important}.pb-editor-section{outline:2px dashed #f2a900!important;outline-offset:-2px!important}.pb-editor-hover{outline:2px solid rgba(0,164,157,.55)!important;outline-offset:1px!important}.pb-editor-added{position:relative}.pb-editor-hidden{display:none!important}`;d.head.appendChild(s);
}
function autoKeySections(d){
 const candidates=[...d.querySelectorAll('header, main > section, body > section, footer')];let n=1;
 candidates.forEach(el=>{if(el.closest('#pb-editor-ui'))return;if(!el.dataset.section)el.dataset.section=`auto-section-${n++}`});
}

function assignStableUids(d){
 [...d.body.querySelectorAll('*')].forEach(el=>{
  if(el.id==='pb-editor-ui'||el.closest('#pb-editor-ui'))return;
  if(!el.dataset.pbUid){
   const path=[];let n=el;
   while(n&&n!==d.body){let idx=1,p=n;while((p=p.previousElementSibling))if(p.tagName===n.tagName)idx++;path.unshift(`${n.tagName.toLowerCase()}:nth-of-type(${idx})`);n=n.parentElement}
   el.dataset.pbUid=path.join('>');
  }
 });
}

function bindCanvas(d){
 d.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();selectElement(e.target);e.stopPropagation()},true);
 d.addEventListener('mouseover',e=>{if(e.target===d.body||e.target===d.documentElement)return;e.target.classList.add('pb-editor-hover')},true);
 d.addEventListener('mouseout',e=>e.target.classList.remove('pb-editor-hover'),true);
}
function discoverSections(){
 const d=state.frameDoc;if(!d)return;state.sections=[...d.querySelectorAll('[data-section]')].map((el,i)=>({key:el.dataset.section,el,name:sectionName(el,i)}));
 const list=$('sectionList');list.innerHTML='';state.sections.forEach(s=>{const b=document.createElement('button');b.className='section-item';b.innerHTML=`${escapeHtml(s.name)}<small>${escapeHtml(s.key)}</small>`;b.onclick=()=>selectSection(s);list.appendChild(b)});$('editingLabel').textContent=`Editing: ${pageInfo()[1]} — Live page`;
}
function sectionName(el,i){const h=el.querySelector('h1,h2,h3');return (h?.textContent||el.getAttribute('aria-label')||el.id||el.classList[0]||`Section ${i+1}`).trim().slice(0,50)}
function selectSection(s){state.section=s;state.frameDoc.querySelectorAll('.pb-editor-section').forEach(x=>x.classList.remove('pb-editor-section'));s.el.classList.add('pb-editor-section');s.el.scrollIntoView({behavior:'smooth',block:'center'});[...$('sectionList').children].forEach((b,i)=>b.classList.toggle('active',state.sections[i]===s));}
function selectElement(el){
 if(!el||['HTML','BODY'].includes(el.tagName))return;state.frameDoc.querySelectorAll('.pb-editor-selected').forEach(x=>x.classList.remove('pb-editor-selected'));el.classList.add('pb-editor-selected');state.selected=el;state.section=state.sections.find(s=>s.el===el.closest('[data-section]'))||state.section;if(state.section)selectSection(state.section);ensureUid(el);$('emptyInspector').classList.add('hidden');$('inspector').classList.remove('hidden');fillInspector();
}
function ensureUid(el){if(!el.dataset.pbUid){const path=[];let n=el;while(n&&n!==n.ownerDocument.body){let idx=1,p=n;while((p=p.previousElementSibling))if(p.tagName===n.tagName)idx++;path.unshift(`${n.tagName.toLowerCase()}:nth-of-type(${idx})`);n=n.parentElement}el.dataset.pbUid=path.join('>')}}
function selectorFor(el){ensureUid(el);return `[data-pb-uid="${CSS.escape(el.dataset.pbUid)}"]`}
function rec(create=true){if(!state.selected)return null;const sel=selectorFor(state.selected);let all=state.records[sel];if(!all&&create)all=state.records[sel]={desktop:{},tablet:{},mobile:{}};return all?.[state.device]||(create?(all[state.device]={}):null)}
function merged(sel){const all=state.records[sel]||{};return state.device==='desktop'?{...(all.desktop||{})}:{...(all.desktop||{}),...(all[state.device]||{})}}
function fillInspector(){
 const el=state.selected;if(!el)return;const cs=state.frameDoc.defaultView.getComputedStyle(el),r=merged(selectorFor(el));$('selectedName').textContent=`${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}`;
 const isImg=el.tagName==='IMG',isLink=el.matches('a,button');$('imageWrap').classList.toggle('hidden',!isImg);$('textWrap').classList.toggle('hidden',isImg);$('linkWrap').classList.toggle('hidden',!isLink);
 if(isImg)$('imageValue').value=el.getAttribute('src')||'';else $('textValue').value=el.textContent.trim();if(isLink)$('linkValue').value=el.getAttribute('href')||'';
 const vals={widthMode:r.widthMode||'auto',widthValue:r.widthValue??'',heightMode:r.heightMode||'auto',heightValue:r.heightValue??'',paddingValue:(r.padding ?? (parseFloat(cs.padding)||0)),marginValue:(r.margin ?? (parseFloat(cs.margin)||0)),fontSize:(r.fontSize ?? (parseFloat(cs.fontSize)||16)),lineHeight:r.lineHeight??(parseFloat(cs.lineHeight)||1.4),textAlign:r.textAlign||cs.textAlign||'',fontWeight:r.fontWeight||cs.fontWeight||'',borderWidth:(r.borderWidth ?? (parseFloat(cs.borderWidth)||0)),borderRadius:(r.borderRadius ?? (parseFloat(cs.borderRadius)||0)),opacity:(r.opacity ?? (parseFloat(cs.opacity)||1)),shadow:r.shadow||'',hoverScale:r.hoverScale??1};
 Object.entries(vals).forEach(([k,v])=>{if($(k))$(k).value=v});$('textColor').value=toHex(r.color||cs.color,'#222222');$('bgColor').value=toHex(r.backgroundColor||cs.backgroundColor,'#ffffff');$('borderColor').value=toHex(r.borderColor||cs.borderColor,'#000000');$('hoverTextColor').value=toHex(r.hoverColor||r.color||cs.color,'#ffffff');$('hoverBgColor').value=toHex(r.hoverBackgroundColor||r.backgroundColor||cs.backgroundColor,'#078e88');
}
function updateFromInspector(id){if(!state.selected)return;pushHistory();const r=rec();const val=$(id).value;const map={widthMode:'widthMode',widthValue:'widthValue',heightMode:'heightMode',heightValue:'heightValue',paddingValue:'padding',marginValue:'margin',fontSize:'fontSize',lineHeight:'lineHeight',textColor:'color',textAlign:'textAlign',fontWeight:'fontWeight',bgColor:'backgroundColor',borderColor:'borderColor',borderWidth:'borderWidth',borderRadius:'borderRadius',opacity:'opacity',shadow:'shadow',hoverTextColor:'hoverColor',hoverBgColor:'hoverBackgroundColor',hoverScale:'hoverScale'};
 if(id==='textValue'){state.selected.textContent=val;r.text=val}else if(id==='linkValue'){state.selected.setAttribute('href',val);r.href=val}else if(id==='imageValue'){state.selected.setAttribute('src',val);r.src=val}else{r[map[id]]=(['widthValue','heightValue','paddingValue','marginValue','fontSize','lineHeight','borderWidth','borderRadius','opacity','hoverScale'].includes(id)?Number(val):val)}applyRecord(state.selected,merged(selectorFor(state.selected)));dirty();fitFrame();}
function applyRecord(el,r){
 if(!el)return;if(r.text!==undefined&&!['IMG','INPUT','TEXTAREA'].includes(el.tagName))el.textContent=r.text;if(r.href!==undefined&&el.matches('a'))el.setAttribute('href',r.href);if(r.src!==undefined&&el.tagName==='IMG')el.setAttribute('src',r.src);
 const s=el.style;s.width=r.widthMode==='full'?'100%':r.widthMode==='percent'?(Number(r.widthValue)||100)+'%':r.widthMode==='px'?(Number(r.widthValue)||0)+'px':'';
 s.height=r.heightMode==='px'?(Number(r.heightValue)||0)+'px':r.heightMode==='screen'?'100vh':'';s.minHeight=r.heightMode==='min'?(Number(r.heightValue)||0)+'px':'';if(r.heightMode==='auto'){s.height='auto';s.minHeight=''}
 s.padding=r.padding!==undefined?`${r.padding}px`:'';s.margin=r.margin!==undefined?`${r.margin}px`:'';s.fontSize=r.fontSize!==undefined?`${r.fontSize}px`:'';s.lineHeight=r.lineHeight!==undefined?String(r.lineHeight):'';s.color=r.color||'';s.textAlign=r.textAlign||'';s.fontWeight=r.fontWeight||'';s.backgroundColor=r.backgroundColor||'';s.borderColor=r.borderColor||'';s.borderStyle=Number(r.borderWidth)>0?'solid':'';s.borderWidth=r.borderWidth!==undefined?`${r.borderWidth}px`:'';s.borderRadius=r.borderRadius!==undefined?`${r.borderRadius}px`:'';s.opacity=r.opacity!==undefined?String(r.opacity):'';s.boxShadow=r.shadow==='soft'?'0 8px 24px rgba(0,0,0,.12)':r.shadow==='medium'?'0 14px 36px rgba(0,0,0,.18)':r.shadow==='strong'?'0 20px 55px rgba(0,0,0,.28)':'';
 if(r.hoverColor||r.hoverBackgroundColor||r.hoverScale){el.dataset.pbHover='1';ensureHoverStyle()}
}
function ensureHoverStyle(){const d=state.frameDoc;let st=d.getElementById('pb-hover-rules');if(!st){st=d.createElement('style');st.id='pb-hover-rules';d.head.appendChild(st)}let css='';Object.entries(state.records).forEach(([sel,all])=>{const r=merged(sel);if(r.hoverColor||r.hoverBackgroundColor||r.hoverScale)css+=`${sel}:hover{${r.hoverColor?`color:${r.hoverColor}!important;`:''}${r.hoverBackgroundColor?`background-color:${r.hoverBackgroundColor}!important;`:''}${r.hoverScale?`transform:scale(${r.hoverScale})!important;`:''}transition:.25s ease!important}`});st.textContent=css}
function renderAll(){if(!state.frameDoc)return;Object.entries(state.records).forEach(([sel])=>{let el;try{el=state.frameDoc.querySelector(sel)}catch{}if(el)applyRecord(el,merged(sel))});ensureHoverStyle();}
function addElement(type){if(type==='section'){const main=state.frameDoc.querySelector('main')||state.frameDoc.body;const sec=state.frameDoc.createElement('section');sec.dataset.section=`custom-section-${Date.now()}`;sec.className='pb-editor-added';sec.innerHTML='<div style="max-width:1200px;margin:auto;padding:60px 24px"><h2>New Section</h2><p>Edit this section in the builder.</p></div>';main.appendChild(sec);assignStableUids(state.frameDoc);discoverSections();selectElement(sec);const r=rec();r.added={type:'section',sectionKey:'__root__',html:sec.outerHTML};dirty();fitFrame();return}
 if(!state.section)return toast('Select a section first');let el;if(type==='heading'){el=state.frameDoc.createElement('h2');el.textContent='New heading'}else if(type==='text'){el=state.frameDoc.createElement('p');el.textContent='New text'}else if(type==='button'){el=state.frameDoc.createElement('a');el.textContent='Button';el.href='#';el.style.display='inline-block';el.style.padding='12px 22px'}else{el=state.frameDoc.createElement('img');el.src='../images/cover.jpg';el.alt='CeyBreez image';el.style.maxWidth='100%;height:auto'}el.classList.add('pb-editor-added');state.section.el.appendChild(el);selectElement(el);const r=rec();r.added={type,sectionKey:state.section.key,html:el.outerHTML};dirty();fitFrame();}
function duplicateSelected(){if(!state.selected)return;const c=state.selected.cloneNode(true);delete c.dataset.pbUid;state.selected.after(c);selectElement(c);dirty();fitFrame()}
function deleteSelected(){if(!state.selected)return;pushHistory();const sel=selectorFor(state.selected);state.records[sel]={desktop:{deleted:true},tablet:{},mobile:{}};state.selected.remove();state.selected=null;$('inspector').classList.add('hidden');$('emptyInspector').classList.remove('hidden');dirty();fitFrame()}
function resetSelected(){if(!state.selected)return;pushHistory();delete state.records[selectorFor(state.selected)];state.selected.removeAttribute('style');renderAll();fillInspector();dirty();fitFrame()}
function pushHistory(){state.history.push(JSON.stringify(state.records));if(state.history.length>50)state.history.shift();state.future=[]}
function undo(){if(!state.history.length)return;state.future.push(JSON.stringify(state.records));state.records=JSON.parse(state.history.pop());renderAll();dirty()}
function redo(){if(!state.future.length)return;state.history.push(JSON.stringify(state.records));state.records=JSON.parse(state.future.pop());renderAll();dirty()}
function dirty(){state.dirty=true;$('saveStatus').textContent='Unsaved'}
async function loadSaved(){try{const r=await fetch(`${API_BASE}/api/admin/page-sections?page=${encodeURIComponent(state.page)}`,{headers:auth()});const data=await r.json();const arr=Array.isArray(data)?data:(data.sections||[]);arr.forEach(s=>{let settings={};try{settings=typeof s.settings==='string'?JSON.parse(s.settings):s.settings||{}}catch{};if(settings.liveBuilderRecords)Object.assign(state.records,settings.liveBuilderRecords)});}catch(e){console.warn(e)}}
async function saveCurrent(){if(!state.section)return toast('Select a section first');$('saveStatus').textContent='Saving…';const data={page:state.page,sectionKey:state.section.key,title:'',subtitle:'',content:'',buttonText:'',buttonUrl:'',mediaUrl:'',backgroundImage:'',backgroundColor:'',textColor:'',headingColor:'',buttonColor:'',fontFamily:'',fontSize:'',settings:JSON.stringify({liveBuilderRecords:state.records,liveBuilderVersion:'16.2'})};try{const r=await fetch(`${API_BASE}/api/admin/page-sections`,{method:'POST',headers:auth(),body:JSON.stringify(data)});const out=await r.json();if(!r.ok)throw new Error(out.error||'Save failed');state.dirty=false;$('saveStatus').textContent='Saved';toast('Changes saved')}catch(e){$('saveStatus').textContent='Save failed';toast(e.message)}}
async function uploadImage(){const file=$('imageFile').files[0];if(!file)return;const fd=new FormData();fd.append('file',file);fd.append('folder','page-builder');try{const r=await fetch(`${API_BASE}/api/admin/upload-image`,{method:'POST',headers:{'Authorization':`Bearer ${state.token}`,'X-Admin-Token':state.token},body:fd});const data=await r.json();if(!r.ok)throw new Error(data.error||'Upload failed');$('imageValue').value=data.url;updateFromInspector('imageValue')}catch(e){toast(e.message)}}
function fitFrame(){const f=$('previewFrame'),shell=$('frameShell'),scroller=$('canvasScroller');if(!state.frameDoc||!scroller.clientWidth)return;const baseW=DEVICES[state.device];const available=Math.max(260,scroller.clientWidth-36);const autoScale=Math.min(1,available/baseW);const scale=Math.max(.35,Math.min(1.5,autoScale+state.manualZoom));const docH=Math.max(state.frameDoc.documentElement.scrollHeight,state.frameDoc.body?.scrollHeight||0,state.device==='mobile'?844:900);f.style.width=`${baseW}px`;f.style.height=`${docH}px`;f.style.transform=`scale(${scale})`;f.style.transformOrigin='top left';shell.style.width=`${baseW*scale}px`;shell.style.height=`${docH*scale}px`;shell.style.overflow='hidden';$('zoomLabel').textContent=`${Math.round(scale*100)}% Auto`;}
function toHex(v,f){if(!v||v==='transparent'||v.includes('rgba(0, 0, 0, 0)'))return f;if(v.startsWith('#'))return v.slice(0,7);const m=v.match(/\d+/g);return m?'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):f}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
boot();
})();
