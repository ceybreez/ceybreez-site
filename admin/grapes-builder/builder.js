(() => {
'use strict';
const $=id=>document.getElementById(id), frame=$('liveFrame'), pageSelect=$('pageSelect'), status=$('status');
const API_BASE='https://ceybreez-contact-api.ceybreez.workers.dev', PREFIX='CEYBREEZ_LIVE_BUILDER_STABLE_V1:';
let selected=null,pageKey='home',history=[],redoStack=[],uploadTarget='image',selectionOverlay=null,resizeState=null,currentDevice='desktop';
const pageConfig=v=>v==='welcome'?{file:'index.html',mode:'welcome',label:'Welcome Screen'}:v==='home'?{file:'index.html',mode:'home',label:'Home Page'}:{file:v,mode:'full',label:pageSelect.options[pageSelect.selectedIndex].text};
function setStatus(t,e=false){status.textContent=t;status.classList.toggle('error',e)}
function adminToken(){return localStorage.getItem('CEYBREEZ_ADMIN_TOKEN')||''}
function authHeaders(){return {'Content-Type':'application/json',Authorization:`Bearer ${adminToken()}`}}
function parseSettings(v){try{return typeof v==='string'?JSON.parse(v||'{}'):(v||{})}catch{return {}}}
function relativeSelector(el,section){
 if(el===section)return ':scope';
 if(el.id)return '#'+CSS.escape(el.id);
 const parts=[];let node=el;
 while(node&&node!==section){
  let p=node.tagName.toLowerCase();
  const cls=[...node.classList].filter(c=>!c.startsWith('cb-')&&c!=='entered').slice(0,2);
  if(cls.length)p+='.'+cls.map(c=>CSS.escape(c)).join('.');
  const parent=node.parentElement;
  if(parent){const same=[...parent.children].filter(x=>x.tagName===node.tagName);if(same.length>1)p+=`:nth-of-type(${same.indexOf(node)+1})`;}
  parts.unshift(p);node=parent;
 }
 return parts.join(' > ');
}
function pxNumber(v){const n=parseFloat(v);return Number.isFinite(n)?n:''}
function styleRecord(el,device,entry){
 const inline=el.style, attrs=entry?.attrs||{};
 const rec={};
 if(entry?.html!==undefined && ['H1','H2','H3','H4','H5','H6','P','A','BUTTON','SPAN','LI','LABEL'].includes(el.tagName)) rec.text=el.textContent;
 if(attrs.href!==undefined||el.hasAttribute('href'))rec.href=el.getAttribute('href')||'';
 if(attrs.src!==undefined||el.matches('img,video,source'))rec.src=el.getAttribute('src')||'';
 const map={fontSize:'font-size',width:'width',height:'height',marginTop:'margin-top',marginRight:'margin-right',marginBottom:'margin-bottom',marginLeft:'margin-left',paddingTop:'padding-top',paddingRight:'padding-right',paddingBottom:'padding-bottom',paddingLeft:'padding-left',borderRadius:'border-radius'};
 for(const [k,p] of Object.entries(map)){const v=inline.getPropertyValue(p);if(v)rec[k]=pxNumber(v)}
 const direct={color:'color',backgroundColor:'background-color',fontWeight:'font-weight',textAlign:'text-align',opacity:'opacity'};
 for(const [k,p] of Object.entries(direct)){const v=inline.getPropertyValue(p);if(v)rec[k]=v}
 if(inline.getPropertyValue('display')==='none')rec.hidden=true;
 const devObj=entry?.deviceStyles?.[device]||{};
 for(const [p,v] of Object.entries(devObj)){
  const key=Object.keys(map).find(k=>map[k]===p)||Object.keys(direct).find(k=>direct[k]===p);
  if(key)rec[key]=map[key]?pxNumber(v):v;
  if(p==='display')rec.hidden=v==='none';
 }
 return rec;
}
async function publishLive(){
 if(selected)recordChange(selected);
 const token=adminToken();if(!token){setStatus('Admin token not found. Log in to Admin first.',true);return}
 const d=frame.contentDocument,draft=getDraft();
 const grouped={};
 for(const entry of Object.values(draft)){
  let el=null;try{el=d.querySelector(`[data-cb-edit-id="${CSS.escape(entry.editId||'')}"]`)||d.querySelector(entry.path||'')}catch{}
  if(!el)continue;
  const section=el.closest('[data-section]');if(!section)continue;
  const key=section.dataset.section;if(!key)continue;
  grouped[key] ||= {};
  const sel=relativeSelector(el,section);
  grouped[key][sel]={desktop:styleRecord(el,'desktop',entry),tablet:styleRecord(el,'tablet',entry),mobile:styleRecord(el,'mobile',entry)};
 }
 const keys=Object.keys(grouped);if(!keys.length){setStatus('No publishable changes found. Select an element inside a page section first.',true);return}
 setStatus(`Publishing ${keys.length} section(s)…`);
 try{
  const currentRes=await fetch(`${API_BASE}/api/admin/page-sections?page=${encodeURIComponent(pageKey==='welcome'?'home':pageKey)}`,{headers:{Authorization:`Bearer ${token}`}});
  const current= currentRes.ok ? await currentRes.json() : [];
  const byKey=new Map((Array.isArray(current)?current:[]).map(x=>[x.sectionKey,x]));
  for(const key of keys){
   const server=byKey.get(key)||{};const section=d.querySelector(`[data-section="${CSS.escape(key)}"]`);const settings=parseSettings(server.settings);
   settings.elementStyles=Object.assign({},settings.elementStyles||{},grouped[key]);
   const payload={
    id:server.id||'',page:pageKey==='welcome'?'home':pageKey,sectionKey:key,sectionType:server.sectionType||'visual',
    title:server.title||section?.querySelector('[data-field="title"],h1,h2')?.textContent?.trim()||key,
    subtitle:server.subtitle||section?.querySelector('[data-field="subtitle"]')?.textContent?.trim()||'',
    content:server.content||section?.querySelector('[data-field="content"],p')?.textContent?.trim()||'',
    mediaUrl:server.mediaUrl||section?.querySelector('[data-field="image"],img')?.getAttribute('src')||'',
    backgroundType:server.backgroundType||'color',backgroundColor:server.backgroundColor||'',backgroundImage:server.backgroundImage||'',
    textColor:server.textColor||'',buttonColor:server.buttonColor||'',fontFamily:server.fontFamily||'',sortOrder:server.sortOrder||0,
    active:server.active===undefined?true:!!server.active,settings
   };
   const r=await fetch(`${API_BASE}/api/admin/page-sections`,{method:'POST',headers:authHeaders(),body:JSON.stringify(payload)});
   const out=await r.json().catch(()=>({}));if(!r.ok)throw Error(out.error||`Failed to publish ${key}`);
  }
  setStatus('Published successfully. Open the live website and hard refresh to check Desktop and Mobile.');
 }catch(err){setStatus('Publish failed: '+err.message,true)}
}

function structuralPath(el){
 if(!el)return'';
 const parts=[];
 while(el&&el.nodeType===1&&el!==el.ownerDocument.body){
  let p=el.tagName.toLowerCase();
  const parent=el.parentElement;
  if(parent){const sib=[...parent.children].filter(x=>x.tagName===el.tagName);if(sib.length>1)p+=`:nth-of-type(${sib.indexOf(el)+1})`;}
  parts.unshift(p);el=parent;
 }
 return parts.join(' > ');
}
function ensureEditId(el){
 if(!el)return'';
 let id=el.getAttribute('data-cb-edit-id');
 if(!id){id='cb-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);el.setAttribute('data-cb-edit-id',id)}
 return id;
}
function selectorFor(el){if(!el)return'';const eid=el.getAttribute?.('data-cb-edit-id');if(eid)return `[data-cb-edit-id="${CSS.escape(eid)}"]`;if(el.id)return '#'+CSS.escape(el.id);return structuralPath(el)}

function responsiveCss(){return `
html,body{max-width:100%;overflow-x:hidden!important}*,*::before,*::after{box-sizing:border-box}img,video,svg,canvas,iframe{max-width:100%!important}img,video{height:auto}section,main,header,footer,div{min-width:0}

/* Builder device classes are used as the source of truth. This avoids relying on the host browser width. */
body.cb-builder-tablet [data-cb-responsive="grid"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
body.cb-builder-tablet [data-cb-responsive="flex"]{flex-wrap:wrap!important}
body.cb-builder-tablet .things-grid,body.cb-builder-tablet .featured-grid,body.cb-builder-tablet .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
body.cb-builder-tablet h1{font-size:clamp(2rem,7vw,4.2rem)!important}
body.cb-builder-tablet h2{font-size:clamp(1.7rem,5vw,3rem)!important}

body.cb-builder-mobile{overflow-x:hidden!important}
body.cb-builder-mobile [data-cb-responsive="grid"],
body.cb-builder-mobile [data-cb-responsive="flex"],
body.cb-builder-mobile [data-cb-responsive="row"]{
  display:flex!important;flex-direction:column!important;align-items:stretch!important;
  grid-template-columns:minmax(0,1fr)!important;gap:18px!important;width:100%!important;max-width:100%!important;
}
body.cb-builder-mobile [data-cb-responsive-item="1"]{
  width:100%!important;max-width:100%!important;min-width:0!important;flex:0 0 auto!important;
  margin-left:auto!important;margin-right:auto!important;left:auto!important;right:auto!important;
}
body.cb-builder-mobile [data-cb-responsive-item="1"] img,
body.cb-builder-mobile img[data-cb-responsive-item="1"]{width:100%!important;max-width:100%!important;height:auto!important;object-fit:cover!important}
body.cb-builder-mobile .about,body.cb-builder-mobile .things-grid,body.cb-builder-mobile .featured-grid,body.cb-builder-mobile .grid,body.cb-builder-mobile .cards .grid{grid-template-columns:minmax(0,1fr)!important}
body.cb-builder-mobile main>section:not([data-cb-user-edited="1"]){padding-left:16px!important;padding-right:16px!important;width:100%!important;max-width:100%!important}
body.cb-builder-mobile section,body.cb-builder-mobile section>*{max-width:100%!important;min-width:0!important}
body.cb-builder-mobile h1:not([data-cb-user-edited="1"]){font-size:clamp(1.9rem,10vw,3rem)!important;line-height:1.08!important}
body.cb-builder-mobile h2:not([data-cb-user-edited="1"]){font-size:clamp(1.55rem,8vw,2.35rem)!important;line-height:1.15!important}
body.cb-builder-mobile h3:not([data-cb-user-edited="1"]){font-size:clamp(1.15rem,5vw,1.6rem)!important}
body.cb-builder-mobile p,body.cb-builder-mobile a,body.cb-builder-mobile button{max-width:100%!important;overflow-wrap:anywhere}
body.cb-builder-mobile nav{max-width:100%!important;overflow-x:auto!important;justify-content:flex-start!important;gap:6px!important;padding-left:8px!important;padding-right:8px!important}
body.cb-builder-mobile nav a{white-space:nowrap!important;flex:0 0 auto!important}
body.cb-builder-mobile [data-cb-selected="1"]{max-width:100%!important}
body.cb-builder-mobile .hero-logo-img,body.cb-builder-mobile #heroLogo{width:min(82vw,320px)!important;height:auto!important}
body.cb-builder-mobile .hero{min-height:55vh!important;height:auto!important;padding-top:105px!important;padding-bottom:50px!important}
body.cb-builder-mobile .about h2,body.cb-builder-mobile .things h2,body.cb-builder-mobile .featured-home h2{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
`;}
function analyseResponsive(d){
 const win=frame.contentWindow;
 [...d.body.querySelectorAll('[data-cb-responsive],[data-cb-responsive-item]')].forEach(el=>{
   delete el.dataset.cbResponsive;delete el.dataset.cbResponsiveItem;
 });
 [...d.body.querySelectorAll('*')].forEach(el=>{
  if(el.closest('#cb-selection-overlay')||['NAV','HEADER','FOOTER','SCRIPT','STYLE','LINK','META'].includes(el.tagName))return;
  const children=[...el.children].filter(x=>!['SCRIPT','STYLE','LINK'].includes(x.tagName) && x.id!=='cb-selection-overlay');
  if(children.length<2)return;
  const cs=win.getComputedStyle(el);
  const rect=el.getBoundingClientRect();
  const childRects=children.map(x=>x.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
  const sideBySide=childRects.length>1 && childRects.some((r,i)=>childRects.slice(i+1).some(q=>Math.abs(r.top-q.top)<Math.min(r.height,q.height)*0.45 && Math.abs(r.left-q.left)>20));
  if(cs.display==='grid')el.dataset.cbResponsive='grid';
  else if(cs.display==='flex' && !el.classList.contains('footer-links') && !el.classList.contains('cb-proof-stats'))el.dataset.cbResponsive='flex';
  else if(sideBySide && rect.width>420)el.dataset.cbResponsive='row';
  if(el.dataset.cbResponsive){children.forEach(ch=>ch.dataset.cbResponsiveItem='1');}
 });
}
function applyDeviceClass(){
 const d=frame.contentDocument;if(!d||!d.body)return;
 d.body.classList.remove('cb-builder-desktop','cb-builder-tablet','cb-builder-mobile');
 d.body.classList.add('cb-builder-'+currentDevice);
}
function applyResponsiveMode(){
 const d=frame.contentDocument;if(!d||!d.head)return;
 let st=d.getElementById('cb-auto-responsive-style');
 if(!st){st=d.createElement('style');st.id='cb-auto-responsive-style';d.head.appendChild(st)}
 st.textContent=$('autoResponsive')?.checked?responsiveCss():'';
 analyseResponsive(d);applyDeviceClass();applyDeviceOverrides();positionSelectionOverlay();
 setTimeout(()=>{analyseResponsive(d);applyDeviceClass();applyDeviceOverrides();positionSelectionOverlay();},500);
}
function updateContextPanels(){
 if(!selected)return;
 const tag=selected.tagName, textLike=!['IMG','VIDEO','IFRAME','HR','INPUT'].includes(tag);
 $('typographyGroup').classList.toggle('context-hidden',!textLike);
 $('backgroundGroup').classList.toggle('context-hidden',tag==='IMG');
 $('altRow').hidden=tag!=='IMG';
}
function loadPage(){selected=null;updateInspector();pageKey=pageSelect.value;const cfg=pageConfig(pageKey);setStatus(`Loading ${cfg.label}…`);frame.src=new URL(`../../${cfg.file}?cbuilder=${Date.now()}`,location.href).href}
frame.addEventListener('load',()=>{try{const d=frame.contentDocument,cfg=pageConfig(pageKey);if(!d||!d.body)throw Error('Page is not accessible');if(cfg.mode==='home'){const w=d.getElementById('welcomeScreen');if(w)w.style.setProperty('display','none','important');const m=d.getElementById('mainSite');if(m){m.style.setProperty('display','block','important');m.style.setProperty('opacity','1','important');m.style.setProperty('visibility','visible','important')}d.body.classList.add('entered')}else if(cfg.mode==='welcome'){const m=d.getElementById('mainSite');if(m)m.style.setProperty('display','none','important');const w=d.getElementById('welcomeScreen');if(w){w.style.setProperty('display','flex','important');w.style.setProperty('opacity','1','important');w.style.setProperty('visibility','visible','important');w.classList.remove('hide')}d.body.classList.remove('entered')}
let st=d.getElementById('cb-live-editor-style');if(!st){st=d.createElement('style');st.id='cb-live-editor-style';d.head.appendChild(st)}st.textContent=`
[data-cb-selected="1"]{outline:2px solid #2196f3!important;outline-offset:1px!important;cursor:pointer!important}
[data-cb-hover="1"]{outline:1px dashed #2196f3!important;outline-offset:1px!important}
#cb-selection-overlay{position:fixed;display:none;border:2px solid #2196f3;pointer-events:none;z-index:2147483646;box-sizing:border-box}
#cb-selection-overlay .cb-tag{position:absolute;left:-2px;top:-24px;background:#2196f3;color:#fff;font:11px Arial;padding:4px 7px;border-radius:3px 3px 0 0;white-space:nowrap}
#cb-selection-overlay .cb-toolbar{position:absolute;right:-2px;top:-29px;height:27px;display:flex;gap:1px;background:#2196f3;pointer-events:auto;border-radius:3px 3px 0 0;overflow:hidden}
#cb-selection-overlay .cb-toolbar button{width:28px;height:27px;border:0;background:#2196f3;color:#fff;cursor:pointer;font:700 13px Arial}
#cb-selection-overlay .cb-toolbar button:hover{background:#087bd1}
#cb-selection-overlay .cb-handle{position:absolute;width:9px;height:9px;background:#fff;border:2px solid #2196f3;pointer-events:auto;box-sizing:border-box}
#cb-selection-overlay .nw{left:-6px;top:-6px;cursor:nwse-resize}.n{left:50%;top:-6px;transform:translateX(-50%);cursor:ns-resize}.ne{right:-6px;top:-6px;cursor:nesw-resize}
#cb-selection-overlay .e{right:-6px;top:50%;transform:translateY(-50%);cursor:ew-resize}.se{right:-6px;bottom:-6px;cursor:nwse-resize}.s{left:50%;bottom:-6px;transform:translateX(-50%);cursor:ns-resize}.sw{left:-6px;bottom:-6px;cursor:nesw-resize}.w{left:-6px;top:50%;transform:translateY(-50%);cursor:ew-resize}`;
createSelectionOverlay(d);applyResponsiveMode();
installSelectionEngine(d);d.addEventListener('mouseover',e=>{const t=getSelectableTarget(e);if(t&&t!==d.body&&t!==d.documentElement&&!t.closest('#cb-selection-overlay'))t.dataset.cbHover='1'},true);d.addEventListener('mouseout',e=>{const t=getSelectableTarget(e);if(t)delete t.dataset.cbHover},true);d.addEventListener('scroll',positionSelectionOverlay,true);frame.contentWindow.addEventListener('resize',positionSelectionOverlay);applyDraft();buildSections();buildLayers();
[700,1800,3500].forEach(ms=>setTimeout(refreshAfterDynamicLoad,ms));
const ro=new MutationObserver(()=>{clearTimeout(frame.__cbRespTimer);frame.__cbRespTimer=setTimeout(()=>{if($('autoResponsive')?.checked){analyseResponsive(d);applyDeviceClass()}positionSelectionOverlay();},120)});ro.observe(d.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});setStatus(`${cfg.label} loaded. Live page loaded. Dynamic API sections will refresh automatically.`)}catch(err){setStatus('Could not open page: '+err.message,true)}});
function getSelectableTarget(e){
 const d=frame.contentDocument;if(!d)return null;
 let el=e?.target instanceof frame.contentWindow.Element?e.target:null;
 if(!el&&Number.isFinite(e?.clientX)&&Number.isFinite(e?.clientY))el=d.elementFromPoint(e.clientX,e.clientY);
 if(!el||el===d.documentElement||el.closest?.('#cb-selection-overlay'))return null;
 if(el.tagName==='BODY')return d.querySelector('main')||el;
 return el;
}
function installSelectionEngine(d){
 if(d.__cbSelectionInstalled)return;d.__cbSelectionInstalled=true;
 const pick=e=>{const el=getSelectableTarget(e);if(!el)return;
   const link=el.closest?.('a');if(link)e.preventDefault();
   selectElement(el);
 };
 d.addEventListener('pointerdown',pick,true);
 d.addEventListener('click',e=>{const el=getSelectableTarget(e);if(!el)return;if(el.closest?.('a'))e.preventDefault();selectElement(el)},true);
 d.addEventListener('dblclick',onFrameDblClick,true);
}
function onFrameDblClick(e){e.preventDefault();e.stopPropagation();const el=getSelectableTarget(e);if(!el||['IMG','VIDEO','INPUT','SELECT','TEXTAREA'].includes(el.tagName))return;selectElement(el);el.contentEditable='true';el.setAttribute('data-cb-editing','1');el.focus();setStatus('Direct text editing enabled. Click outside when finished.');el.addEventListener('blur',()=>{el.contentEditable='false';el.removeAttribute('data-cb-editing');recordChange(el);setStatus('Text edit saved to the current draft.')}, {once:true})}
function createSelectionOverlay(d){
  const old=d.getElementById('cb-selection-overlay');if(old)old.remove();
  const ov=d.createElement('div');ov.id='cb-selection-overlay';
  ov.innerHTML='<div class="cb-tag">Element</div><div class="cb-toolbar"><button data-act="drag" title="Drag / move">✥</button><button data-act="up" title="Move up">↑</button><button data-act="down" title="Move down">↓</button><button data-act="justify" title="Justify text">☷</button><button data-act="duplicate" title="Duplicate">⧉</button><button data-act="delete" title="Delete">✕</button></div>'+['nw','n','ne','e','se','s','sw','w'].map(x=>`<i class="cb-handle ${x}" data-handle="${x}"></i>`).join('');
  d.body.appendChild(ov);selectionOverlay=ov;
  ov.querySelector('.cb-toolbar').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const act=e.target.closest('button')?.dataset.act;if(!act||!selected||act==='drag')return;if(act==='duplicate')duplicateSelected();if(act==='delete')deleteSelected();if(act==='up')moveSelected(-1);if(act==='down')moveSelected(1);if(act==='justify'){mutate(el=>setUserStyle(el,'text-align','justify'));updateInspector();}});
  const dragButton=ov.querySelector('[data-act="drag"]');if(dragButton)dragButton.addEventListener('mousedown',startMove);
  ov.querySelectorAll('[data-handle]').forEach(h=>h.addEventListener('mousedown',startResize));
}
function positionSelectionOverlay(){if(!selectionOverlay||!selected||!selected.isConnected){if(selectionOverlay)selectionOverlay.style.display='none';return}const r=selected.getBoundingClientRect();selectionOverlay.style.display='block';selectionOverlay.style.left=r.left+'px';selectionOverlay.style.top=r.top+'px';selectionOverlay.style.width=Math.max(1,r.width)+'px';selectionOverlay.style.height=Math.max(1,r.height)+'px';selectionOverlay.querySelector('.cb-tag').textContent=selected.id?'#'+selected.id:selected.classList.length?'.'+selected.classList[0]:selected.tagName.toLowerCase()}
function moveSelected(direction){if(!selected||!selected.parentElement)return;const parent=selected.parentElement;const sibling=direction<0?selected.previousElementSibling:selected.nextElementSibling;if(!sibling){setStatus(direction<0?'Element is already first.':'Element is already last.');return}history.push(snapshot());if(direction<0)parent.insertBefore(selected,sibling);else parent.insertBefore(sibling,selected);recordChange(parent);buildSections();buildLayers();positionSelectionOverlay();setStatus(direction<0?'Element moved up.':'Element moved down.')}
function duplicateSelected(){if(!selected)return;history.push(snapshot());const clone=selected.cloneNode(true);clone.removeAttribute('data-cb-selected');selected.after(clone);const parent=clone.parentElement;selectElement(clone);recordChange(parent);buildSections();buildLayers();setStatus('Element duplicated.')}
function deleteSelected(){if(!selected)return;if(!window.confirm('Delete the selected element from this draft?'))return;history.push(snapshot());const parent=selected.parentElement;if(!parent)return;selected.remove();selected=parent;recordChange(parent);selectElement(parent);buildSections();buildLayers();setStatus('Element deleted from draft.')}
function startMove(e){if(!selected)return;e.preventDefault();e.stopPropagation();const cs=frame.contentWindow.getComputedStyle(selected),matrix=new DOMMatrixReadOnly(cs.transform==='none'?'matrix(1,0,0,1,0,0)':cs.transform);resizeState={mode:'move',startX:e.clientX,startY:e.clientY,tx:matrix.m41,ty:matrix.m42};const d=frame.contentDocument;d.addEventListener('mousemove',doMove,true);d.addEventListener('mouseup',stopMove,true)}
function doMove(e){if(!resizeState||resizeState.mode!=='move'||!selected)return;e.preventDefault();const x=resizeState.tx+(e.clientX-resizeState.startX),y=resizeState.ty+(e.clientY-resizeState.startY);setUserStyle(selected,'transform',`translate(${Math.round(x)}px, ${Math.round(y)}px)`);positionSelectionOverlay()}
function stopMove(){const d=frame.contentDocument;d.removeEventListener('mousemove',doMove,true);d.removeEventListener('mouseup',stopMove,true);if(selected)recordChange(selected);resizeState=null;setStatus('Element moved.')}
function startResize(e){if(!selected)return;e.preventDefault();e.stopPropagation();const r=selected.getBoundingClientRect();resizeState={handle:e.currentTarget.dataset.handle,startX:e.clientX,startY:e.clientY,width:r.width,height:r.height};const d=frame.contentDocument;d.addEventListener('mousemove',doResize,true);d.addEventListener('mouseup',stopResize,true)}
function doResize(e){if(!resizeState||!selected)return;e.preventDefault();const dx=e.clientX-resizeState.startX,dy=e.clientY-resizeState.startY,h=resizeState.handle;let w=resizeState.width,ht=resizeState.height;if(h.includes('e'))w+=dx;if(h.includes('w'))w-=dx;if(h.includes('s'))ht+=dy;if(h.includes('n'))ht-=dy;if(['e','w','ne','nw','se','sw'].includes(h))setUserStyle(selected,'width',Math.max(20,w)+'px');if(['n','s','ne','nw','se','sw'].includes(h))setUserStyle(selected,'height',Math.max(20,ht)+'px');positionSelectionOverlay();updateInspector()}
function stopResize(){const d=frame.contentDocument;d.removeEventListener('mousemove',doResize,true);d.removeEventListener('mouseup',stopResize,true);if(selected)recordChange(selected);resizeState=null}
function selectElement(el){if(!el||!el.isConnected||el.closest?.('#cb-selection-overlay'))return;if(selected&&selected!==el)delete selected.dataset.cbSelected;selected=el;ensureEditId(selected);selected.dataset.cbSelected='1';$('selectedLabel').textContent=selectorFor(el);updateInspector();updateContextPanels();positionSelectionOverlay();setStatus(`Selected ${el.id?'#'+el.id:el.tagName.toLowerCase()}. Double-click text to edit.`)}
function buildSections(){const d=frame.contentDocument,list=$('sectionList');list.innerHTML='';const nodes=[...d.querySelectorAll('[data-section],main > section,body > section,header,footer')],seen=new Set();nodes.forEach((el,i)=>{if(seen.has(el))return;seen.add(el);const b=document.createElement('button');b.textContent=el.dataset.section||el.id||String(el.className||'').split(' ')[0]||`${el.tagName} ${i+1}`;b.onclick=()=>{el.scrollIntoView({behavior:'smooth',block:'center'});selectElement(el)};list.appendChild(b)});if(!list.children.length)list.innerHTML='<div class="empty">No sections found.</div>'}
function buildLayers(){const d=frame.contentDocument,list=$('layerList');if(!d)return;list.innerHTML='';[...d.querySelectorAll('body > *, main > *, section > h1, section > h2, section > h3')].slice(0,120).forEach(el=>{const item=document.createElement('div');item.className='layer-item';item.innerHTML=`<b>${el.tagName.toLowerCase()}</b><span>${el.id?'#'+el.id:el.className?'.'+String(el.className).split(' ')[0]:el.textContent.trim().slice(0,28)}</span>`;item.onclick=()=>{el.scrollIntoView({behavior:'smooth',block:'center'});selectElement(el)};list.appendChild(item)})}
function rgbHex(v){const m=v&&v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?'#'+[m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,'0')).join(''):null}
function num(v){const n=parseFloat(v);return Number.isFinite(n)?n:0}
function updateInspector(){const empty=$('emptyState'),ins=$('inspector'),se=$('settingsEmpty'),si=$('settingsInspector');if(!selected){empty.hidden=false;ins.hidden=true;se.hidden=false;si.hidden=true;return}empty.hidden=true;ins.hidden=false;se.hidden=true;si.hidden=false;$('elementName').textContent=selectorFor(selected);const cs=frame.contentWindow.getComputedStyle(selected);$('displayValue').value=['block','inline-block','flex','grid','none'].includes(cs.display)?cs.display:'';$('widthValue').value=selected.style.width||'';$('heightValue').value=selected.style.height||'';$('maxWidthValue').value=selected.style.maxWidth||'';$('minHeightValue').value=selected.style.minHeight||'';[['marginTop','marginTop'],['marginRight','marginRight'],['marginBottom','marginBottom'],['marginLeft','marginLeft'],['paddingTop','paddingTop'],['paddingRight','paddingRight'],['paddingBottom','paddingBottom'],['paddingLeft','paddingLeft']].forEach(([id,p])=>$(id).value=num(cs[p]));$('fontFamily').value=selected.style.fontFamily||cs.fontFamily||'';$('fontSize').value=num(cs.fontSize);$('fontWeight').value=['300','400','500','600','700','800'].includes(cs.fontWeight)?cs.fontWeight:'';$('lineHeight').value=selected.style.lineHeight||'';$('letterSpacing').value=selected.style.letterSpacing||'';$('textAlign').value=['left','center','right','justify'].includes(cs.textAlign)?cs.textAlign:'';$('justifyContent').value=selected.style.justifyContent||(['flex-start','center','flex-end','space-between','space-around','space-evenly'].includes(cs.justifyContent)?cs.justifyContent:'');$('alignItems').value=selected.style.alignItems||(['flex-start','center','flex-end','stretch','baseline'].includes(cs.alignItems)?cs.alignItems:'');document.querySelectorAll('[data-align]').forEach(b=>b.classList.toggle('active',b.dataset.align===cs.textAlign));const ownColor=!!selected.style.color;$('useTextColor').checked=ownColor;$('colorValue').disabled=!ownColor;$('colorValue').value=rgbHex(cs.color)||'#000000';const ownBg=!!selected.style.backgroundColor;$('useBgColor').checked=ownBg;$('bgValue').disabled=!ownBg;$('bgValue').value=rgbHex(cs.backgroundColor)||'#ffffff';$('backgroundImage').value=selected.style.backgroundImage.replace(/^url\(["']?|["']?\)$/g,'')||'';$('backgroundSize').value=selected.style.backgroundSize||'';$('backgroundPosition').value=selected.style.backgroundPosition||'';$('radius').value=num(cs.borderRadius);$('borderWidth').value=num(cs.borderWidth);$('borderColor').value=rgbHex(cs.borderColor)||'#000000';$('boxShadow').value=selected.style.boxShadow||'';$('opacity').value=cs.opacity||1;$('textValue').value=['IMG','VIDEO'].includes(selected.tagName)?'':selected.innerHTML||'';$('linkRow').hidden=selected.tagName!=='A';$('linkValue').value=selected.getAttribute('href')||'';$('imageRow').hidden=selected.tagName!=='IMG';$('imageValue').value=selected.getAttribute('src')||'';$('altValue').value=selected.getAttribute('alt')||'';$('classValue').value=selected.className||'';$('idValue').value=selected.id||''}
function getDraft(){try{return JSON.parse(localStorage.getItem(PREFIX+pageKey)||'{}')}catch{return {}}}
function saveDraftObject(draft){localStorage.setItem(PREFIX+pageKey,JSON.stringify(draft))}
function snapshot(){return JSON.stringify(getDraft())}
function ensureDraftEntry(el){
 const draft=getDraft();
 const editId=ensureEditId(el);
 const key=editId;
 const old=draft[key]||{};
 const path=old.path||structuralPath(el);
 draft[key]={editId,path,selector:`[data-cb-edit-id="${editId}"]`,html:old.html,attrs:old.attrs||{},style:old.style||'',deviceStyles:old.deviceStyles||{tablet:{},mobile:{}}};
 return {s:key,draft,entry:draft[key]};
}
function isDynamicRegion(el){
 if(!el)return false;
 const dynamicIds=['featuredStaysGrid','featuredDestinationsGrid','featuredServicesGrid'];
 if(dynamicIds.includes(el.id))return true;
 if(el.matches?.('[data-review-grid],[data-reels-grid],[data-reviews-showcase]'))return true;
 if(el.querySelector?.('#featuredStaysGrid,#featuredDestinationsGrid,#featuredServicesGrid,[data-review-grid],[data-reels-grid],[data-reviews-showcase]'))return true;
 return false;
}
function canStoreHtml(el){
 if(!el||isDynamicRegion(el))return false;
 if(['H1','H2','H3','H4','H5','H6','P','A','BUTTON','SPAN','LI','LABEL'].includes(el.tagName))return true;
 return el.children.length===0;
}
function recordChange(el){
 if(!el)return;
 const {draft,entry}=ensureDraftEntry(el);
 if(canStoreHtml(el))entry.html=el.innerHTML;else delete entry.html;
 entry.attrs={};
 ['href','src','class','id','alt','data-cb-user-edited'].forEach(a=>{if(el.hasAttribute(a))entry.attrs[a]=el.getAttribute(a)});
 if(currentDevice==='desktop')entry.style=el.getAttribute('style')||'';
 saveDraftObject(draft);applyDeviceOverrides();updateInspector();buildLayers();
}
function cssEscapeValue(v){return String(v).replace(/\\/g,'\\\\').replace(/}/g,'\\}')}
function applyDeviceOverrides(){const d=frame.contentDocument;if(!d||!d.head)return;let st=d.getElementById('cb-device-overrides');if(!st){st=d.createElement('style');st.id='cb-device-overrides';d.head.appendChild(st)}const draft=getDraft();let css='';Object.values(draft).forEach(p=>{for(const dev of ['tablet','mobile']){const obj=p.deviceStyles?.[dev]||{};const decl=Object.entries(obj).filter(([,v])=>v!==''&&v!=null).map(([k,v])=>`${k}:${cssEscapeValue(v)} !important`).join(';');if(decl)css+=`body.cb-builder-${dev} ${p.selector}{${decl}}\n`;}});st.textContent=css}
function applyDraft(){
 const d=frame.contentDocument,draft=getDraft();
 Object.values(draft).forEach(p=>{try{
   let el=d.querySelector(`[data-cb-edit-id="${CSS.escape(p.editId||'')}"]`);
   if(!el&&p.path)el=d.querySelector(p.path);
   if(!el)return;
   if(p.editId)el.setAttribute('data-cb-edit-id',p.editId);
   if(p.html!==undefined && canStoreHtml(el))el.innerHTML=p.html;
   Object.entries(p.attrs||{}).forEach(([k,v])=>el.setAttribute(k,v));
   if(p.style!==undefined)el.setAttribute('style',p.style);
 }catch(err){console.warn('Draft apply failed',p,err)}});
 applyDeviceOverrides();
}
function refreshAfterDynamicLoad(){
 const d=frame.contentDocument;if(!d)return;
 applyDraft();buildSections();buildLayers();applyResponsiveMode();
}

function setUserStyle(el,prop,value){
 if(!el)return;
 if(currentDevice==='desktop'){
   if(value===undefined||value===null||value==='')el.style.removeProperty(prop);
   else el.style.setProperty(prop,String(value),'important');
 }else{
   const {draft,entry}=ensureDraftEntry(el);
   entry.deviceStyles=entry.deviceStyles||{tablet:{},mobile:{}};
   entry.deviceStyles[currentDevice]=entry.deviceStyles[currentDevice]||{};
   if(value===undefined||value===null||value==='')delete entry.deviceStyles[currentDevice][prop];
   else entry.deviceStyles[currentDevice][prop]=String(value);
   saveDraftObject(draft);
   applyDeviceOverrides();
 }
 el.dataset.cbUserEdited='1';
}
function mutate(fn){if(!selected)return;history.push(snapshot());redoStack=[];fn(selected);selected.dataset.cbUserEdited='1';recordChange(selected);positionSelectionOverlay()}
function bind(id,event,fn){$(id).addEventListener(event,e=>mutate(el=>fn(el,e.target.value)))}
bind('displayValue','change',(e,v)=>setUserStyle(e,'display',v));
bind('widthValue','change',(e,v)=>setUserStyle(e,'width',v));
bind('heightValue','change',(e,v)=>setUserStyle(e,'height',v));
bind('maxWidthValue','change',(e,v)=>setUserStyle(e,'max-width',v));
bind('minHeightValue','change',(e,v)=>setUserStyle(e,'min-height',v));
[['marginTop','margin-top'],['marginRight','margin-right'],['marginBottom','margin-bottom'],['marginLeft','margin-left'],['paddingTop','padding-top'],['paddingRight','padding-right'],['paddingBottom','padding-bottom'],['paddingLeft','padding-left']].forEach(([id,prop])=>bind(id,'change',(e,v)=>setUserStyle(e,prop,v===''?'':v+'px')));
bind('fontFamily','change',(e,v)=>setUserStyle(e,'font-family',v));
bind('fontSize','change',(e,v)=>setUserStyle(e,'font-size',v===''?'':v+'px'));
bind('fontWeight','change',(e,v)=>setUserStyle(e,'font-weight',v));
bind('lineHeight','change',(e,v)=>setUserStyle(e,'line-height',v));
bind('letterSpacing','change',(e,v)=>setUserStyle(e,'letter-spacing',v));
bind('textAlign','change',(e,v)=>setUserStyle(e,'text-align',v));
bind('colorValue','input',(e,v)=>setUserStyle(e,'color',v));
bind('bgValue','input',(e,v)=>setUserStyle(e,'background-color',v));
bind('backgroundImage','change',(e,v)=>setUserStyle(e,'background-image',v?`url("${v}")`:''));
bind('backgroundSize','change',(e,v)=>setUserStyle(e,'background-size',v));
bind('backgroundPosition','change',(e,v)=>setUserStyle(e,'background-position',v));
bind('radius','change',(e,v)=>setUserStyle(e,'border-radius',v===''?'':v+'px'));
bind('borderWidth','change',(e,v)=>{setUserStyle(e,'border-width',v===''?'':v+'px');setUserStyle(e,'border-style',Number(v)>0?'solid':'')});
bind('borderColor','input',(e,v)=>setUserStyle(e,'border-color',v));
bind('boxShadow','change',(e,v)=>setUserStyle(e,'box-shadow',v));
bind('opacity','input',(e,v)=>setUserStyle(e,'opacity',v));
bind('textValue','change',(e,v)=>e.innerHTML=v);bind('linkValue','change',(e,v)=>e.setAttribute('href',v));bind('imageValue','change',(e,v)=>e.setAttribute('src',v));bind('altValue','change',(e,v)=>e.setAttribute('alt',v));bind('classValue','change',(e,v)=>e.className=v);bind('idValue','change',(e,v)=>e.id=v);
$('hideBtn').onclick=()=>mutate(el=>setUserStyle(el,'display',frame.contentWindow.getComputedStyle(el).display==='none'?'':'none'));$('resetElementBtn').onclick=()=>{if(!selected)return;const draft=getDraft(),key=selected.getAttribute('data-cb-edit-id')||selectorFor(selected);if(currentDevice==='desktop'){delete draft[key]}else if(draft[key]?.deviceStyles){draft[key].deviceStyles[currentDevice]={}}saveDraftObject(draft);loadPage()};
$('justifyContent').onchange=e=>mutate(el=>setUserStyle(el,'justify-content',e.target.value));$('alignItems').onchange=e=>mutate(el=>setUserStyle(el,'align-items',e.target.value));document.querySelectorAll('[data-align]').forEach(b=>b.onclick=()=>{mutate(el=>setUserStyle(el,'text-align',b.dataset.align));$('textAlign').value=b.dataset.align;document.querySelectorAll('[data-align]').forEach(x=>x.classList.toggle('active',x===b));});
$('duplicateBtn').onclick=duplicateSelected;$('deleteBtn').onclick=deleteSelected;$('duplicateQuickBtn').onclick=duplicateSelected;$('deleteQuickBtn').onclick=deleteSelected;$('moveUpBtn').onclick=()=>moveSelected(-1);$('moveDownBtn').onclick=()=>moveSelected(1);
function addBlock(type){const d=frame.contentDocument,parent=selected&&selected.tagName!=='IMG'&&selected.tagName!=='INPUT'?selected:d.querySelector('main')||d.body;let el;const make=h=>{const t=d.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild};const map={section:'<section style="padding:70px 20px"><h2>New Section</h2><p>Add your content here.</p></section>',container:'<div style="max-width:1200px;margin:auto;padding:20px">Container</div>',columns:'<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px"><div>Column 1</div><div>Column 2</div></div>',heading:'<h2>New Heading</h2>',text:'<p>New text content</p>',button:'<a href="#" style="display:inline-block;padding:12px 22px;border-radius:6px;background:#087f75;color:#fff;text-decoration:none">Button</a>',image:'<img src="images/cover.jpg" alt="New image" style="max-width:100%;height:auto">',card:'<div style="padding:24px;border-radius:12px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.12)"><h3>Card title</h3><p>Card content</p></div>',spacer:'<div style="height:60px"></div>',divider:'<hr style="border:0;border-top:1px solid #d8e2e8">'};el=make(map[type]);parent.appendChild(el);selectElement(el);recordChange(parent);el.scrollIntoView({behavior:'smooth',block:'center'})}
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addBlock(b.dataset.add));
$('saveBtn').onclick=()=>{
 try{
  const d=frame.contentDocument;
  if(selected)recordChange(selected);
  if(d){[...d.querySelectorAll('[data-cb-edit-id],[data-cb-user-edited="1"]')].forEach(el=>recordChange(el));}
  const draft=getDraft();
  saveDraftObject(draft);
  setStatus(`Draft saved for ${pageConfig(pageKey).label}. ${Object.keys(draft).length} edited item(s) stored.`);
 }catch(err){setStatus('Draft save failed: '+err.message,true)}
};$('publishBtn').onclick=publishLive;$('clearBtn').onclick=()=>{if(confirm('Clear all saved edits for this page?')){localStorage.removeItem(PREFIX+pageKey);history=[];redoStack=[];loadPage()}};$('reloadBtn').onclick=loadPage;$('undoBtn').onclick=()=>{const prev=history.pop();if(prev!==undefined){redoStack.push(snapshot());localStorage.setItem(PREFIX+pageKey,prev);loadPage()}};$('redoBtn').onclick=()=>{const next=redoStack.pop();if(next!==undefined){history.push(snapshot());localStorage.setItem(PREFIX+pageKey,next);loadPage()}};$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({page:pageKey,edits:getDraft()},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ceybreez-${pageKey}-draft.json`;a.click();URL.revokeObjectURL(a.href)};pageSelect.onchange=loadPage;
document.querySelectorAll('.cb-devicebar button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.cb-devicebar button').forEach(x=>x.classList.remove('active'));b.classList.add('active');frame.style.width=b.dataset.width;currentDevice=b.dataset.device||'desktop';setTimeout(()=>{applyResponsiveMode();positionSelectionOverlay();},80)});
document.querySelectorAll('[data-left-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-left-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.left-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.leftTab+'Tab').classList.add('active')});document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.right-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab+'Tab').classList.add('active')});
function startUpload(target){uploadTarget=target;$('fileInput').click()}$('uploadBtn').onclick=()=>startUpload('image');$('mediaUploadBtn').onclick=()=>startUpload('image');$('bgUploadBtn').onclick=()=>startUpload('background');$('fileInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;const token=localStorage.getItem('CEYBREEZ_ADMIN_TOKEN');if(!token){setStatus('Admin token not found. Log in to Admin first.',true);return}const fd=new FormData();fd.append('file',file);fd.append('folder','page-builder');setStatus('Uploading image…');try{const r=await fetch(API_BASE+'/api/admin/upload-image',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:fd});const data=await r.json();if(!r.ok||!data.url)throw Error(data.error||'Upload failed');if(selected){if(uploadTarget==='background')mutate(el=>setUserStyle(el,'background-image',`url("${data.url}")`));else if(selected.tagName==='IMG')mutate(el=>el.setAttribute('src',data.url));else{const img=frame.contentDocument.createElement('img');img.src=data.url;img.style.maxWidth='100%';selected.appendChild(img);ensureEditId(img);recordChange(img);selectElement(img)}}setStatus('Image uploaded and applied. Save Draft or Publish Live.')}catch(err){setStatus(err.message,true)}e.target.value=''};

$('autoResponsive').addEventListener('change',()=>{applyResponsiveMode();setStatus($('autoResponsive').checked?'Auto responsive enabled. Tablet and mobile layouts will adjust automatically.':'Auto responsive disabled.');});
$('useTextColor').addEventListener('change',e=>{ $('colorValue').disabled=!e.target.checked;mutate(el=>{if(e.target.checked)setUserStyle(el,'color',$('colorValue').value);else setUserStyle(el,'color','')});});
$('useBgColor').addEventListener('change',e=>{ $('bgValue').disabled=!e.target.checked;mutate(el=>{if(e.target.checked)setUserStyle(el,'background-color',$('bgValue').value);else setUserStyle(el,'background-color','')});});
$('clearBgBtn').addEventListener('click',()=>{if(!selected)return;$('backgroundImage').value='';mutate(el=>setUserStyle(el,'background-image',''));});
$('altValue').addEventListener('input',e=>{if(selected?.tagName==='IMG')mutate(el=>el.setAttribute('alt',e.target.value));});
document.querySelectorAll('.cb-devicebar button[data-device]').forEach(b=>b.addEventListener('click',()=>{currentDevice=b.dataset.device;setStatus(`${b.textContent} preview — Auto responsive ${$('autoResponsive').checked?'ON':'OFF'}.`);setTimeout(positionSelectionOverlay,220)}));
loadPage();
})();
