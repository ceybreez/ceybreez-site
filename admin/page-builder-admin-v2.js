(function(){
const pageUrls={home:'../index.html',villas:'../villas.html',homestays:'../homestays.html',apartments:'../apartments.html',tours:'../tours.html',services:'../services.html',contact:'../contact.html'};
let pb2Items=[];
window.pb3ElementStyles={};
window.pb3CustomElements=[];
window.pb3SelectedSelector="";
window.pb3SelectedDevice="desktop";
function el(id){return document.getElementById(id)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
window.pb2ChangePage=function(page){if(el('sectionPage'))el('sectionPage').value=page;loadPageSections();pb2RefreshPreview()}
window.pb2RefreshPreview=function(){const page=el('sectionFilterPage')?.value||'home';const f=el('pb2PreviewFrame');if(f)f.src=(pageUrls[page]||pageUrls.home)+'?pbpreview='+Date.now()}
window.pb2SetDevice=function(device,btn){const w=el('pb2PreviewFrameWrap');if(!w)return;w.className='pb2-preview-frame-wrap '+device;document.querySelectorAll('.pb2-devices button').forEach(b=>b.classList.remove('active'));btn?.classList.add('active')}
window.pb2NewSection=function(){resetSectionForm();el('sectionPage').value=el('sectionFilterPage').value;el('sectionKey').value='custom';pb2LivePreview()}
window.pb2ResetSelectedSection=function(){if(!confirm('Clear the selected section form? Saved website data will not be deleted until you save.'))return;resetSectionForm();el('sectionPage').value=el('sectionFilterPage').value;pb2LivePreview()}
window.pb2SaveCurrentSection=function(){el('sectionForm')?.requestSubmit()}
window.pb2LivePreview=function(){try{const frame=el('pb2PreviewFrame');const doc=frame?.contentDocument;if(!doc)return;const key=el('sectionKey')?.value;const target=doc.querySelector(`[data-section="${CSS.escape(key||'')}"]`);if(!target)return;const set=(sel,val)=>{const n=target.querySelector(sel);if(n&&val!==undefined&&val!=='')n.textContent=val};set('[data-field="title"]',el('sectionTitle')?.value);set('[data-field="subtitle"]',el('sectionSubtitle')?.value);set('[data-field="content"]',el('sectionContent')?.value);const btn=target.querySelector('[data-field="button"]');if(btn){if(el('sectionButtonText')?.value)btn.textContent=el('sectionButtonText').value;if(el('sectionButtonUrl')?.value)btn.href=el('sectionButtonUrl').value}const bg=el('sectionBackgroundImage')?.value;if(bg)target.style.backgroundImage=`linear-gradient(rgba(0,0,0,${(Number(el('sectionOverlay')?.value||35)/100)}),rgba(0,0,0,${(Number(el('sectionOverlay')?.value||35)/100)})),url('${bg}')`;target.style.backgroundSize=el('sectionBackgroundSize')?.value||'cover';target.style.backgroundPosition=el('sectionBackgroundPosition')?.value||'center center';target.style.color=el('sectionTextColor')?.value||'';target.style.fontFamily=el('sectionFontFamily')?.value||'';target.style.fontSize=el('sectionFontSize')?.value?el('sectionFontSize').value+'px':'';target.style.paddingTop=el('sectionPaddingTop')?.value?el('sectionPaddingTop').value+'px':'';target.style.paddingBottom=el('sectionPaddingBottom')?.value?el('sectionPaddingBottom').value+'px':'';target.querySelectorAll('h1,h2,h3').forEach(h=>{h.style.color=el('sectionHeadingColor')?.value||'';h.style.fontFamily=el('sectionHeadingFont')?.value||'';h.style.fontSize=el('sectionHeadingSize')?.value?el('sectionHeadingSize').value+'px':''})}catch(e){}}
const oldLoad=window.loadPageSections;
window.loadPageSections=async function(){const page=el('sectionFilterPage')?.value||'home';if(el('sectionPage'))el('sectionPage').value=page;const box=el('sectionsList');if(box)box.innerHTML='<div class="pb2-empty">Loading sections…</div>';try{const res=await fetch(`${API_BASE}/api/admin/page-sections?page=${encodeURIComponent(page)}`,{headers:authHeaders()});const data=await res.json();if(!res.ok)throw new Error(data.error||'Failed to load sections');pb2Items=Array.isArray(data)?data:[];renderList();if(pb2Items.length&&!el('sectionEditId')?.value)editPageSection(pb2Items[0].id)}catch(err){if(box)box.innerHTML=`<div class="pb2-empty pb2-status-error">${esc(err.message)}</div>`}}
function renderList(){const box=el('sectionsList');if(!box)return;if(!pb2Items.length){box.innerHTML='<div class="pb2-empty">No saved sections yet.<br>Use “Add Section”.</div>';return}box.innerHTML=pb2Items.sort((a,b)=>(+a.sortOrder||0)-(+b.sortOrder||0)).map(x=>`<div class="pb2-section-item ${el('sectionEditId')?.value===x.id?'active':''}" onclick="editPageSection('${esc(x.id)}')"><span>☷</span><div><strong>${esc(x.title||x.sectionKey||'Untitled')}</strong><small>${esc(x.sectionKey||'custom')}</small></div><button type="button" class="pb2-eye" title="${x.active?'Visible':'Hidden'}" onclick="event.stopPropagation();pb2ToggleSection('${esc(x.id)}')">${x.active?'◉':'○'}</button></div>`).join('')}
window.pb2ToggleSection=async function(id){const item=pb2Items.find(x=>x.id===id);if(!item)return;await fetch(`${API_BASE}/api/admin/page-sections`,{method:'POST',headers:authHeaders(),body:JSON.stringify({...item,active:!item.active,settings:typeof item.settings==='string'?JSON.parse(item.settings||'{}'):(item.settings||{})})});loadPageSections();pb2RefreshPreview()}
const oldEdit=window.editPageSection;
window.editPageSection=async function(id){const item=pb2Items.find(x=>x.id===id);if(!item){await loadPageSections();return}let settings={};try{settings=typeof item.settings==='string'?JSON.parse(item.settings||'{}'):(item.settings||{})}catch{};el('sectionEditId').value=item.id||'';el('sectionPage').value=item.page||el('sectionFilterPage').value;el('sectionKey').value=item.sectionKey||'custom';el('sectionType').value=item.sectionType||'custom';el('sectionTitle').value=item.title||'';el('sectionSubtitle').value=item.subtitle||'';el('sectionContent').value=item.content||'';el('sectionButtonText').value=item.buttonText||settings.buttonText||'';el('sectionButtonUrl').value=item.buttonUrl||settings.buttonUrl||'';el('sectionImage').value=item.mediaUrl||'';el('sectionVideo').value=settings.videoUrl||'';el('sectionBgColor').value=item.backgroundColor||'#ffffff';el('sectionBackgroundImage').value=item.backgroundImage||'';el('sectionTextColor').value=item.textColor||'#222222';el('sectionButtonColor').value=item.buttonColor||'#0f766e';el('sectionFontFamily').value=item.fontFamily||'';el('sectionFontSize').value=(item.fontSize||settings.fontSize||'').toString().replace('px','');el('sectionHeadingColor').value=item.headingColor||settings.headingColor||'#17324d';el('sectionHeadingFont').value=settings.headingFont||'';el('sectionHeadingSize').value=(settings.headingSize||'').toString().replace('px','');el('sectionBackgroundSize').value=settings.backgroundSize||'cover';el('sectionBackgroundPosition').value=settings.backgroundPosition||'center center';el('sectionOverlay').value=settings.overlay??35;el('sectionSortOrder').value=item.sortOrder||0;el('sectionActive').checked=!!item.active;el('sectionGradientStart').value=settings.gradientStart||'#ffffff';el('sectionGradientEnd').value=settings.gradientEnd||'#f8f3eb';el('sectionPaddingTop').value=(settings.paddingTop||'').toString().replace('px','');el('sectionPaddingBottom').value=(settings.paddingBottom||'').toString().replace('px','');el('sectionBorderRadius').value=(settings.borderRadius||'').toString().replace('px','');el('sectionShadow').value=settings.shadow||'';el('sectionAnimation').value=settings.animation||'';window.pb3ElementStyles=settings.elementStyles||{};window.pb3CustomElements=settings.customElements||[];window.pb3SelectedSelector='';loadCards(settings.cards||[]);renderList();pb2LivePreview();window.pb3RenderInspector?.()}
const oldSave=window.savePageSection;
window.savePageSection=async function(e){e.preventDefault();const status=el('pb2SaveStatus');if(status){status.textContent='Saving…';status.className=''};const settings={videoUrl:el('sectionVideo').value.trim(),gradientStart:el('sectionGradientStart').value,gradientEnd:el('sectionGradientEnd').value,paddingTop:pxValue('sectionPaddingTop'),paddingBottom:pxValue('sectionPaddingBottom'),borderRadius:pxValue('sectionBorderRadius'),shadow:el('sectionShadow').value,animation:el('sectionAnimation').value,cards:collectCards(),buttonText:el('sectionButtonText').value.trim(),buttonUrl:el('sectionButtonUrl').value.trim(),backgroundSize:el('sectionBackgroundSize').value,backgroundPosition:el('sectionBackgroundPosition').value,overlay:Number(el('sectionOverlay').value||35),headingColor:el('sectionHeadingColor').value,headingFont:el('sectionHeadingFont').value,headingSize:pxValue('sectionHeadingSize'),fontSize:pxValue('sectionFontSize'),elementStyles:window.pb3ElementStyles||{},customElements:window.pb3CustomElements||[]};const data={id:el('sectionEditId').value||'',page:el('sectionFilterPage').value,sectionKey:el('sectionKey').value,sectionType:el('sectionType').value,title:el('sectionTitle').value.trim(),subtitle:el('sectionSubtitle').value.trim(),content:el('sectionContent').value.trim(),buttonText:el('sectionButtonText').value.trim(),buttonUrl:el('sectionButtonUrl').value.trim(),mediaUrl:el('sectionImage').value.trim(),backgroundType:el('sectionBackgroundImage').value.trim()?'image':'color',backgroundColor:el('sectionBgColor').value,backgroundImage:el('sectionBackgroundImage').value.trim(),textColor:el('sectionTextColor').value,headingColor:el('sectionHeadingColor').value,buttonColor:el('sectionButtonColor').value,fontFamily:el('sectionFontFamily').value,fontSize:pxValue('sectionFontSize'),sortOrder:el('sectionSortOrder').value,active:el('sectionActive').checked,settings};try{const res=await fetch(`${API_BASE}/api/admin/page-sections`,{method:'POST',headers:authHeaders(),body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw new Error(result.error||'Save section failed');if(status){status.textContent='Saved';status.className='pb2-status-ok'};await loadPageSections();pb2RefreshPreview()}catch(err){if(status){status.textContent=err.message;status.className='pb2-status-error'};alert(err.message)}}
function bind(){document.querySelectorAll('.pb2-accordion-title').forEach(b=>b.addEventListener('click',()=>b.parentElement.classList.toggle('open')));document.querySelectorAll('#sectionForm input,#sectionForm textarea,#sectionForm select').forEach(x=>x.addEventListener('input',pb2LivePreview));el('pb2PreviewFrame')?.addEventListener('load',pb2LivePreview);pb2RefreshPreview()}
document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,400));
})();

/* CeyBreez Page Builder V3 — controlled visual element editor */
(function(){
  const $=id=>document.getElementById(id);
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const safe=s=>String(s||'').replace(/[^a-zA-Z0-9_-]/g,'');
  let selectedEl=null;

  function device(){ return window.pb3SelectedDevice||'desktop'; }
  function selectorFor(el, section){
    if(!el||el===section) return ':scope';
    if(el.dataset?.field) return `[data-field="${CSS.escape(el.dataset.field)}"]`;
    if(el.id) return `#${CSS.escape(el.id)}`;
    if(el.classList?.length){
      const cls=[...el.classList].filter(c=>!c.startsWith('pb3-')&&!c.startsWith('cms-'))[0];
      if(cls) return `.${CSS.escape(cls)}`;
    }
    const tag=el.tagName.toLowerCase();
    const peers=[...el.parentElement.children].filter(x=>x.tagName===el.tagName);
    return peers.length>1?`${tag}:nth-of-type(${peers.indexOf(el)+1})`:tag;
  }
  function currentSection(){
    const f=$('pb2PreviewFrame');
    const key=$('sectionKey')?.value;
    return f?.contentDocument?.querySelector(`[data-section="${CSS.escape(key||'')}"]`);
  }
  function styleRecord(create=true){
    const sel=window.pb3SelectedSelector;
    if(!sel) return null;
    const all=window.pb3ElementStyles||(window.pb3ElementStyles={});
    if(create&&!all[sel]) all[sel]={desktop:{},tablet:{},mobile:{}};
    if(all[sel]&&!all[sel][device()]) all[sel][device()]={};
    return all[sel]?.[device()]||null;
  }
  function applyRecord(el, rec){
    if(!el||!rec)return;
    const px=['width','maxWidth','height','minHeight','marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius'];
    px.forEach(k=>{el.style[k]=rec[k]!==undefined&&rec[k]!==''?`${rec[k]}px`:''});
    el.style.display=rec.hidden?'none':(rec.display||'');
    el.style.textAlign=rec.textAlign||'';
    el.style.objectFit=rec.objectFit||'';
    el.style.opacity=rec.opacity!==undefined?String(rec.opacity):'';
    el.style.transform=`translate(${num(rec.x)}px, ${num(rec.y)}px) scale(${rec.scale||1}) rotate(${num(rec.rotate)}deg)`;
    el.style.transformOrigin='center center';
    if(rec.alignSelf) el.style.alignSelf=rec.alignSelf;
  }
  function applyAllToPreview(){
    const section=currentSection(); if(!section)return;
    Object.entries(window.pb3ElementStyles||{}).forEach(([sel,byDevice])=>{
      let nodes=[]; try{nodes=sel===':scope'?[section]:[...section.querySelectorAll(sel)]}catch{}
      const merged={...(byDevice.desktop||{}),...(device()!=='desktop'?(byDevice[device()]||{}):{})};
      nodes.forEach(n=>applyRecord(n,merged));
    });
    renderCustomElements(section);
  }
  function renderCustomElements(section){
    section.querySelectorAll('[data-pb-custom="1"]').forEach(n=>n.remove());
    (window.pb3CustomElements||[]).forEach(item=>{
      if(item.sectionKey!==$('sectionKey')?.value)return;
      let n;
      if(item.type==='button'){n=document.createElement('a');n.href=item.url||'#';n.textContent=item.text||'Button';n.className='pb3-custom-button'}
      else if(item.type==='image'){n=document.createElement('img');n.src=item.url||'';n.alt=item.alt||'';n.className='pb3-custom-image'}
      else {n=document.createElement(item.type==='heading'?'h2':'p');n.textContent=item.text||'New text';n.className='pb3-custom-text'}
      n.dataset.pbCustom='1';n.dataset.pbId=item.id;
      n.style.position='relative';section.appendChild(n);
      const by=(window.pb3ElementStyles||{})[`[data-pb-id="${item.id}"]`];
      if(by){n.dataset.pbId=item.id;applyRecord(n,{...(by.desktop||{}),...(device()!=='desktop'?(by[device()]||{}):{})})}
    })
  }
  function injectSelectable(){
    const frame=$('pb2PreviewFrame'); const doc=frame?.contentDocument; if(!doc)return;
    let st=doc.getElementById('pb3-editor-style');
    if(!st){st=doc.createElement('style');st.id='pb3-editor-style';st.textContent=`body.pb3-editing [data-section] *{cursor:pointer} .pb3-selected{outline:2px solid #00a88f!important;outline-offset:3px!important;position:relative}.pb3-selected:after{content:attr(data-pb-label);position:absolute;left:0;top:-25px;background:#007f72;color:white;font:11px Arial;padding:4px 7px;border-radius:4px;z-index:2147483647;white-space:nowrap}.pb3-custom-button{display:inline-block;padding:10px 18px;background:#087f72;color:#fff;text-decoration:none;border-radius:7px;margin:8px}.pb3-custom-image{max-width:220px;height:auto}.pb3-custom-text{margin:8px}`;doc.head.appendChild(st)}
    doc.body.classList.add('pb3-editing');
    doc.addEventListener('click',onPreviewClick,true);
    applyAllToPreview();
  }
  function onPreviewClick(e){
    const section=e.target.closest('[data-section]');
    if(!section||section.dataset.section!==$('sectionKey')?.value)return;
    e.preventDefault();e.stopPropagation();
    selectedEl=e.target;
    section.querySelectorAll('.pb3-selected').forEach(n=>{n.classList.remove('pb3-selected');delete n.dataset.pbLabel});
    selectedEl.classList.add('pb3-selected');
    selectedEl.dataset.pbLabel=selectedEl.tagName.toLowerCase()+(selectedEl.dataset.field?` · ${selectedEl.dataset.field}`:'');
    window.pb3SelectedSelector=selectedEl.dataset.pbId?`[data-pb-id="${selectedEl.dataset.pbId}"]`:selectorFor(selectedEl,section);
    renderInspector();
  }
  function input(label,key,type='number',attrs=''){
    const r=styleRecord(false)||{}; const value=r[key]??(key==='scale'?1:key==='opacity'?1:'');
    return `<label>${label}<input data-pb3-key="${key}" type="${type}" value="${value}" ${attrs}></label>`;
  }
  function renderInspector(){
    const box=$('pb3Inspector'); if(!box)return;
    const sel=window.pb3SelectedSelector;
    if(!sel){box.innerHTML='<div class="pb3-hint">Live preview එකේ logo, text, image හෝ button එක click කරන්න.</div>';return}
    const r=styleRecord()||{};
    box.innerHTML=`<div class="pb3-selected-name"><b>Selected:</b><code>${sel}</code><button type="button" id="pb3ResetElement">Reset</button></div>
    <div class="pb3-grid2">${input('Width','width')}${input('Max width','maxWidth')}${input('Height','height')}${input('Min height','minHeight')}${input('Scale','scale','number','step="0.05" min="0.1" max="5"')}${input('Opacity','opacity','number','step="0.05" min="0" max="1"')}${input('Move X','x')}${input('Move Y','y')}${input('Rotate','rotate')}</div>
    <label>Text alignment<select data-pb3-key="textAlign"><option value="">Original</option><option>left</option><option>center</option><option>right</option></select></label>
    <label>Image fit<select data-pb3-key="objectFit"><option value="">Original</option><option>contain</option><option>cover</option><option>fill</option></select></label>
    <div class="pb3-subtitle">Margin</div><div class="pb3-grid4">${input('Top','marginTop')}${input('Right','marginRight')}${input('Bottom','marginBottom')}${input('Left','marginLeft')}</div>
    <div class="pb3-subtitle">Padding</div><div class="pb3-grid4">${input('Top','paddingTop')}${input('Right','paddingRight')}${input('Bottom','paddingBottom')}${input('Left','paddingLeft')}</div>
    <label class="pb3-check"><input data-pb3-key="hidden" type="checkbox" ${r.hidden?'checked':''}> Hide on ${device()}</label>`;
    box.querySelectorAll('[data-pb3-key]').forEach(n=>{
      const k=n.dataset.pb3Key;if(n.tagName==='SELECT')n.value=r[k]||'';
      n.addEventListener('input',()=>{const rec=styleRecord();rec[k]=n.type==='checkbox'?n.checked:(n.type==='number'?(n.value===''?'':Number(n.value)):n.value);applyAllToPreview()})
    });
    $('pb3ResetElement')?.addEventListener('click',()=>{const all=window.pb3ElementStyles||{};if(all[sel])delete all[sel][device()];renderInspector();pb2RefreshPreview()});
  }
  window.pb3RenderInspector=renderInspector;
  function addInspectorUI(){
    const settings=document.querySelector('.pb2-settings-panel'); if(!settings||$('pb3Inspector'))return;
    const wrap=document.createElement('div');wrap.className='pb3-visual-editor';wrap.innerHTML=`<div class="pb3-visual-head"><h3>Visual Element Editor</h3><span>Click inside preview</span></div><div class="pb3-device-row"><button data-device="desktop" class="active">Desktop</button><button data-device="tablet">Tablet</button><button data-device="mobile">Mobile</button></div><div id="pb3Inspector"></div><button type="button" class="pb2-btn pb2-btn-outline pb3-add" id="pb3AddElement">+ Add Element</button>`;
    settings.prepend(wrap);
    wrap.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>{window.pb3SelectedDevice=b.dataset.device;wrap.querySelectorAll('[data-device]').forEach(x=>x.classList.toggle('active',x===b));document.querySelector(`.pb2-devices button[onclick*="${b.dataset.device}"]`)?.click();renderInspector();applyAllToPreview()});
    $('pb3AddElement').onclick=addElement;
    renderInspector();
  }
  function addElement(){
    const type=prompt('Element type: text, heading, button, image','text');if(!['text','heading','button','image'].includes(type))return;
    const text=type==='image'?prompt('Image URL',''):prompt(type==='button'?'Button text':'Text','New element');if(text===null)return;
    const item={id:'pb'+Date.now(),sectionKey:$('sectionKey')?.value,type,text:type==='image'?'':text,url:type==='image'?text:(type==='button'?prompt('Button link','#'):'#')};
    window.pb3CustomElements.push(item);window.pb3SelectedSelector=`[data-pb-id="${item.id}"]`;window.pb3ElementStyles[window.pb3SelectedSelector]={desktop:{},tablet:{},mobile:{}};applyAllToPreview();renderInspector();
  }
  function patchDeviceButtons(){
    document.querySelectorAll('.pb2-devices button').forEach(b=>b.addEventListener('click',()=>{const m=(b.getAttribute('onclick')||'').match(/'(desktop|tablet|mobile)'/);if(m){window.pb3SelectedDevice=m[1];document.querySelectorAll('.pb3-device-row button').forEach(x=>x.classList.toggle('active',x.dataset.device===m[1]));renderInspector();setTimeout(applyAllToPreview,50)}}))
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{addInspectorUI();patchDeviceButtons();$('pb2PreviewFrame')?.addEventListener('load',()=>setTimeout(injectSelectable,250));injectSelectable()},900));
})();

/* =========================================================
   CeyBreez Page Builder V4 — Drag, Drop & Resize
   Works only by updating page-builder-admin-v2.js + CSS.
   Button destinations remain locked.
   ========================================================= */
(function(){
  const $ = id => document.getElementById(id);
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  let drag = null;
  let resize = null;

  function currentDevice(){
    return window.pb3SelectedDevice || 'desktop';
  }

  function currentSection(){
    const frame = $('pb2PreviewFrame');
    const key = $('sectionKey')?.value;
    return frame?.contentDocument?.querySelector(`[data-section="${CSS.escape(key || '')}"]`);
  }

  function selectedElement(){
    const section = currentSection();
    const sel = window.pb3SelectedSelector;
    if(!section || !sel) return null;
    try{
      return sel === ':scope' ? section : section.querySelector(sel);
    }catch{
      return null;
    }
  }

  function record(){
    const sel = window.pb3SelectedSelector;
    if(!sel) return null;
    const all = window.pb3ElementStyles || (window.pb3ElementStyles = {});
    if(!all[sel]) all[sel] = {desktop:{},tablet:{},mobile:{}};
    if(!all[sel][currentDevice()]) all[sel][currentDevice()] = {};
    return all[sel][currentDevice()];
  }

  function num(v, fallback=0){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function saveTransformFromElement(el){
    if(!el) return;
    const rec = record();
    if(!rec) return;

    const rect = el.getBoundingClientRect();
    const parentRect = el.parentElement?.getBoundingClientRect();

    if(rect.width > 0) rec.width = Math.round(rect.width);
    if(rect.height > 0) rec.height = Math.round(rect.height);

    if(parentRect){
      rec.x = Math.round(rect.left - parentRect.left);
      rec.y = Math.round(rect.top - parentRect.top);
    }
  }

  function ensureEditorLayer(){
    const frame = $('pb2PreviewFrame');
    const doc = frame?.contentDocument;
    if(!doc) return;

    let style = doc.getElementById('pb4-drag-style');
    if(!style){
      style = doc.createElement('style');
      style.id = 'pb4-drag-style';
      style.textContent = `
        body.pb4-drag-mode [data-section] *{
          box-sizing:border-box;
        }
        .pb4-draggable{
          position:relative !important;
          cursor:move !important;
          touch-action:none !important;
          user-select:none !important;
        }
        .pb4-resize-handle{
          position:absolute;
          width:12px;
          height:12px;
          background:#00a88f;
          border:2px solid #fff;
          border-radius:3px;
          z-index:2147483647;
          box-shadow:0 1px 4px rgba(0,0,0,.35);
        }
        .pb4-resize-handle[data-dir="nw"]{left:-8px;top:-8px;cursor:nwse-resize}
        .pb4-resize-handle[data-dir="ne"]{right:-8px;top:-8px;cursor:nesw-resize}
        .pb4-resize-handle[data-dir="sw"]{left:-8px;bottom:-8px;cursor:nesw-resize}
        .pb4-resize-handle[data-dir="se"]{right:-8px;bottom:-8px;cursor:nwse-resize}
        .pb4-link-locked{
          pointer-events:none !important;
        }
      `;
      doc.head.appendChild(style);
    }

    doc.body.classList.add('pb4-drag-mode');
    bindCurrentSelected();
  }

  function removeHandles(doc){
    doc?.querySelectorAll('.pb4-resize-handle').forEach(h => h.remove());
    doc?.querySelectorAll('.pb4-draggable').forEach(n => n.classList.remove('pb4-draggable'));
  }

  function bindCurrentSelected(){
    const frame = $('pb2PreviewFrame');
    const doc = frame?.contentDocument;
    const el = selectedElement();
    if(!doc) return;

    removeHandles(doc);
    if(!el) return;

    el.classList.add('pb4-draggable');

    if(el.tagName === 'A' || el.closest('a')){
      el.classList.add('pb4-link-locked');
    }

    ['nw','ne','sw','se'].forEach(dir => {
      const h = doc.createElement('span');
      h.className = 'pb4-resize-handle';
      h.dataset.dir = dir;
      h.addEventListener('pointerdown', onResizeStart, true);
      el.appendChild(h);
    });

    el.addEventListener('pointerdown', onDragStart, true);
  }

  function onDragStart(e){
    if(e.target.classList.contains('pb4-resize-handle')) return;

    const el = selectedElement();
    if(!el || e.currentTarget !== el) return;

    e.preventDefault();
    e.stopPropagation();

    const rec = record();
    const rect = el.getBoundingClientRect();

    drag = {
      el,
      startX:e.clientX,
      startY:e.clientY,
      baseX:num(rec.x),
      baseY:num(rec.y),
      width:rect.width,
      height:rect.height
    };

    const doc = el.ownerDocument;
    doc.addEventListener('pointermove', onDragMove, true);
    doc.addEventListener('pointerup', onDragEnd, true);
  }

  function onDragMove(e){
    if(!drag) return;
    e.preventDefault();

    const rec = record();
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    rec.x = Math.round(drag.baseX + dx);
    rec.y = Math.round(drag.baseY + dy);

    drag.el.style.transform =
      `translate(${rec.x}px, ${rec.y}px) scale(${rec.scale || 1}) rotate(${num(rec.rotate)}deg)`;

    window.pb3RenderInspector?.();
  }

  function onDragEnd(){
    if(!drag) return;
    const doc = drag.el.ownerDocument;
    doc.removeEventListener('pointermove', onDragMove, true);
    doc.removeEventListener('pointerup', onDragEnd, true);
    drag = null;
  }

  function onResizeStart(e){
    e.preventDefault();
    e.stopPropagation();

    const el = selectedElement();
    if(!el) return;

    const rect = el.getBoundingClientRect();
    resize = {
      el,
      dir:e.currentTarget.dataset.dir,
      startX:e.clientX,
      startY:e.clientY,
      startW:rect.width,
      startH:rect.height,
      ratio:rect.width / Math.max(rect.height,1)
    };

    const doc = el.ownerDocument;
    doc.addEventListener('pointermove', onResizeMove, true);
    doc.addEventListener('pointerup', onResizeEnd, true);
  }

  function onResizeMove(e){
    if(!resize) return;
    e.preventDefault();

    const dx = e.clientX - resize.startX;
    const dy = e.clientY - resize.startY;
    let w = resize.startW;
    let h = resize.startH;

    if(resize.dir.includes('e')) w += dx;
    if(resize.dir.includes('w')) w -= dx;
    if(resize.dir.includes('s')) h += dy;
    if(resize.dir.includes('n')) h -= dy;

    w = clamp(w,30,2000);
    h = clamp(h,20,1600);

    if(e.shiftKey){
      h = w / resize.ratio;
    }

    const rec = record();
    rec.width = Math.round(w);
    rec.height = Math.round(h);

    resize.el.style.width = `${rec.width}px`;
    resize.el.style.height = `${rec.height}px`;
    resize.el.style.maxWidth = 'none';

    window.pb3RenderInspector?.();
  }

  function onResizeEnd(){
    if(!resize) return;
    const doc = resize.el.ownerDocument;
    doc.removeEventListener('pointermove', onResizeMove, true);
    doc.removeEventListener('pointerup', onResizeEnd, true);
    resize = null;
  }

  function addModeToggle(){
    const host = document.querySelector('.pb3-visual-editor');
    if(!host || $('pb4ModeToggle')) return;

    const row = document.createElement('div');
    row.className = 'pb4-mode-row';
    row.innerHTML = `
      <button type="button" id="pb4ModeToggle" class="active">Drag & Resize: ON</button>
      <span>Drag selected element. Use corner handles to resize. Hold Shift to keep ratio.</span>
    `;
    host.insertBefore(row, host.querySelector('#pb3Inspector'));

    $('pb4ModeToggle').addEventListener('click', () => {
      const frame = $('pb2PreviewFrame');
      const doc = frame?.contentDocument;
      const on = !$('pb4ModeToggle').classList.toggle('off');
      $('pb4ModeToggle').classList.toggle('active', on);
      $('pb4ModeToggle').textContent = `Drag & Resize: ${on ? 'ON' : 'OFF'}`;
      if(on){
        doc?.body.classList.add('pb4-drag-mode');
        bindCurrentSelected();
      }else{
        doc?.body.classList.remove('pb4-drag-mode');
        removeHandles(doc);
      }
    });
  }

  function patchPreviewSelection(){
    const frame = $('pb2PreviewFrame');
    const doc = frame?.contentDocument;
    if(!doc || doc.__pb4Bound) return;
    doc.__pb4Bound = true;

    doc.addEventListener('click', () => {
      setTimeout(bindCurrentSelected, 0);
    }, true);
  }

  function refresh(){
    addModeToggle();
    ensureEditorLayer();
    patchPreviewSelection();
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(refresh, 1200);
    $('pb2PreviewFrame')?.addEventListener('load', () => setTimeout(refresh, 350));
  });

  const oldRender = window.pb3RenderInspector;
  window.pb3RenderInspector = function(){
    oldRender?.();
    setTimeout(bindCurrentSelected, 0);
  };
})();
