/* CeyBreez Page Builder — Clean Rebuild
   One selection engine, one inspector, one preview binding.
*/
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PAGE_URLS = {
    home: '../index.html', villas: '../villas.html', homestays: '../homestays.html',
    apartments: '../apartments.html', tours: '../tours.html', services: '../services.html',
    contact: '../contact.html', privacy: '../privacy.html', terms: '../terms.html',
    'tour-details': '../tour-details.html', '404': '../404.html'
  };

  const state = {
    items: [], selectedId: '', selectedSelector: '', selectedDevice: 'desktop',
    elementStyles: {}, customElements: [], previewController: null, initialized: false
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
  const cssEscape = (value) => window.CSS?.escape ? CSS.escape(String(value || '')) : String(value || '').replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  const px = (id) => { const v = $(id)?.value; return v === '' || v == null ? '' : `${Number(v)}px`; };
  const stripPx = (v) => String(v || '').replace('px','');
  const parseSettings = (raw) => {
    try { return typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {}); }
    catch { return {}; }
  };
  const currentPage = () => $('sectionFilterPage')?.value || 'home';
  const currentItem = () => state.items.find(x => String(x.id) === String(state.selectedId));
  const frameDoc = () => $('pb2PreviewFrame')?.contentDocument || null;
  const selectedSection = () => {
    const doc = frameDoc();
    const key = $('sectionKey')?.value || currentItem()?.sectionKey;
    return doc?.querySelector(`[data-section="${cssEscape(key)}"]`) || null;
  };
  const selectedElement = () => {
    const section = selectedSection();
    if (!section || !state.selectedSelector) return null;
    try { return state.selectedSelector === ':scope' ? section : section.querySelector(state.selectedSelector); }
    catch { return null; }
  };
  const record = () => {
    if (!state.selectedSelector) return null;
    state.elementStyles[state.selectedSelector] ||= { desktop:{}, tablet:{}, mobile:{} };
    state.elementStyles[state.selectedSelector][state.selectedDevice] ||= {};
    return state.elementStyles[state.selectedSelector][state.selectedDevice];
  };

  function selectorFor(el, section) {
    if (el === section) return ':scope';
    if (el.dataset.pbId) return `[data-pb-id="${cssEscape(el.dataset.pbId)}"]`;
    if (el.dataset.field) return `[data-field="${cssEscape(el.dataset.field)}"]`;
    if (el.id) return `#${cssEscape(el.id)}`;
    const path = [];
    let node = el;
    while (node && node !== section && path.length < 5) {
      let part = node.tagName.toLowerCase();
      const classes = [...node.classList].filter(c => !c.startsWith('pbx-')).slice(0,2);
      if (classes.length) part += '.' + classes.map(cssEscape).join('.');
      const siblings = node.parentElement ? [...node.parentElement.children].filter(n => n.tagName === node.tagName) : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node)+1})`;
      path.unshift(part);
      node = node.parentElement;
    }
    return path.join(' > ');
  }

  function ensureInspector() {
    if ($('pbxInspector')) return;
    const form = $('sectionForm');
    const head = form?.querySelector('.pb2-panel-head');
    if (!form || !head) return;
    const box = document.createElement('div');
    box.id = 'pbxInspector';
    box.className = 'pbx-inspector';
    box.innerHTML = `
      <div class="pbx-inspector-head"><div><strong>Visual Element Editor</strong><small id="pbxSelectedName">Click an element in preview</small></div><button type="button" id="pbxClearSelection">Clear</button></div>
      <div class="pbx-device-tabs">
        <button type="button" data-pbx-device="desktop" class="active">Desktop</button>
        <button type="button" data-pbx-device="tablet">Tablet</button>
        <button type="button" data-pbx-device="mobile">Mobile</button>
      </div>
      <div id="pbxEmpty" class="pbx-empty">Click a heading, paragraph, image or button in the preview.</div>
      <div id="pbxFields" class="pbx-fields hidden">
        <label>Text / Label<textarea id="pbxText" rows="3"></textarea></label>
        <label>Link URL<input id="pbxHref" placeholder="https:// or page.html"></label>
        <label>Image URL<input id="pbxSrc" placeholder="Image URL"></label>
        <div class="pbx-grid2"><label>Text Colour<input id="pbxColor" type="color" value="#222222"></label><label>Background<input id="pbxBackground" type="color" value="#ffffff"></label></div>
        <div class="pbx-grid2"><label>Font Size<input id="pbxFontSize" type="number" min="8"></label><label>Font Weight<select id="pbxFontWeight"><option value="">Default</option><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semi-bold</option><option value="700">Bold</option></select></label></div>
        <label>Alignment<select id="pbxTextAlign"><option value="">Default</option><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>
        <div class="pbx-grid2"><label>Width px<input id="pbxWidth" type="number" min="0"></label><label>Height px<input id="pbxHeight" type="number" min="0"></label></div>
        <div class="pbx-grid2"><label>Move X<input id="pbxX" type="number"></label><label>Move Y<input id="pbxY" type="number"></label></div>
        <div class="pbx-grid4"><label>Margin T<input id="pbxMt" type="number"></label><label>Margin R<input id="pbxMr" type="number"></label><label>Margin B<input id="pbxMb" type="number"></label><label>Margin L<input id="pbxMl" type="number"></label></div>
        <div class="pbx-grid4"><label>Padding T<input id="pbxPt" type="number"></label><label>Padding R<input id="pbxPr" type="number"></label><label>Padding B<input id="pbxPb" type="number"></label><label>Padding L<input id="pbxPl" type="number"></label></div>
        <div class="pbx-grid2"><label>Radius<input id="pbxRadius" type="number" min="0"></label><label>Opacity<input id="pbxOpacity" type="number" min="0" max="1" step="0.05"></label></div>
        <label class="pbx-check"><input id="pbxHidden" type="checkbox"> Hide on this device</label>
        <div class="pbx-actions"><button type="button" id="pbxResetDevice">Reset Device Style</button><button type="button" id="pbxDeleteCustom" class="danger">Delete Added Element</button></div>
      </div>
      <div class="pbx-add-row"><button type="button" data-pbx-add="heading">+ Heading</button><button type="button" data-pbx-add="text">+ Text</button><button type="button" data-pbx-add="button">+ Button</button><button type="button" data-pbx-add="image">+ Image</button></div>
    `;
    head.insertAdjacentElement('afterend', box);
    bindInspector();
  }

  const fieldMap = {
    pbxText:'text', pbxHref:'href', pbxSrc:'src', pbxColor:'color', pbxBackground:'backgroundColor',
    pbxFontSize:'fontSize', pbxFontWeight:'fontWeight', pbxTextAlign:'textAlign', pbxWidth:'width',
    pbxHeight:'height', pbxX:'x', pbxY:'y', pbxMt:'marginTop', pbxMr:'marginRight', pbxMb:'marginBottom',
    pbxMl:'marginLeft', pbxPt:'paddingTop', pbxPr:'paddingRight', pbxPb:'paddingBottom', pbxPl:'paddingLeft',
    pbxRadius:'borderRadius', pbxOpacity:'opacity'
  };

  function bindInspector() {
    Object.keys(fieldMap).forEach(id => {
      $(id)?.addEventListener('input', () => {
        const rec = record(); if (!rec) return;
        const key = fieldMap[id]; const value = $(id).value;
        rec[key] = ['fontSize','width','height','x','y','marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','opacity'].includes(key)
          ? (value === '' ? '' : Number(value)) : value;
        applySelectedRecord();
      });
    });
    $('pbxHidden')?.addEventListener('change', () => { const rec=record(); if(rec){rec.hidden=$('pbxHidden').checked;applySelectedRecord();} });
    $('pbxClearSelection')?.addEventListener('click', clearSelection);
    $('pbxResetDevice')?.addEventListener('click', () => {
      if (!state.selectedSelector) return;
      state.elementStyles[state.selectedSelector][state.selectedDevice] = {};
      renderInspector(); applyAllToPreview();
    });
    $('pbxDeleteCustom')?.addEventListener('click', deleteSelectedCustom);
    document.querySelectorAll('[data-pbx-device]').forEach(btn => btn.addEventListener('click', () => setDevice(btn.dataset.pbxDevice)));
    document.querySelectorAll('[data-pbx-add]').forEach(btn => btn.addEventListener('click', () => addCustom(btn.dataset.pbxAdd)));
  }

  function renderInspector() {
    ensureInspector();
    const rec = record();
    const el = selectedElement();
    $('pbxEmpty')?.classList.toggle('hidden', !!el);
    $('pbxFields')?.classList.toggle('hidden', !el);
    if (!el || !rec) { if($('pbxSelectedName')) $('pbxSelectedName').textContent='Click an element in preview'; return; }
    $('pbxSelectedName').textContent = state.selectedSelector;
    const values = {
      pbxText: rec.text ?? (['INPUT','TEXTAREA'].includes(el.tagName) ? el.value : el.textContent.trim()),
      pbxHref: rec.href ?? (el.getAttribute('href') || ''), pbxSrc: rec.src ?? (el.getAttribute('src') || ''),
      pbxColor: rec.color || '#222222', pbxBackground: rec.backgroundColor || '#ffffff',
      pbxFontSize: rec.fontSize ?? '', pbxFontWeight: rec.fontWeight || '', pbxTextAlign: rec.textAlign || '',
      pbxWidth: rec.width ?? '', pbxHeight: rec.height ?? '', pbxX: rec.x ?? '', pbxY: rec.y ?? '',
      pbxMt: rec.marginTop ?? '', pbxMr: rec.marginRight ?? '', pbxMb: rec.marginBottom ?? '', pbxMl: rec.marginLeft ?? '',
      pbxPt: rec.paddingTop ?? '', pbxPr: rec.paddingRight ?? '', pbxPb: rec.paddingBottom ?? '', pbxPl: rec.paddingLeft ?? '',
      pbxRadius: rec.borderRadius ?? '', pbxOpacity: rec.opacity ?? ''
    };
    Object.entries(values).forEach(([id,v]) => { if($(id)) $(id).value = v; });
    $('pbxHidden').checked = !!rec.hidden;
    const custom = el.dataset.pbCustom === '1';
    $('pbxDeleteCustom').style.display = custom ? '' : 'none';
  }

  function applyRecord(el, rec) {
    if (!el || !rec) return;
    if (rec.text !== undefined) { if(['INPUT','TEXTAREA'].includes(el.tagName)) el.value=rec.text; else el.textContent=rec.text; }
    if (rec.href !== undefined && el.matches('a,button')) el.setAttribute('href', rec.href || '#');
    if (rec.src !== undefined && el.matches('img,video,source')) el.setAttribute('src', rec.src || '');
    const pxKeys = ['fontSize','width','height','marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius'];
    pxKeys.forEach(k => { el.style[k] = rec[k] === '' || rec[k] == null ? '' : `${Number(rec[k])}px`; });
    ['color','backgroundColor','fontWeight','textAlign'].forEach(k => { el.style[k] = rec[k] || ''; });
    el.style.opacity = rec.opacity === '' || rec.opacity == null ? '' : String(rec.opacity);
    el.style.display = rec.hidden ? 'none' : '';
    el.style.transform = `translate(${Number(rec.x)||0}px, ${Number(rec.y)||0}px)`;
  }

  function mergedRecord(byDevice) {
    return Object.assign({}, byDevice?.desktop || {}, state.selectedDevice !== 'desktop' ? (byDevice?.[state.selectedDevice] || {}) : {});
  }
  function applySelectedRecord() { const el=selectedElement(); const by=state.elementStyles[state.selectedSelector]; if(el&&by) applyRecord(el, mergedRecord(by)); }
  function applyAllToPreview() {
    const section = selectedSection(); if(!section) return;
    renderCustomElements(section);
    Object.entries(state.elementStyles).forEach(([selector, byDevice]) => {
      let nodes=[]; try { nodes = selector === ':scope' ? [section] : [...section.querySelectorAll(selector)]; } catch { return; }
      nodes.forEach(n => applyRecord(n, mergedRecord(byDevice)));
    });
    markSelected();
  }

  function renderCustomElements(section) {
    section.querySelectorAll('[data-pb-custom="1"]').forEach(n => n.remove());
    state.customElements.filter(x => x.sectionKey === ($('sectionKey')?.value || '')).forEach(item => {
      let n;
      if(item.type==='button'){n=document.createElement('a');n.href=item.url||'#';n.textContent=item.text||'Button';n.className='cms-custom-button';}
      else if(item.type==='image'){n=document.createElement('img');n.src=item.url||'';n.alt=item.alt||'';n.className='cms-custom-image';}
      else {n=document.createElement(item.type==='heading'?'h2':'p');n.textContent=item.text|| (item.type==='heading'?'New Heading':'New text');n.className='cms-custom-text';}
      n.dataset.pbCustom='1'; n.dataset.pbId=item.id; section.appendChild(n);
    });
  }

  function addCustom(type) {
    const key=$('sectionKey')?.value; if(!key){alert('Select a section first.');return;}
    const id=`pb-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    state.customElements.push({id,sectionKey:key,type,text:type==='heading'?'New Heading':type==='button'?'Button':'New text',url:'#'});
    state.selectedSelector=`[data-pb-id="${id}"]`;
    state.elementStyles[state.selectedSelector]={desktop:{},tablet:{},mobile:{}};
    applyAllToPreview(); renderInspector();
  }
  function deleteSelectedCustom() {
    const el=selectedElement(); if(!el?.dataset.pbId)return;
    const id=el.dataset.pbId; state.customElements=state.customElements.filter(x=>x.id!==id); delete state.elementStyles[state.selectedSelector]; clearSelection(); applyAllToPreview();
  }

  function discoverPreviewSections() {
    const doc=frameDoc(); if(!doc)return;
    const savedKeys=new Set(state.items.filter(x=>!x.__virtual).map(x=>String(x.sectionKey)));
    const virtual=[...doc.querySelectorAll('[data-section]')].filter(n=>!savedKeys.has(String(n.dataset.section))).map((node,index)=>{
      const key=node.dataset.section;
      const title=node.querySelector('[data-field="title"],h1,h2,h3')?.textContent?.trim() || key;
      const subtitle=node.querySelector('[data-field="subtitle"]')?.textContent?.trim() || '';
      const content=node.querySelector('[data-field="content"],p')?.textContent?.trim() || '';
      const button=node.querySelector('[data-field="button"]');
      const image=node.querySelector('[data-field="image"],img');
      return {id:`local:${key}`,__virtual:true,page:currentPage(),sectionKey:key,sectionType:'existing',title,subtitle,content,
        buttonText:button?.textContent?.trim()||'',buttonUrl:button?.getAttribute('href')||'',mediaUrl:image?.getAttribute('src')||'',
        backgroundColor:'#ffffff',textColor:'#222222',headingColor:'#17324d',buttonColor:'#0f766e',sortOrder:index,active:true,settings:{}};
    });
    state.items=[...state.items.filter(x=>!x.__virtual),...virtual]; renderList();
  }

  function installPreviewEditor() {
    const doc=frameDoc(); if(!doc)return;
    discoverPreviewSections();
    state.previewController?.abort(); state.previewController=new AbortController(); const signal=state.previewController.signal;
    let style=doc.getElementById('pbx-editor-style');
    if(!style){style=doc.createElement('style');style.id='pbx-editor-style';style.textContent=`body.pbx-editing [data-section],body.pbx-editing [data-section] *{cursor:pointer!important}.pbx-selected{outline:3px solid #00a88f!important;outline-offset:3px!important;position:relative!important}.pbx-selected:after{content:'Editing';position:absolute;left:0;top:-25px;background:#006f66;color:#fff;font:11px Arial;padding:4px 7px;border-radius:4px;z-index:2147483647}.cms-custom-button{display:inline-block;padding:10px 18px;background:#087f72;color:#fff;text-decoration:none;border-radius:7px;margin:8px}.cms-custom-image{max-width:260px;height:auto}.cms-custom-text{margin:8px}`;doc.head.appendChild(style);}
    doc.body.classList.add('pbx-editing');
    doc.addEventListener('click', e => {
      const section=e.target.closest('[data-section]'); if(!section)return;
      e.preventDefault(); e.stopPropagation();
      const key=section.dataset.section; const item=state.items.find(x=>x.sectionKey===key);
      if(item && String(item.id)!==String(state.selectedId)) editPageSection(item.id, false);
      const target=e.target.closest('a,button,img,h1,h2,h3,h4,p,span,div,section') || section;
      state.selectedSelector=selectorFor(target,section); markSelected(target); renderInspector();
    },{capture:true,signal});
    applyAllToPreview();
  }

  function markSelected(forceEl) {
    const doc=frameDoc(); if(!doc)return;
    doc.querySelectorAll('.pbx-selected').forEach(n=>n.classList.remove('pbx-selected'));
    const el=forceEl||selectedElement(); if(el)el.classList.add('pbx-selected');
  }
  function clearSelection(){state.selectedSelector='';markSelected();renderInspector();}

  function setDevice(device) {
    state.selectedDevice=device;
    const wrap=$('pb2PreviewFrameWrap'); if(wrap)wrap.className=`pb2-preview-frame-wrap ${device}`;
    document.querySelectorAll('.pb2-devices button').forEach(b=>b.classList.toggle('active',(b.dataset.device||b.getAttribute('onclick')||'').includes(device)));
    document.querySelectorAll('[data-pbx-device]').forEach(b=>b.classList.toggle('active',b.dataset.pbxDevice===device));
    applyAllToPreview(); renderInspector();
  }

  window.pb2SetDevice=(device)=>setDevice(device);
  window.pb2RefreshPreview=()=>{const f=$('pb2PreviewFrame');if(f)f.src=`${PAGE_URLS[currentPage()]||PAGE_URLS.home}?pbpreview=${Date.now()}`;};
  window.pb2ChangePage=(page)=>{if($('sectionPage'))$('sectionPage').value=page;state.selectedId='';clearSelection();loadPageSections();window.pb2RefreshPreview();};
  window.pb2NewSection=()=>{resetSectionForm();$('sectionPage').value=currentPage();$('sectionKey').value='custom';state.selectedId='';clearSelection();};
  window.pb2ResetSelectedSection=()=>{if(confirm('Clear the selected form? Saved data remains until Save is pressed.'))window.pb2NewSection();};
  window.pb2SaveCurrentSection=()=>$('sectionForm')?.requestSubmit();

  window.loadPageSections=async function(){
    const box=$('sectionsList'); if(box)box.innerHTML='<div class="pb2-empty">Loading sections…</div>';
    try{
      const res=await fetch(`${API_BASE}/api/admin/page-sections?page=${encodeURIComponent(currentPage())}`,{headers:authHeaders()});
      const data=await res.json(); if(!res.ok)throw new Error(data.error||'Failed to load sections');
      state.items=Array.isArray(data)?data:[]; renderList();
      if(state.items.length && !state.selectedId) await editPageSection(state.items[0].id,false);
    }catch(err){if(box)box.innerHTML=`<div class="pb2-empty pb2-status-error">${esc(err.message)}</div>`;}
  };

  function renderList(){
    const box=$('sectionsList'); if(!box)return;
    if(!state.items.length){box.innerHTML='<div class="pb2-empty">No saved sections for this page.</div>';return;}
    box.innerHTML=[...state.items].sort((a,b)=>(+a.sortOrder||0)-(+b.sortOrder||0)).map(x=>`
      <div class="pb2-section-item ${String(state.selectedId)===String(x.id)?'active':''}" data-id="${esc(x.id)}">
        <span>☷</span><div><strong>${esc(x.title||x.sectionKey||'Untitled')}</strong><small>${esc(x.sectionKey||'custom')}</small></div>
        <button type="button" class="pb2-eye" title="${x.active?'Visible':'Hidden'}">${x.active?'◉':'○'}</button>
      </div>`).join('');
    box.querySelectorAll('.pb2-section-item').forEach(row=>{
      row.addEventListener('click',()=>editPageSection(row.dataset.id));
      row.querySelector('.pb2-eye').addEventListener('click',e=>{e.stopPropagation();toggleSection(row.dataset.id);});
    });
  }

  async function toggleSection(id){
    const item=state.items.find(x=>String(x.id)===String(id)); if(!item)return;
    if(item.__virtual){alert('This section is not saved yet. Select it and press Save Changes first.');return;}
    const body={...item,active:!item.active,settings:parseSettings(item.settings)};
    const res=await fetch(`${API_BASE}/api/admin/page-sections`,{method:'POST',headers:authHeaders(),body:JSON.stringify(body)});
    if(!res.ok){const d=await res.json().catch(()=>({}));alert(d.error||'Unable to update section');return;}
    await loadPageSections(); window.pb2RefreshPreview();
  }

  window.editPageSection=async function(id, scroll=true){
    const item=state.items.find(x=>String(x.id)===String(id)); if(!item)return;
    const s=parseSettings(item.settings); state.selectedId=item.id; state.elementStyles=s.elementStyles||{}; state.customElements=s.customElements||[]; state.selectedSelector='';
    const vals={sectionEditId:item.__virtual?'':(item.id||''),sectionPage:item.page||currentPage(),sectionKey:item.sectionKey||'custom',sectionType:item.sectionType||'custom',sectionTitle:item.title||'',sectionSubtitle:item.subtitle||'',sectionContent:item.content||'',sectionButtonText:item.buttonText||s.buttonText||'',sectionButtonUrl:item.buttonUrl||s.buttonUrl||'',sectionImage:item.mediaUrl||'',sectionVideo:s.videoUrl||'',sectionBgColor:item.backgroundColor||'#ffffff',sectionBackgroundImage:item.backgroundImage||'',sectionTextColor:item.textColor||'#222222',sectionButtonColor:item.buttonColor||'#0f766e',sectionFontFamily:item.fontFamily||'',sectionFontSize:stripPx(item.fontSize||s.fontSize),sectionHeadingColor:item.headingColor||s.headingColor||'#17324d',sectionHeadingFont:s.headingFont||'',sectionHeadingSize:stripPx(s.headingSize),sectionBackgroundSize:s.backgroundSize||'cover',sectionBackgroundPosition:s.backgroundPosition||'center center',sectionOverlay:s.overlay??35,sectionSortOrder:item.sortOrder||0,sectionGradientStart:s.gradientStart||'#ffffff',sectionGradientEnd:s.gradientEnd||'#f8f3eb',sectionPaddingTop:stripPx(s.paddingTop),sectionPaddingBottom:stripPx(s.paddingBottom),sectionBorderRadius:stripPx(s.borderRadius),sectionShadow:s.shadow||'',sectionAnimation:s.animation||''};
    Object.entries(vals).forEach(([id,v])=>{if($(id))$(id).value=v;}); $('sectionActive').checked=!!item.active; loadCards(s.cards||[]); renderList(); renderInspector(); applySectionFormPreview(); applyAllToPreview(); if(scroll)$('sectionForm')?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.savePageSection=async function(e){
    e?.preventDefault(); const status=$('pb2SaveStatus'); if(status){status.textContent='Saving…';status.className='';}
    const settings={videoUrl:$('sectionVideo').value.trim(),gradientStart:$('sectionGradientStart').value,gradientEnd:$('sectionGradientEnd').value,paddingTop:px('sectionPaddingTop'),paddingBottom:px('sectionPaddingBottom'),borderRadius:px('sectionBorderRadius'),shadow:$('sectionShadow').value,animation:$('sectionAnimation').value,cards:collectCards(),buttonText:$('sectionButtonText').value.trim(),buttonUrl:$('sectionButtonUrl').value.trim(),backgroundSize:$('sectionBackgroundSize').value,backgroundPosition:$('sectionBackgroundPosition').value,overlay:Number($('sectionOverlay').value||35),headingColor:$('sectionHeadingColor').value,headingFont:$('sectionHeadingFont').value,headingSize:px('sectionHeadingSize'),fontSize:px('sectionFontSize'),elementStyles:state.elementStyles,customElements:state.customElements};
    const data={id:$('sectionEditId').value||'',page:currentPage(),sectionKey:$('sectionKey').value,sectionType:$('sectionType').value,title:$('sectionTitle').value.trim(),subtitle:$('sectionSubtitle').value.trim(),content:$('sectionContent').value.trim(),buttonText:$('sectionButtonText').value.trim(),buttonUrl:$('sectionButtonUrl').value.trim(),mediaUrl:$('sectionImage').value.trim(),backgroundType:$('sectionBackgroundImage').value.trim()?'image':'color',backgroundColor:$('sectionBgColor').value,backgroundImage:$('sectionBackgroundImage').value.trim(),textColor:$('sectionTextColor').value,headingColor:$('sectionHeadingColor').value,buttonColor:$('sectionButtonColor').value,fontFamily:$('sectionFontFamily').value,fontSize:px('sectionFontSize'),sortOrder:$('sectionSortOrder').value,active:$('sectionActive').checked,settings};
    try{const res=await fetch(`${API_BASE}/api/admin/page-sections`,{method:'POST',headers:authHeaders(),body:JSON.stringify(data)});const out=await res.json();if(!res.ok)throw new Error(out.error||'Save failed');if(status){status.textContent='Saved';status.className='pb2-status-ok';}await loadPageSections();window.pb2RefreshPreview();}
    catch(err){if(status){status.textContent=err.message;status.className='pb2-status-error';}alert(err.message);}
  };

  function applySectionFormPreview(){
    const target=selectedSection();if(!target)return;
    const set=(field,value)=>{const n=target.querySelector(`[data-field="${field}"]`);if(n&&value!=='')n.textContent=value;};
    set('title',$('sectionTitle')?.value||'');set('subtitle',$('sectionSubtitle')?.value||'');set('content',$('sectionContent')?.value||'');
    const btn=target.querySelector('[data-field="button"]');if(btn){if($('sectionButtonText')?.value)btn.textContent=$('sectionButtonText').value;if($('sectionButtonUrl')?.value)btn.href=$('sectionButtonUrl').value;}
    const img=target.querySelector('[data-field="image"]');if(img&&$('sectionImage')?.value)img.src=$('sectionImage').value;
    const bg=$('sectionBackgroundImage')?.value;if(bg){const o=Number($('sectionOverlay')?.value||35)/100;target.style.backgroundImage=`linear-gradient(rgba(0,0,0,${o}),rgba(0,0,0,${o})),url('${bg}')`;}
    else target.style.background=$('sectionBgColor')?.value||'';
    target.style.backgroundSize=$('sectionBackgroundSize')?.value||'cover';target.style.backgroundPosition=$('sectionBackgroundPosition')?.value||'center center';target.style.color=$('sectionTextColor')?.value||'';target.style.fontFamily=$('sectionFontFamily')?.value||'';target.style.fontSize=px('sectionFontSize');target.style.paddingTop=px('sectionPaddingTop');target.style.paddingBottom=px('sectionPaddingBottom');target.style.borderRadius=px('sectionBorderRadius');
    target.querySelectorAll('h1,h2,h3').forEach(h=>{h.style.color=$('sectionHeadingColor')?.value||'';h.style.fontFamily=$('sectionHeadingFont')?.value||'';h.style.fontSize=px('sectionHeadingSize');});
  }
  window.pb2LivePreview=()=>{applySectionFormPreview();applyAllToPreview();};

  function bindOnce(){
    if(state.initialized)return;state.initialized=true;ensureInspector();
    document.querySelectorAll('.pb2-accordion-title').forEach(btn=>btn.addEventListener('click',()=>btn.parentElement.classList.toggle('open')));
    document.querySelectorAll('#sectionForm input,#sectionForm textarea,#sectionForm select').forEach(input=>input.addEventListener('input',window.pb2LivePreview));
    $('sectionForm')?.addEventListener('submit',window.savePageSection);
    $('pb2PreviewFrame')?.addEventListener('load',installPreviewEditor);
    document.querySelectorAll('.pb2-devices button').forEach(btn=>btn.addEventListener('click',()=>setDevice(btn.dataset.device||((btn.getAttribute('onclick')||'').match(/'(desktop|tablet|mobile)'/)||[])[1]||'desktop')));
    window.pb2RefreshPreview();
  }

  window.addEventListener('DOMContentLoaded',bindOnce,{once:true});
  if(document.readyState!=='loading')bindOnce();
})();
