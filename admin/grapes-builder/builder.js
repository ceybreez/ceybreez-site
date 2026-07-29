(() => {
  'use strict';

  const API_BASE = 'https://ceybreez-contact-api.ceybreez.workers.dev';
  const DRAFT_PREFIX = 'CEYBREEZ_VISUAL_BUILDER_PRO_V1:';
  const $ = (id) => document.getElementById(id);
  const frame = $('liveFrame');
  const pageSelect = $('pageSelect');
  const status = $('status');

  const state = {
    page: 'home', device: 'desktop', selected: null, section: null, selector: '',
    sections: new Map(), draft: { sections: {} }, history: [], future: [], uploadMode: 'image'
  };

  const pageConfig = (value) => value === 'welcome'
    ? { page: 'home', file: 'index.html', mode: 'welcome', label: 'Welcome Screen' }
    : value === 'home'
      ? { page: 'home', file: 'index.html', mode: 'home', label: 'Home Page' }
      : { page: value.replace('.html', '').replace('tour-details', 'tour-details'), file: value, mode: 'full', label: pageSelect.options[pageSelect.selectedIndex].text };

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  function token() { return localStorage.getItem('CEYBREEZ_ADMIN_TOKEN') || ''; }
  function authHeaders() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }; }
  function draftKey() { return `${DRAFT_PREFIX}${state.page}`; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function cssEscape(value) { return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }

  function readSettings(value) {
    try { return typeof value === 'string' ? JSON.parse(value || '{}') : (value || {}); }
    catch { return {}; }
  }

  function currentSectionKey() { return state.section?.dataset?.section || ''; }
  function sectionDraft(key = currentSectionKey()) {
    if (!key) return null;
    state.draft.sections[key] ||= { elementStyles: {}, customElements: [] };
    return state.draft.sections[key];
  }
  function styleRecord(selector = state.selector) {
    const draft = sectionDraft();
    if (!draft || !selector) return null;
    draft.elementStyles[selector] ||= { desktop: {}, tablet: {}, mobile: {} };
    draft.elementStyles[selector][state.device] ||= {};
    return draft.elementStyles[selector][state.device];
  }

  function mergedRecord(byDevice) {
    return Object.assign({}, byDevice?.desktop || {}, state.device === 'desktop' ? {} : (byDevice?.[state.device] || {}));
  }

  function stableSelector(el, section) {
    if (el === section) return ':scope';
    if (el.dataset.field) return `[data-field="${cssEscape(el.dataset.field)}"]`;
    if (el.dataset.pbId) return `[data-pb-id="${cssEscape(el.dataset.pbId)}"]`;
    if (el.id) return `#${cssEscape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node !== section && parts.length < 6) {
      let part = node.tagName.toLowerCase();
      const useful = [...node.classList].filter(c => !c.startsWith('cb-') && !c.startsWith('cms-')).slice(0, 2);
      if (useful.length) part += '.' + useful.map(cssEscape).join('.');
      const same = node.parentElement ? [...node.parentElement.children].filter(n => n.tagName === node.tagName) : [];
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function pushHistory() {
    state.history.push(clone(state.draft));
    if (state.history.length > 40) state.history.shift();
    state.future = [];
  }

  function applyRecord(el, record) {
    if (!el || !record) return;
    if (record.text !== undefined) {
      if (['INPUT', 'TEXTAREA'].includes(el.tagName)) el.value = record.text;
      else el.textContent = record.text;
    }
    if (record.href !== undefined && el.matches('a,button')) el.setAttribute('href', record.href || '#');
    if (record.src !== undefined && el.matches('img,video,source')) el.setAttribute('src', record.src || '');
    if (record.alt !== undefined && el.matches('img')) el.setAttribute('alt', record.alt || '');
    if (record.className !== undefined) el.className = record.className;
    if (record.elementId !== undefined) el.id = record.elementId;

    const pxKeys = ['fontSize','width','height','maxWidth','minHeight','marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','borderWidth'];
    pxKeys.forEach(key => {
      const value = record[key];
      el.style[key] = value === '' || value == null ? '' : (typeof value === 'number' ? `${value}px` : String(value));
    });
    ['display','fontFamily','fontWeight','lineHeight','letterSpacing','textAlign','justifyContent','alignItems','color','backgroundColor','backgroundSize','backgroundPosition','borderColor','boxShadow','opacity'].forEach(key => {
      el.style[key] = record[key] == null ? '' : String(record[key]);
    });
    el.style.backgroundImage = record.backgroundImage ? `url("${record.backgroundImage}")` : '';
    if (record.hidden === true) el.style.setProperty('display', 'none', 'important');
  }

  function renderCustom(section, items) {
    section.querySelectorAll('[data-pb-custom="1"]').forEach(el => el.remove());
    (items || []).forEach(item => {
      let el;
      if (item.type === 'image') { el = document.createElement('img'); el.src = item.url || ''; el.alt = item.alt || ''; }
      else if (item.type === 'button') { el = document.createElement('a'); el.href = item.url || '#'; el.textContent = item.text || 'Button'; el.className = 'cms-custom-button'; }
      else { el = document.createElement(item.type === 'heading' ? 'h2' : 'p'); el.textContent = item.text || (item.type === 'heading' ? 'New Heading' : 'New text'); }
      el.dataset.pbCustom = '1'; el.dataset.pbId = item.id;
      section.appendChild(el);
    });
  }

  function applyDraft() {
    const doc = frame.contentDocument;
    if (!doc) return;
    Object.entries(state.draft.sections || {}).forEach(([key, sectionData]) => {
      const section = doc.querySelector(`[data-section="${cssEscape(key)}"]`);
      if (!section) return;
      renderCustom(section, sectionData.customElements);
      Object.entries(sectionData.elementStyles || {}).forEach(([selector, byDevice]) => {
        let nodes = [];
        try { nodes = selector === ':scope' ? [section] : [...section.querySelectorAll(selector)]; } catch { return; }
        const merged = mergedRecord(byDevice);
        nodes.forEach(node => applyRecord(node, merged));
      });
    });
    markSelected();
  }

  function loadDraft() {
    try { state.draft = JSON.parse(localStorage.getItem(draftKey()) || '{"sections":{}}'); }
    catch { state.draft = { sections: {} }; }
    state.draft.sections ||= {};
  }

  async function loadServerSections() {
    state.sections.clear();
    if (!token()) { setStatus('Admin token not found. Open Admin and log in first.', true); return; }
    try {
      const response = await fetch(`${API_BASE}/api/admin/page-sections?page=${encodeURIComponent(state.page)}`, { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load page sections');
      (Array.isArray(data) ? data : []).forEach(item => state.sections.set(item.sectionKey, item));
    } catch (error) { setStatus(error.message, true); }
  }

  function frameStyle(doc) {
    let style = doc.getElementById('cb-pro-builder-style');
    if (!style) { style = doc.createElement('style'); style.id = 'cb-pro-builder-style'; doc.head.appendChild(style); }
    style.textContent = `
      [data-cb-hover="1"]{outline:1px dashed #168cff!important;outline-offset:2px!important;cursor:pointer!important}
      [data-cb-selected="1"]{outline:3px solid #168cff!important;outline-offset:2px!important}
      body.cb-builder-mobile{overflow-x:hidden!important}
      body.cb-builder-mobile img,body.cb-builder-tablet img{max-width:100%!important;height:auto}
      body.cb-builder-mobile [data-section]{max-width:100%!important;min-width:0!important}
    `;
  }

  function prepareFrame() {
    const doc = frame.contentDocument;
    const cfg = pageConfig(pageSelect.value);
    if (!doc?.body) throw new Error('Live page is not accessible');
    frameStyle(doc);
    doc.body.classList.remove('cb-builder-desktop','cb-builder-tablet','cb-builder-mobile');
    doc.body.classList.add(`cb-builder-${state.device}`);

    if (cfg.mode === 'home') {
      const welcome = doc.getElementById('welcomeScreen');
      const main = doc.getElementById('mainSite');
      if (welcome) welcome.style.setProperty('display', 'none', 'important');
      if (main) { main.style.setProperty('display', 'block', 'important'); main.style.setProperty('opacity', '1', 'important'); main.style.setProperty('visibility', 'visible', 'important'); }
      doc.body.classList.add('entered');
    } else if (cfg.mode === 'welcome') {
      const welcome = doc.getElementById('welcomeScreen');
      const main = doc.getElementById('mainSite');
      if (main) main.style.setProperty('display', 'none', 'important');
      if (welcome) { welcome.style.setProperty('display', 'flex', 'important'); welcome.style.setProperty('opacity', '1', 'important'); welcome.style.setProperty('visibility', 'visible', 'important'); welcome.classList.remove('hide'); }
      doc.body.classList.remove('entered');
    }

    doc.addEventListener('click', onFrameClick, true);
    doc.addEventListener('mouseover', onFrameHover, true);
    doc.addEventListener('mouseout', onFrameOut, true);
    buildSectionList();
    buildLayers();
  }

  function editableTarget(target) {
    if (!(target instanceof frame.contentWindow.Element)) return null;
    return target.closest('h1,h2,h3,h4,h5,h6,p,a,button,img,video,section,div,footer,header,span') || target;
  }
  function onFrameClick(event) {
    const el = editableTarget(event.target);
    if (!el) return;
    const section = el.closest('[data-section]');
    if (!section) { setStatus('This element is outside a publishable section.', true); return; }
    event.preventDefault(); event.stopPropagation();
    selectElement(el, section);
  }
  function onFrameHover(event) { const el = editableTarget(event.target); if (el && el !== state.selected) el.dataset.cbHover = '1'; }
  function onFrameOut(event) { const el = editableTarget(event.target); if (el) delete el.dataset.cbHover; }

  function selectElement(el, section) {
    if (state.selected) delete state.selected.dataset.cbSelected;
    state.selected = el; state.section = section; state.selector = stableSelector(el, section);
    el.dataset.cbSelected = '1';
    $('selectedLabel').textContent = `${section.dataset.section} › ${el.tagName.toLowerCase()}`;
    $('emptyState').hidden = true; $('inspector').hidden = false;
    $('settingsEmpty').hidden = true; $('settingsInspector').hidden = false;
    renderInspector(); buildLayers();
  }
  function markSelected() { if (state.selected?.isConnected) state.selected.dataset.cbSelected = '1'; }

  function valueOrComputed(el, prop, record) {
    if (record && record[prop] !== undefined) return record[prop];
    return frame.contentWindow.getComputedStyle(el)[prop] || '';
  }
  function numberValue(value) { const n = parseFloat(value); return Number.isFinite(n) ? n : ''; }

  function renderInspector() {
    const el = state.selected; if (!el) return;
    const by = sectionDraft()?.elementStyles?.[state.selector] || {};
    const record = mergedRecord(by);
    $('elementName').textContent = `${el.tagName.toLowerCase()} · ${state.selector}`;
    $('textValue').value = record.text ?? (['INPUT','TEXTAREA'].includes(el.tagName) ? el.value : el.textContent.trim());
    $('linkValue').value = record.href ?? (el.getAttribute('href') || '');
    $('imageValue').value = record.src ?? (el.getAttribute('src') || '');
    $('altValue').value = record.alt ?? (el.getAttribute('alt') || '');
    $('classValue').value = record.className ?? el.className;
    $('idValue').value = record.elementId ?? el.id;

    const fields = {
      displayValue:'display', widthValue:'width', heightValue:'height', maxWidthValue:'maxWidth', minHeightValue:'minHeight',
      fontFamily:'fontFamily', fontWeight:'fontWeight', lineHeight:'lineHeight', letterSpacing:'letterSpacing', textAlign:'textAlign', justifyContent:'justifyContent', alignItems:'alignItems',
      backgroundSize:'backgroundSize', backgroundPosition:'backgroundPosition', boxShadow:'boxShadow', opacity:'opacity'
    };
    Object.entries(fields).forEach(([id, prop]) => { if ($(id)) $(id).value = valueOrComputed(el, prop, record); });
    const numberFields = { fontSize:'fontSize', marginTop:'marginTop', marginRight:'marginRight', marginBottom:'marginBottom', marginLeft:'marginLeft', paddingTop:'paddingTop', paddingRight:'paddingRight', paddingBottom:'paddingBottom', paddingLeft:'paddingLeft', radius:'borderRadius', borderWidth:'borderWidth' };
    Object.entries(numberFields).forEach(([id, prop]) => { if ($(id)) $(id).value = numberValue(valueOrComputed(el, prop, record)); });

    $('useTextColor').checked = record.color !== undefined; $('colorValue').disabled = !$('useTextColor').checked; $('colorValue').value = record.color || '#222222';
    $('useBgColor').checked = record.backgroundColor !== undefined; $('bgValue').disabled = !$('useBgColor').checked; $('bgValue').value = record.backgroundColor || '#ffffff';
    $('backgroundImage').value = record.backgroundImage || '';
    $('borderColor').value = record.borderColor || '#000000';
    $('altRow').hidden = el.tagName !== 'IMG'; $('imageRow').hidden = !el.matches('img,video,source'); $('linkRow').hidden = !el.matches('a,button');
    $('typographyGroup').classList.toggle('context-hidden', el.matches('img,video,source'));
  }

  function update(prop, value) {
    if (!state.selected) return;
    pushHistory();
    const rec = styleRecord(); if (!rec) return;
    rec[prop] = value;
    applyDraft();
    setStatus(`Changed ${prop} on ${state.device}. Save Draft or Publish.`);
  }
  function bindInput(id, prop, transform = v => v) {
    $(id)?.addEventListener('change', event => update(prop, transform(event.target.value)));
  }

  function bindInspector() {
    const numeric = v => v === '' ? '' : Number(v);
    [['displayValue','display'],['widthValue','width'],['heightValue','height'],['maxWidthValue','maxWidth'],['minHeightValue','minHeight'],['fontFamily','fontFamily'],['fontWeight','fontWeight'],['lineHeight','lineHeight'],['letterSpacing','letterSpacing'],['textAlign','textAlign'],['justifyContent','justifyContent'],['alignItems','alignItems'],['backgroundSize','backgroundSize'],['backgroundPosition','backgroundPosition'],['boxShadow','boxShadow'],['opacity','opacity']].forEach(([id,p])=>bindInput(id,p));
    [['fontSize','fontSize'],['marginTop','marginTop'],['marginRight','marginRight'],['marginBottom','marginBottom'],['marginLeft','marginLeft'],['paddingTop','paddingTop'],['paddingRight','paddingRight'],['paddingBottom','paddingBottom'],['paddingLeft','paddingLeft'],['radius','borderRadius'],['borderWidth','borderWidth']].forEach(([id,p])=>bindInput(id,p,numeric));
    bindInput('textValue','text'); bindInput('linkValue','href'); bindInput('imageValue','src'); bindInput('altValue','alt'); bindInput('classValue','className'); bindInput('idValue','elementId'); bindInput('backgroundImage','backgroundImage'); bindInput('borderColor','borderColor');
    $('useTextColor').onchange = e => { $('colorValue').disabled = !e.target.checked; update('color', e.target.checked ? $('colorValue').value : undefined); };
    $('colorValue').onchange = e => update('color', e.target.value);
    $('useBgColor').onchange = e => { $('bgValue').disabled = !e.target.checked; update('backgroundColor', e.target.checked ? $('bgValue').value : undefined); };
    $('bgValue').onchange = e => update('backgroundColor', e.target.value);
    document.querySelectorAll('[data-align]').forEach(btn => btn.onclick = () => update('textAlign', btn.dataset.align));
  }

  function addElement(type) {
    if (!state.section) { setStatus('Select a section first.', true); return; }
    pushHistory();
    const item = { id: `pb-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, sectionKey: currentSectionKey(), type };
    if (type === 'heading') item.text = 'New Heading';
    if (type === 'text') item.text = 'New text';
    if (type === 'button') { item.text = 'Button'; item.url = '#'; }
    if (type === 'image') { item.url = ''; item.alt = 'New image'; }
    sectionDraft().customElements.push(item); applyDraft();
    const el = state.section.querySelector(`[data-pb-id="${cssEscape(item.id)}"]`); if (el) selectElement(el, state.section);
  }

  function deleteSelected() {
    if (!state.selected) return;
    pushHistory();
    if (state.selected.dataset.pbCustom === '1') {
      const draft = sectionDraft(); draft.customElements = draft.customElements.filter(x => x.id !== state.selected.dataset.pbId);
    } else update('hidden', true);
    state.selected = null; state.selector = ''; applyDraft(); updateInspectorEmpty();
  }
  function duplicateSelected() {
    if (!state.selected || !state.section) return;
    const type = state.selected.tagName === 'IMG' ? 'image' : /^H[1-6]$/.test(state.selected.tagName) ? 'heading' : state.selected.matches('a,button') ? 'button' : 'text';
    addElement(type);
    if (state.selected) {
      update('text', state.selected.textContent || '');
      if (state.selected.tagName === 'IMG') update('src', state.selected.src);
    }
  }
  function updateInspectorEmpty() {
    $('emptyState').hidden = false; $('inspector').hidden = true; $('settingsEmpty').hidden = false; $('settingsInspector').hidden = true; $('selectedLabel').textContent = 'Nothing selected';
  }

  async function uploadImage() {
    const file = $('fileInput').files?.[0]; if (!file) return;
    if (!token()) { setStatus('Admin token not found. Log in to Admin first.', true); return; }
    const form = new FormData(); form.append('file', file); form.append('folder', 'page-builder');
    setStatus('Uploading image…');
    try {
      const response = await fetch(`${API_BASE}/api/admin/upload-image`, { method:'POST', headers:{Authorization:`Bearer ${token()}`}, body:form });
      const data = await response.json(); if (!response.ok || !data.url) throw new Error(data.error || 'Upload failed');
      if (state.uploadMode === 'background') update('backgroundImage', data.url);
      else if (state.selected?.matches('img,video,source')) update('src', data.url);
      else { addElement('image'); update('src', data.url); }
      setStatus('Image uploaded. It will appear on desktop, tablet and mobile unless overridden.');
    } catch (error) { setStatus(error.message, true); }
    $('fileInput').value = '';
  }

  function saveDraft() {
    localStorage.setItem(draftKey(), JSON.stringify(state.draft));
    setStatus(`Draft saved locally at ${new Date().toLocaleTimeString()}.`);
  }

  function sectionPayload(key, draftSection) {
    const server = state.sections.get(key) || {};
    const section = frame.contentDocument.querySelector(`[data-section="${cssEscape(key)}"]`);
    const settings = Object.assign({}, readSettings(server.settings), {
      elementStyles: draftSection.elementStyles || {},
      customElements: draftSection.customElements || []
    });
    return {
      id: server.id || '', page: state.page, sectionKey: key, sectionType: server.sectionType || 'visual',
      title: server.title || section?.querySelector('[data-field="title"],h1,h2')?.textContent?.trim() || key,
      subtitle: server.subtitle || section?.querySelector('[data-field="subtitle"]')?.textContent?.trim() || '',
      content: server.content || section?.querySelector('[data-field="content"],p')?.textContent?.trim() || '',
      mediaUrl: server.mediaUrl || section?.querySelector('[data-field="image"],img')?.getAttribute('src') || '',
      backgroundType: server.backgroundType || 'color', backgroundColor: server.backgroundColor || '', backgroundImage: server.backgroundImage || '',
      textColor: server.textColor || '', buttonColor: server.buttonColor || '', fontFamily: server.fontFamily || '',
      sortOrder: server.sortOrder || 0, active: server.active === undefined ? true : !!server.active, settings
    };
  }

  async function publish() {
    if (!token()) { setStatus('Admin token not found. Log in to Admin first.', true); return; }
    const entries = Object.entries(state.draft.sections || {});
    if (!entries.length) { setStatus('No changes to publish.', true); return; }
    setStatus(`Publishing ${entries.length} section(s)…`);
    try {
      for (const [key, draftSection] of entries) {
        const response = await fetch(`${API_BASE}/api/admin/page-sections`, { method:'POST', headers:authHeaders(), body:JSON.stringify(sectionPayload(key, draftSection)) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || `Failed to publish ${key}`);
      }
      localStorage.setItem(draftKey(), JSON.stringify(state.draft));
      await loadServerSections();
      setStatus('Published successfully. Open the public page and hard refresh to verify desktop and mobile.');
    } catch (error) { setStatus(error.message, true); }
  }

  function buildSectionList() {
    const box = $('sectionList'); box.innerHTML = '';
    frame.contentDocument?.querySelectorAll('[data-section]').forEach(section => {
      const button = document.createElement('button'); button.textContent = section.dataset.section; button.onclick = () => { section.scrollIntoView({behavior:'smooth',block:'center'}); selectElement(section, section); }; box.appendChild(button);
    });
  }
  function buildLayers() {
    const box = $('layerList'); box.innerHTML = '';
    const root = state.section || frame.contentDocument?.body; if (!root) return;
    [...root.querySelectorAll(':scope > *, h1,h2,h3,p,a,button,img')].slice(0,100).forEach(el => {
      if (el.closest('script,style')) return;
      const btn = document.createElement('button'); btn.textContent = `${el.tagName.toLowerCase()} ${el.id ? '#'+el.id : ''}`; btn.onclick = () => selectElement(el, el.closest('[data-section]') || root); box.appendChild(btn);
    });
  }

  function loadPage() {
    const cfg = pageConfig(pageSelect.value); state.page = cfg.page; state.selected = null; state.section = null; state.selector = ''; updateInspectorEmpty(); loadDraft(); setStatus(`Loading ${cfg.label}…`);
    frame.src = new URL(`../../${cfg.file}?cbuilder=${Date.now()}`, location.href).href;
  }

  frame.addEventListener('load', async () => {
    try { prepareFrame(); await loadServerSections(); applyDraft(); setTimeout(applyDraft, 1000); setStatus(`${pageConfig(pageSelect.value).label} ready.`); }
    catch (error) { setStatus(error.message, true); }
  });

  pageSelect.onchange = loadPage; $('reloadBtn').onclick = loadPage; $('saveBtn').onclick = saveDraft; $('publishBtn').onclick = publish;
  $('clearBtn').onclick = () => { if (!confirm('Clear this page draft?')) return; localStorage.removeItem(draftKey()); state.draft={sections:{}}; loadPage(); };
  $('undoBtn').onclick = () => { if (!state.history.length) return; state.future.push(clone(state.draft)); state.draft = state.history.pop(); applyDraft(); };
  $('redoBtn').onclick = () => { if (!state.future.length) return; state.history.push(clone(state.draft)); state.draft = state.future.pop(); applyDraft(); };
  $('deleteBtn').onclick = deleteSelected; $('deleteQuickBtn').onclick = deleteSelected; $('duplicateBtn').onclick = duplicateSelected; $('duplicateQuickBtn').onclick = duplicateSelected;
  $('moveUpBtn').onclick = () => state.selected?.previousElementSibling?.before(state.selected);
  $('moveDownBtn').onclick = () => state.selected?.nextElementSibling?.after(state.selected);
  $('uploadBtn').onclick = () => { state.uploadMode='image'; $('fileInput').click(); };
  $('mediaUploadBtn').onclick = () => { state.uploadMode='image'; $('fileInput').click(); };
  $('bgUploadBtn').onclick = () => { state.uploadMode='background'; $('fileInput').click(); };
  $('clearBgBtn').onclick = () => update('backgroundImage',''); $('fileInput').onchange = uploadImage;
  $('hideBtn').onclick = () => update('hidden', !(styleRecord()?.hidden));
  $('resetElementBtn').onclick = () => { const draft=sectionDraft(); if(draft&&state.selector){pushHistory();delete draft.elementStyles[state.selector];applyDraft();renderInspector();} };
  $('exportBtn').onclick = () => { const blob=new Blob([JSON.stringify(state.draft,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ceybreez-${state.page}-draft.json`;a.click();URL.revokeObjectURL(a.href); };
  document.querySelectorAll('[data-width]').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('[data-width]').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); state.device=btn.dataset.device; frame.style.width=btn.dataset.width;
    const doc=frame.contentDocument; if(doc?.body){doc.body.classList.remove('cb-builder-desktop','cb-builder-tablet','cb-builder-mobile');doc.body.classList.add(`cb-builder-${state.device}`);} applyDraft(); if(state.selected)renderInspector();
  });
  document.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => {
    const type = btn.dataset.add;
    if (['heading','text','button','image'].includes(type)) addElement(type);
    else setStatus('For reliable publishing, add Heading, Text, Button or Image inside a selected section.', true);
  });
  document.querySelectorAll('[data-left-tab]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-left-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.left-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$(`${btn.dataset.leftTab}Tab`).classList.add('active');});
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.right-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$(`${btn.dataset.tab}Tab`).classList.add('active');});

  bindInspector(); loadPage();
})();
