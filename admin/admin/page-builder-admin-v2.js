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
  const backgroundMode = () => document.querySelector('input[name="sectionBackgroundMode"]:checked')?.value || 'color';
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
    [...form.children].forEach(child => { if (child !== head) child.classList.add('pbx-section-control'); });
    box.innerHTML = `
      <div class="pbx-inspector-head"><div><strong id="pbxElementType">Element</strong><small id="pbxSelectedName">Click an element in preview</small></div><button type="button" id="pbxClearSelection">Back to section</button></div>
      <div class="pbx-device-tabs">
        <button type="button" data-pbx-device="desktop" class="active">Desktop</button>
        <button type="button" data-pbx-device="tablet">Tablet</button>
        <button type="button" data-pbx-device="mobile">Mobile</button>
      </div>
      <div id="pbxEmpty" class="pbx-empty">Click a heading, paragraph, image or button in the preview.</div>
      <div id="pbxFields" class="pbx-fields hidden">
        <label>Position Mode<select id="pbxPositionMode"><option value="flow">Normal Responsive Flow</option><option value="free">Free Position (Drag)</option></select><small>Free Position can be dragged inside its section. Tablet and mobile may use their own position or switch back to Flow.</small></label>
        <label>Text / Label<textarea id="pbxText" rows="3"></textarea></label>
        <label>Link URL<input id="pbxHref" placeholder="https:// or page.html"></label>
        <label>Image
          <div class="pbx-image-upload-row">
            <input id="pbxSrc" placeholder="Image URL">
            <button type="button" id="pbxUploadImageBtn">Upload</button>
          </div>
          <input id="pbxImageUploader" class="pbx-hidden-file" type="file" accept="image/*">
          <small id="pbxImageUploadStatus" class="pbx-upload-status"></small>
        </label>
        <div class="pbx-grid2"><label>Text Colour<input id="pbxColor" type="color" value="#222222"></label><label>Background<input id="pbxBackground" type="color" value="#ffffff"></label></div>
        <div class="pbx-grid2"><label>Font Size<input id="pbxFontSize" type="number" min="8"></label><label>Font Weight<select id="pbxFontWeight"><option value="">Default</option><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semi-bold</option><option value="700">Bold</option></select></label></div>
        <label>Alignment<select id="pbxTextAlign"><option value="">Default</option><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>
        <div class="pbx-grid2"><label>Width px<input id="pbxWidth" type="number" min="0"></label><label>Height px<input id="pbxHeight" type="number" min="0"></label></div>
        <div class="pbx-grid2"><label>Move X<input id="pbxX" type="number"></label><label>Move Y<input id="pbxY" type="number"></label></div>
        <div class="pbx-grid4"><label>Margin T<input id="pbxMt" type="number"></label><label>Margin R<input id="pbxMr" type="number"></label><label>Margin B<input id="pbxMb" type="number"></label><label>Margin L<input id="pbxMl" type="number"></label></div>
        <div class="pbx-grid4"><label>Padding T<input id="pbxPt" type="number"></label><label>Padding R<input id="pbxPr" type="number"></label><label>Padding B<input id="pbxPb" type="number"></label><label>Padding L<input id="pbxPl" type="number"></label></div>
        <div class="pbx-grid2"><label>Radius<input id="pbxRadius" type="number" min="0"></label><label>Opacity<input id="pbxOpacity" type="number" min="0" max="1" step="0.05"></label></div>
        <label class="pbx-check"><input id="pbxHidden" type="checkbox"> Hide on this device</label>
        <div id="pbxSlideshowSettings" class="pbx-slideshow-settings hidden">
          <strong>Slideshow Settings</strong>
          <label>Upload Slides<input id="pbxSlideUploader" type="file" accept="image/*" multiple></label>
          <div id="pbxSlideList" class="pbx-slide-list"></div>
          <div class="pbx-grid2"><label>Autoplay<select id="pbxSlideAutoplay"><option value="true">On</option><option value="false">Off</option></select></label><label>Duration (seconds)<input id="pbxSlideDuration" type="number" min="1" value="5"></label></div>
          <div class="pbx-grid2"><label>Transition<select id="pbxSlideTransition"><option value="fade">Fade</option><option value="slide">Slide</option></select></label><label>Image Fit<select id="pbxSlideFit"><option value="cover">Cover</option><option value="contain">Contain</option></select></label></div>
          <div class="pbx-grid2"><label class="pbx-check"><input id="pbxSlideArrows" type="checkbox" checked> Arrows</label><label class="pbx-check"><input id="pbxSlideDots" type="checkbox" checked> Dots</label></div>
          <label class="pbx-check"><input id="pbxSlideLoop" type="checkbox" checked> Loop</label>
        </div>
        <div class="pbx-actions"><button type="button" id="pbxResetDevice">Reset Device Style</button><button type="button" id="pbxDeleteCustom" class="danger">Delete Added Element</button></div>
      </div>
      <div class="pbx-add-row"><button type="button" data-pbx-add="heading">+ Heading</button><button type="button" data-pbx-add="text">+ Text</button><button type="button" data-pbx-add="button">+ Button</button><button type="button" data-pbx-add="image">+ Image</button><button type="button" data-pbx-add="slideshow">+ Slideshow</button></div>
    `;
    head.insertAdjacentElement('afterend', box);
    box.classList.add('hidden');
    bindInspector();
    updateBackgroundControls();
  }

  function elementKind(el) {
    if (!el) return 'element';
    if (el.matches('[data-pb-slideshow]')) return 'slideshow';
    if (el.matches('img,picture')) return 'image';
    if (el.matches('video,source')) return 'video';
    if (el.matches('a,button')) return 'button';
    if (el.matches('h1,h2,h3,h4,h5,h6')) return 'heading';
    if (el.matches('p,span,li,label')) return 'text';
    if (el.matches('section,header,footer,main,div')) return 'container';
    return 'element';
  }

  function setInspectorMode(mode) {
    const elementMode = mode === 'element';
    $('sectionForm')?.classList.toggle('pbx-element-mode', elementMode);
    $('pbxInspector')?.classList.toggle('hidden', !elementMode);
    if ($('pb2InspectorTitle')) $('pb2InspectorTitle').textContent = elementMode ? `${elementKind(selectedElement()).replace(/^./, c=>c.toUpperCase())} Inspector` : 'Section Inspector';
    if ($('pb2InspectorHint')) $('pb2InspectorHint').textContent = elementMode ? 'Only settings relevant to the selected element are shown' : 'Section content, background, layout and visibility';
  }

  function updateElementFieldVisibility(el) {
    const kind = elementKind(el);
    const show = (id, visible) => $(id)?.closest('label,.pbx-grid2,.pbx-grid4')?.classList.toggle('pbx-context-hidden', !visible);
    show('pbxText', ['heading','text','button'].includes(kind));
    show('pbxHref', kind === 'button');
    show('pbxSrc', ['image','video'].includes(kind));
    show('pbxColor', ['heading','text','button'].includes(kind));
    show('pbxBackground', ['button','container'].includes(kind));
    show('pbxFontSize', ['heading','text','button'].includes(kind));
    show('pbxFontWeight', ['heading','text','button'].includes(kind));
    show('pbxTextAlign', ['heading','text','button','container'].includes(kind));
    $('pbxSlideshowSettings')?.classList.toggle('hidden', kind !== 'slideshow');
    if ($('pbxElementType')) $('pbxElementType').textContent = kind.replace(/^./, c=>c.toUpperCase());
  }

  function updateBackgroundControls() {
    const mode = backgroundMode();
    const ids = ['sectionImage','sectionBackgroundImage','sectionVideo','sectionBgColor','sectionGradientStart','sectionGradientEnd','sectionBackgroundSize','sectionBackgroundPosition','sectionOverlay'];
    const visible = {
      sectionImage: true,
      sectionBackgroundImage: mode === 'image', sectionVideo: mode === 'video', sectionBgColor: mode === 'color',
      sectionGradientStart: mode === 'gradient', sectionGradientEnd: mode === 'gradient',
      sectionBackgroundSize: ['image','video'].includes(mode), sectionBackgroundPosition: ['image','video'].includes(mode),
      sectionOverlay: ['image','video'].includes(mode)
    };
    ids.forEach(id => $(id)?.closest('label,.pb2-two')?.classList.toggle('pbx-background-hidden', !visible[id]));
    pb2LivePreview();
  }

  const fieldMap = {
    pbxText:'text', pbxHref:'href', pbxSrc:'src', pbxColor:'color', pbxBackground:'backgroundColor',
    pbxFontSize:'fontSize', pbxFontWeight:'fontWeight', pbxTextAlign:'textAlign', pbxWidth:'width',
    pbxHeight:'height', pbxX:'x', pbxY:'y', pbxMt:'marginTop', pbxMr:'marginRight', pbxMb:'marginBottom',
    pbxMl:'marginLeft', pbxPt:'paddingTop', pbxPr:'paddingRight', pbxPb:'paddingBottom', pbxPl:'paddingLeft',
    pbxRadius:'borderRadius', pbxOpacity:'opacity', pbxPositionMode:'positionMode'
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
    $('pbxUploadImageBtn')?.addEventListener('click', () => $('pbxImageUploader')?.click());
    $('pbxImageUploader')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (file) await uploadSelectedElementImage(file);
      event.target.value = '';
    });
    $('pbxSlideUploader')?.addEventListener('change', async event => { await uploadSlides([...event.target.files]); event.target.value=''; });
    ['pbxSlideAutoplay','pbxSlideDuration','pbxSlideTransition','pbxSlideFit','pbxSlideArrows','pbxSlideDots','pbxSlideLoop'].forEach(id => $(id)?.addEventListener('change', updateSlideshowSettings));
    document.querySelectorAll('[data-pbx-device]').forEach(btn => btn.addEventListener('click', () => setDevice(btn.dataset.pbxDevice)));
    document.querySelectorAll('[data-pbx-add]').forEach(btn => btn.addEventListener('click', () => addCustom(btn.dataset.pbxAdd)));
  }

  function customRecordForSelected() {
    const id=selectedElement()?.dataset.pbId;
    return id ? state.customElements.find(x=>x.id===id) : null;
  }
  async function uploadSlides(files) {
    const item=customRecordForSelected(); if(!item || item.type!=='slideshow' || !files.length)return;
    for(const file of files){
      if(!file.type.startsWith('image/'))continue;
      const fd=new FormData(); fd.append('file',file); fd.append('folder','page-builder-slides');
      const res=await fetch(`${API_BASE}/api/admin/upload-image`,{method:'POST',headers:uploadHeaders(),body:fd});
      const out=await res.json().catch(()=>({})); if(!res.ok||!out.url){alert(out.error||`Could not upload ${file.name}`);continue;}
      item.slides ||= []; item.slides.push({id:`slide-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,url:out.url,alt:file.name,title:'',text:'',buttonText:'',buttonUrl:''});
    }
    applyAllToPreview(); renderInspector();
  }
  function updateSlideshowSettings(){
    const item=customRecordForSelected(); if(!item||item.type!=='slideshow')return;
    item.options={autoplay:$('pbxSlideAutoplay').value==='true',duration:Math.max(1,Number($('pbxSlideDuration').value)||5),transition:$('pbxSlideTransition').value,fit:$('pbxSlideFit').value,arrows:$('pbxSlideArrows').checked,dots:$('pbxSlideDots').checked,loop:$('pbxSlideLoop').checked};
    applyAllToPreview();
  }
  function renderSlideEditor(item){
    const options=item.options||{}; $('pbxSlideAutoplay').value=String(options.autoplay!==false); $('pbxSlideDuration').value=options.duration||5; $('pbxSlideTransition').value=options.transition||'fade'; $('pbxSlideFit').value=options.fit||'cover'; $('pbxSlideArrows').checked=options.arrows!==false; $('pbxSlideDots').checked=options.dots!==false; $('pbxSlideLoop').checked=options.loop!==false;
    $('pbxSlideList').innerHTML=(item.slides||[]).map((s,i)=>`<div class="pbx-slide-row" data-slide-index="${i}"><img src="${esc(s.url)}" alt=""><div><input data-slide-field="title" value="${esc(s.title||'')}" placeholder="Slide title"><input data-slide-field="text" value="${esc(s.text||'')}" placeholder="Slide text"><input data-slide-field="buttonText" value="${esc(s.buttonText||'')}" placeholder="Button text"><input data-slide-field="buttonUrl" value="${esc(s.buttonUrl||'')}" placeholder="Button link"></div><div class="pbx-slide-actions"><button type="button" data-slide-move="-1">↑</button><button type="button" data-slide-move="1">↓</button><button type="button" data-slide-delete>×</button></div></div>`).join('')||'<small>No slides yet. Choose multiple images above.</small>';
    $('pbxSlideList').querySelectorAll('[data-slide-field]').forEach(input=>input.addEventListener('input',()=>{const row=input.closest('[data-slide-index]');item.slides[Number(row.dataset.slideIndex)][input.dataset.slideField]=input.value;applyAllToPreview();}));
    $('pbxSlideList').querySelectorAll('[data-slide-delete]').forEach(btn=>btn.addEventListener('click',()=>{item.slides.splice(Number(btn.closest('[data-slide-index]').dataset.slideIndex),1);applyAllToPreview();renderInspector();}));
    $('pbxSlideList').querySelectorAll('[data-slide-move]').forEach(btn=>btn.addEventListener('click',()=>{const i=Number(btn.closest('[data-slide-index]').dataset.slideIndex),j=i+Number(btn.dataset.slideMove);if(j<0||j>=item.slides.length)return;[item.slides[i],item.slides[j]]=[item.slides[j],item.slides[i]];applyAllToPreview();renderInspector();}));
  }

  async function uploadSelectedElementImage(file) {
    const status = $('pbxImageUploadStatus');
    const button = $('pbxUploadImageBtn');
    const selected = selectedElement();
    if (!selected) {
      alert('Select an image element in the preview first.');
      return;
    }
    if (!selected.matches('img,video,source') && selected.dataset.pbCustom !== '1') {
      alert('Select an image element, or add a new Image element first.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    try {
      if (status) status.textContent = 'Uploading image...';
      if (button) button.disabled = true;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'page-builder-images');
      const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
        method: 'POST',
        headers: uploadHeaders(),
        body: formData
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Image upload failed');
      if (!result.url) throw new Error('Upload completed, but no image URL was returned');
      const rec = record();
      if (!rec) throw new Error('No selected element record');
      rec.src = result.url;
      if ($('pbxSrc')) $('pbxSrc').value = result.url;
      applySelectedRecord();
      if (status) status.textContent = 'Image uploaded successfully.';
    } catch (error) {
      if (status) status.textContent = error.message || 'Image upload failed.';
      alert(error.message || 'Image upload failed.');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function renderInspector() {
    ensureInspector();
    const rec = record();
    const el = selectedElement();
    $('pbxEmpty')?.classList.toggle('hidden', !!el);
    $('pbxFields')?.classList.toggle('hidden', !el);
    if (!el || !rec) { setInspectorMode('section'); if($('pbxSelectedName')) $('pbxSelectedName').textContent='Click an element in preview'; return; }
    setInspectorMode('element');
    updateElementFieldVisibility(el);
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
    $('pbxPositionMode').value=rec.positionMode||'flow';
    const custom = el.dataset.pbCustom === '1';
    $('pbxDeleteCustom').style.display = custom ? '' : 'none';
    const item=customRecordForSelected(); if(item?.type==='slideshow')renderSlideEditor(item);
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
    const free=rec.positionMode==='free';
    el.dataset.pbPositionMode=free?'free':'flow';
    ['position','left','top','z-index','touch-action'].forEach(name=>el.style.removeProperty(name));
    if(free){el.style.setProperty('position','absolute','important');el.style.setProperty('left',`${Number(rec.x)||0}px`,'important');el.style.setProperty('top',`${Number(rec.y)||0}px`,'important');el.style.setProperty('z-index','10','important');el.style.setProperty('touch-action','none','important');}
    el.style.transform='';
    if(free && el.parentElement && getComputedStyle(el.parentElement).position==='static')el.parentElement.style.position='relative';
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
      if(item.type==='slideshow'){n=createSlideshow(item,section.ownerDocument,true);}
      else if(item.type==='button'){n=document.createElement('a');n.href=item.url||'#';n.textContent=item.text||'Button';n.className='cms-custom-button';}
      else if(item.type==='image'){n=document.createElement('img');n.src=item.url||'';n.alt=item.alt||'';n.className='cms-custom-image';}
      else {n=document.createElement(item.type==='heading'?'h2':'p');n.textContent=item.text|| (item.type==='heading'?'New Heading':'New text');n.className='cms-custom-text';}
      n.dataset.pbCustom='1'; n.dataset.pbId=item.id; section.appendChild(n);
    });
  }

  function createSlideshow(item,doc,editor){
    const o=item.options||{}, slides=item.slides||[], wrap=doc.createElement('div'); wrap.className='cms-slideshow'; wrap.dataset.pbSlideshow='1'; wrap.style.setProperty('--pb-slide-fit',o.fit||'cover');
    const track=doc.createElement('div');track.className=`cms-slideshow-track ${o.transition==='slide'?'is-slide':'is-fade'}`;wrap.appendChild(track);
    slides.forEach((s,i)=>{const slide=doc.createElement('div');slide.className=`cms-slide${i===0?' active':''}`;slide.innerHTML=`<img src="${esc(s.url)}" alt="${esc(s.alt||'')}"><div class="cms-slide-caption">${s.title?`<h3>${esc(s.title)}</h3>`:''}${s.text?`<p>${esc(s.text)}</p>`:''}${s.buttonText?`<a href="${esc(s.buttonUrl||'#')}">${esc(s.buttonText)}</a>`:''}</div>`;track.appendChild(slide);});
    if(!slides.length)track.innerHTML='<div class="cms-slide-empty">Upload slideshow images in Settings</div>';
    if(o.arrows!==false){wrap.insertAdjacentHTML('beforeend','<button type="button" class="cms-slide-prev" aria-label="Previous">‹</button><button type="button" class="cms-slide-next" aria-label="Next">›</button>');}
    if(o.dots!==false&&slides.length){const dots=doc.createElement('div');dots.className='cms-slide-dots';dots.innerHTML=slides.map((_,i)=>`<button type="button" class="${i===0?'active':''}" data-slide-go="${i}" aria-label="Slide ${i+1}"></button>`).join('');wrap.appendChild(dots);}
    if(!editor)initSlideshow(wrap,o); return wrap;
  }
  function initSlideshow(wrap,o){let index=0,timer;const slides=[...wrap.querySelectorAll('.cms-slide')],dots=[...wrap.querySelectorAll('[data-slide-go]')];if(!slides.length)return;const go=n=>{index=o.loop===false?Math.max(0,Math.min(slides.length-1,n)):(n+slides.length)%slides.length;slides.forEach((x,i)=>x.classList.toggle('active',i===index));dots.forEach((x,i)=>x.classList.toggle('active',i===index));};wrap.querySelector('.cms-slide-prev')?.addEventListener('click',()=>go(index-1));wrap.querySelector('.cms-slide-next')?.addEventListener('click',()=>go(index+1));dots.forEach(x=>x.addEventListener('click',()=>go(Number(x.dataset.slideGo))));const play=()=>{if(o.autoplay!==false&&slides.length>1)timer=setInterval(()=>go(index+1),(o.duration||5)*1000);};wrap.addEventListener('mouseenter',()=>clearInterval(timer));wrap.addEventListener('mouseleave',play);play();}

  function addCustom(type) {
    const key=$('sectionKey')?.value; if(!key){alert('Select a section first.');return;}
    const id=`pb-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    state.customElements.push(type==='slideshow'?{id,sectionKey:key,type,slides:[],options:{autoplay:true,duration:5,transition:'fade',fit:'cover',arrows:true,dots:true,loop:true}}:{id,sectionKey:key,type,text:type==='heading'?'New Heading':type==='button'?'Button':'New text',url:'#'});
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
    if(!style){style=doc.createElement('style');style.id='pbx-editor-style';style.textContent=`body.pbx-editing [data-section],body.pbx-editing [data-section] *{cursor:pointer!important}.pbx-selected{outline:3px solid #00a88f!important;outline-offset:3px!important}.pbx-selected:after{content:'Editing';position:absolute;left:0;top:-25px;background:#006f66;color:#fff;font:11px Arial;padding:4px 7px;border-radius:4px;z-index:2147483647}[data-pb-position-mode="free"]{cursor:move!important}.cms-custom-button{display:inline-block;padding:10px 18px;background:#087f72;color:#fff;text-decoration:none;border-radius:7px;margin:8px}.cms-custom-image{max-width:260px;height:auto}.cms-custom-text{margin:8px}`;doc.head.appendChild(style);}
    doc.body.classList.add('pbx-editing');
    doc.addEventListener('click', e => {
      const section=e.target.closest('[data-section]'); if(!section)return;
      e.preventDefault(); e.stopPropagation();
      const key=section.dataset.section; const item=state.items.find(x=>x.sectionKey===key);
      if(item && String(item.id)!==String(state.selectedId)) editPageSection(item.id, false);
      const target=e.target.closest('[data-pb-custom="1"],a,button,img,h1,h2,h3,h4,p,span,div,section') || section;
      state.selectedSelector=selectorFor(target,section); markSelected(target); renderInspector();
    },{capture:true,signal});
    let drag=null;
    doc.addEventListener('pointerdown',e=>{
      const el=e.target.closest('[data-pb-position-mode="free"]'); if(!el)return;
      const section=el.closest('[data-section]'); if(!section)return;
      e.preventDefault(); e.stopPropagation(); state.selectedSelector=selectorFor(el,section); markSelected(el); renderInspector();
      const rec=record(); drag={el,section,rec,startX:e.clientX,startY:e.clientY,x:Number(rec.x)||0,y:Number(rec.y)||0}; el.setPointerCapture?.(e.pointerId);
    },{capture:true,signal});
    doc.addEventListener('pointermove',e=>{if(!drag)return;e.preventDefault();const maxX=Math.max(0,drag.section.clientWidth-drag.el.offsetWidth),maxY=Math.max(0,drag.section.clientHeight-drag.el.offsetHeight);drag.rec.x=Math.round(Math.max(0,Math.min(maxX,drag.x+e.clientX-drag.startX)));drag.rec.y=Math.round(Math.max(0,Math.min(maxY,drag.y+e.clientY-drag.startY)));applySelectedRecord();if($('pbxX'))$('pbxX').value=drag.rec.x;if($('pbxY'))$('pbxY').value=drag.rec.y;},{capture:true,signal});
    const endDrag=()=>{drag=null;}; doc.addEventListener('pointerup',endDrag,{capture:true,signal});doc.addEventListener('pointercancel',endDrag,{capture:true,signal});
    applyAllToPreview();
  }

  function markSelected(forceEl) {
    const doc=frameDoc(); if(!doc)return;
    doc.querySelectorAll('.pbx-selected').forEach(n=>n.classList.remove('pbx-selected'));
    const el=forceEl||selectedElement(); if(el)el.classList.add('pbx-selected');
  }
  function clearSelection(){state.selectedSelector='';markSelected();setInspectorMode('section');renderInspector();}

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
    const mode=s.backgroundMode||item.backgroundType||(s.videoUrl?'video':item.backgroundImage?'image':'color'); const radio=document.querySelector(`input[name="sectionBackgroundMode"][value="${mode}"]`); if(radio)radio.checked=true; updateBackgroundControls();
  };

  window.savePageSection=async function(e){
    e?.preventDefault(); const status=$('pb2SaveStatus'); if(status){status.textContent='Saving…';status.className='';}
    const mode=backgroundMode();
    const settings={backgroundMode:mode,videoUrl:mode==='video'?$('sectionVideo').value.trim():'',gradientStart:$('sectionGradientStart').value,gradientEnd:$('sectionGradientEnd').value,paddingTop:px('sectionPaddingTop'),paddingBottom:px('sectionPaddingBottom'),borderRadius:px('sectionBorderRadius'),shadow:$('sectionShadow').value,animation:$('sectionAnimation').value,cards:collectCards(),buttonText:$('sectionButtonText').value.trim(),buttonUrl:$('sectionButtonUrl').value.trim(),backgroundSize:$('sectionBackgroundSize').value,backgroundPosition:$('sectionBackgroundPosition').value,overlay:Number($('sectionOverlay').value||35),headingColor:$('sectionHeadingColor').value,headingFont:$('sectionHeadingFont').value,headingSize:px('sectionHeadingSize'),fontSize:px('sectionFontSize'),elementStyles:state.elementStyles,customElements:state.customElements};
    const data={id:$('sectionEditId').value||'',page:currentPage(),sectionKey:$('sectionKey').value,sectionType:$('sectionType').value,title:$('sectionTitle').value.trim(),subtitle:$('sectionSubtitle').value.trim(),content:$('sectionContent').value.trim(),buttonText:$('sectionButtonText').value.trim(),buttonUrl:$('sectionButtonUrl').value.trim(),mediaUrl:$('sectionImage').value.trim(),backgroundType:mode,backgroundColor:mode==='color'?$('sectionBgColor').value:'transparent',backgroundImage:mode==='image'?$('sectionBackgroundImage').value.trim():'',textColor:$('sectionTextColor').value,headingColor:$('sectionHeadingColor').value,buttonColor:$('sectionButtonColor').value,fontFamily:$('sectionFontFamily').value,fontSize:px('sectionFontSize'),sortOrder:$('sectionSortOrder').value,active:$('sectionActive').checked,settings};
    try{const res=await fetch(`${API_BASE}/api/admin/page-sections`,{method:'POST',headers:authHeaders(),body:JSON.stringify(data)});const out=await res.json();if(!res.ok)throw new Error(out.error||'Save failed');if(status){status.textContent='Saved';status.className='pb2-status-ok';}await loadPageSections();window.pb2RefreshPreview();}
    catch(err){if(status){status.textContent=err.message;status.className='pb2-status-error';}alert(err.message);}
  };

  function applySectionFormPreview(){
    const target=selectedSection();if(!target)return;
    const set=(field,value)=>{const n=target.querySelector(`[data-field="${field}"]`);if(n&&value!=='')n.textContent=value;};
    set('title',$('sectionTitle')?.value||'');set('subtitle',$('sectionSubtitle')?.value||'');set('content',$('sectionContent')?.value||'');
    const btn=target.querySelector('[data-field="button"]');if(btn){if($('sectionButtonText')?.value)btn.textContent=$('sectionButtonText').value;if($('sectionButtonUrl')?.value)btn.href=$('sectionButtonUrl').value;}
    const img=target.querySelector('[data-field="image"]');if(img&&$('sectionImage')?.value)img.src=$('sectionImage').value;
    const mode=backgroundMode(),bg=$('sectionBackgroundImage')?.value,o=Number($('sectionOverlay')?.value||35)/100;
    target.querySelector(':scope > .cms-bg-video')?.remove();
    target.style.background=''; target.style.backgroundImage='';
    if(mode==='image'&&bg)target.style.backgroundImage=`linear-gradient(rgba(0,0,0,${o}),rgba(0,0,0,${o})),url('${bg}')`;
    else if(mode==='gradient')target.style.background=`linear-gradient(135deg,${$('sectionGradientStart').value},${$('sectionGradientEnd').value})`;
    else if(mode==='color')target.style.background=$('sectionBgColor')?.value||'';
    else if(mode==='video'&&$('sectionVideo')?.value){const v=document.createElement('video');v.className='cms-bg-video';v.src=$('sectionVideo').value;v.autoplay=true;v.muted=true;v.loop=true;v.playsInline=true;target.prepend(v);}
    target.style.backgroundSize=$('sectionBackgroundSize')?.value||'cover';target.style.backgroundPosition=$('sectionBackgroundPosition')?.value||'center center';target.style.color=$('sectionTextColor')?.value||'';target.style.fontFamily=$('sectionFontFamily')?.value||'';target.style.fontSize=px('sectionFontSize');target.style.paddingTop=px('sectionPaddingTop');target.style.paddingBottom=px('sectionPaddingBottom');target.style.borderRadius=px('sectionBorderRadius');
    target.querySelectorAll('h1,h2,h3').forEach(h=>{h.style.color=$('sectionHeadingColor')?.value||'';h.style.fontFamily=$('sectionHeadingFont')?.value||'';h.style.fontSize=px('sectionHeadingSize');});
  }
  window.pb2LivePreview=()=>{applySectionFormPreview();applyAllToPreview();};

  function bindOnce(){
    if(state.initialized)return;state.initialized=true;ensureInspector();
    document.querySelectorAll('.pb2-accordion-title').forEach(btn=>btn.addEventListener('click',()=>btn.parentElement.classList.toggle('open')));
    document.querySelectorAll('#sectionForm input,#sectionForm textarea,#sectionForm select').forEach(input=>input.addEventListener('input',window.pb2LivePreview));
    document.querySelectorAll('input[name="sectionBackgroundMode"]').forEach(input=>input.addEventListener('change',updateBackgroundControls));
    $('sectionForm')?.addEventListener('submit',window.savePageSection);
    $('pb2PreviewFrame')?.addEventListener('load',installPreviewEditor);
    document.querySelectorAll('.pb2-devices button').forEach(btn=>btn.addEventListener('click',()=>setDevice(btn.dataset.device||((btn.getAttribute('onclick')||'').match(/'(desktop|tablet|mobile)'/)||[])[1]||'desktop')));
    window.pb2RefreshPreview();
  }

  window.addEventListener('DOMContentLoaded',bindOnce,{once:true});
  if(document.readyState!=='loading')bindOnce();
})();
