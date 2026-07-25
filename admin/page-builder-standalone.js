(() => {
  'use strict';

  const API_BASE = 'https://ceybreez-contact-api.ceybreez.workers.dev';
  const PAGES = {
    home: '../index.html', villas: '../villas.html', apartments: '../apartments.html',
    homestays: '../homestays.html', tours: '../tours.html', 'tour-details': '../tour-details.html',
    services: '../services.html', contact: '../contact.html', privacy: '../privacy.html',
    terms: '../terms.html', '404': '../404.html'
  };
  const DEVICE_WIDTHS = { desktop: 1200, tablet: 768, mobile: 390 };
  const $ = id => document.getElementById(id);
  const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const parse = v => { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return {}; } };

  const state = {
    token: localStorage.getItem('CEYBREEZ_ADMIN_TOKEN') || '',
    page: 'home', device: 'desktop', sections: [], section: null,
    selected: null, selector: '', styles: {}, custom: [], sectionBackground: {},
    zoom: 1, dirty: false, history: [], future: [], frameReady: false
  };

  const auth = () => ({'Content-Type':'application/json', Authorization:`Bearer ${state.token}`});
  const uploadAuth = () => ({Authorization:`Bearer ${state.token}`});
  const doc = () => $('previewFrame')?.contentDocument || null;

  function toast(message) {
    const el = $('toast'); if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2000);
  }
  function status(message, bad = false) {
    const el = $('saveStatus'); if (!el) return;
    el.textContent = message; el.style.color = bad ? '#bd3838' : '';
  }
  function dirty() { state.dirty = true; status('Unsaved'); }
  function snapshot() {
    state.history.push(JSON.stringify({styles:state.styles, custom:state.custom, bg:state.sectionBackground}));
    if (state.history.length > 40) state.history.shift(); state.future = [];
  }

  function gate() {
    if (state.token) showApp(); else $('loginGate').classList.remove('hidden');
  }
  function showApp() {
    $('loginGate').classList.add('hidden'); $('builderApp').classList.remove('hidden'); init();
  }

  async function init() {
    $('pageSelect').innerHTML = Object.keys(PAGES).map(p => `<option value="${p}">${p[0].toUpperCase()+p.slice(1)}</option>`).join('');
    bind();
    await loadSections();
    loadFrame();
  }

  function bind() {
    $('loginForm').addEventListener('submit', e => {
      e.preventDefault(); state.token = $('tokenInput').value.trim(); if (!state.token) return;
      localStorage.setItem('CEYBREEZ_ADMIN_TOKEN', state.token); showApp();
    });
    $('pageSelect').addEventListener('change', async e => {
      state.page = e.target.value; state.section = null; clearSelection(); await loadSections(); loadFrame();
    });
    document.querySelectorAll('[data-device]').forEach(btn => btn.addEventListener('click', () => setDevice(btn.dataset.device)));
    $('refreshBtn').addEventListener('click', async () => { await loadSections(); loadFrame(); });
    $('previewBtn').addEventListener('click', () => window.open(PAGES[state.page], '_blank'));
    $('saveBtn').addEventListener('click', save);
    $('undoBtn').addEventListener('click', undo);
    $('redoBtn').addEventListener('click', redo);
    $('zoomIn').addEventListener('click', () => setZoom(Math.min(1.3, state.zoom + .1)));
    $('zoomOut').addEventListener('click', () => setZoom(Math.max(.5, state.zoom - .1)));

    // Stable delegated section selection — no button replacement during a click.
    $('sectionList').addEventListener('click', e => {
      const button = e.target.closest('.section-item');
      if (!button) return;
      e.preventDefault(); e.stopPropagation(); selectSectionByKey(button.dataset.key);
    });
    $('sectionList').addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const button = e.target.closest('.section-item'); if (!button) return;
      e.preventDefault(); selectSectionByKey(button.dataset.key);
    });

    ['backgroundType','sectionBgColor','sectionBgImage','sectionBgSize','sectionBgWidth','sectionBgHeight',
     'sectionBgPosX','sectionBgPosY','sectionBgRepeat','sectionBgOverlay','sectionHeightMode','sectionHeightValue',
     'sectionPaddingTop','sectionPaddingBottom','sectionRadius','slideDuration','slideEffect'].forEach(id => {
      const el = $(id); if (el) el.addEventListener(el.type === 'range' || el.type === 'number' || el.type === 'color' ? 'input' : 'change', changeSection);
    });
    $('uploadBgBtn').addEventListener('click', () => $('sectionBgFile').click());
    $('sectionBgFile').addEventListener('change', uploadSectionBackground);
    $('addSlidesBtn').addEventListener('click', () => $('slideFiles').click());
    $('slideFiles').addEventListener('change', uploadSlides);
    $('removeBackgroundBtn').addEventListener('click', removeSectionBackground);

    document.querySelectorAll('[data-add-element]').forEach(btn => btn.addEventListener('click', () => addCustomElement(btn.dataset.addElement)));
    $('duplicateElementBtn').addEventListener('click', duplicateSelected);
    $('deleteElementBtn').addEventListener('click', deleteSelected);
    $('bringForwardBtn').addEventListener('click', () => layer(1));
    $('sendBackwardBtn').addEventListener('click', () => layer(-1));
    $('resetBtn').addEventListener('click', resetSelected);
    $('useMainBtn').addEventListener('click', useDesktopSettings);
    $('browseImage').addEventListener('click', () => $('imageFile').click());
    $('imageFile').addEventListener('change', uploadImage);

    ['widthValue','heightValue','xValue','yValue','rotateValue','opacityValue','fontSize','lineHeight','radiusValue','paddingValue','zValue']
      .forEach(id => $(id).addEventListener('input', () => numericChange(id)));
    ['fontFamily','shadowValue'].forEach(id => $(id).addEventListener('change', () => simpleChange(id)));
    ['textColor','bgColor'].forEach(id => $(id).addEventListener('input', () => simpleChange(id)));
    $('textValue').addEventListener('input', () => {
      if (!state.selected) return; state.selected.textContent = $('textValue').value; syncCustomContent(); dirty();
    });
    $('imageValue').addEventListener('change', () => {
      if (!state.selected) return; state.selected.src = $('imageValue').value; syncCustomContent(); dirty();
    });
    document.querySelectorAll('[data-format]').forEach(btn => btn.addEventListener('click', () => toggleFormat(btn.dataset.format)));
    document.querySelectorAll('[data-align]').forEach(btn => btn.addEventListener('click', () => align(btn.dataset.align)));
    document.querySelectorAll('[data-mobile-panel]').forEach(btn => btn.addEventListener('click', () => setMobilePanel(btn.dataset.mobilePanel)));
    window.addEventListener('beforeunload', e => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });
  }

  async function loadSections() {
    status('Loading...');
    try {
      const res = await fetch(`${API_BASE}/api/admin/page-sections?page=${encodeURIComponent(state.page)}`, {headers:auth()});
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Unable to load sections');
      state.sections = Array.isArray(data) ? data : (data.sections || []);
      renderSections(); status('Ready');
    } catch (error) {
      status('Login required', true); toast(error.message);
    }
  }

  function loadFrame() {
    state.frameReady = false;
    const frame = $('previewFrame');
    frame.onload = async () => {
      state.frameReady = true;
      prepareFrame();
      mergeStaticSections();
      if (!state.section && state.sections.length) selectSectionByKey(state.sections[0].sectionKey);
      else if (state.section) activateSection(state.section.sectionKey, false);
    };
    frame.src = `${PAGES[state.page]}?builderPreview=1&v=${Date.now()}`;
  }

  function mergeStaticSections() {
    const d = doc(); if (!d) return;
    const found = [...d.querySelectorAll('[data-section]')].map((el, index) => {
      const key = String(el.dataset.section || '').trim(); if (!key) return null;
      const existing = state.sections.find(s => String(s.sectionKey) === key);
      if (existing) return existing;
      const heading = el.querySelector('h1,h2,h3');
      return {id:`static:${key}`, page:state.page, sectionKey:key, sectionType:el.tagName.toLowerCase(),
        title:(heading?.textContent || key).replace(/\s+/g,' ').trim(), sortOrder:index+1, isActive:1, settings:'{}', __synthetic:true};
    }).filter(Boolean);
    state.sections.forEach(s => { if (!found.some(f => String(f.sectionKey) === String(s.sectionKey))) found.push(s); });
    state.sections = found; renderSections();
  }

  function renderSections() {
    const list = $('sectionList');
    if (!state.sections.length) { list.innerHTML = '<div class="left-help">No sections found.</div>'; return; }
    list.innerHTML = [...state.sections].sort((a,b)=>num(a.sortOrder)-num(b.sortOrder)).map((s,i) => {
      const active = state.section && String(state.section.sectionKey) === String(s.sectionKey);
      return `<button type="button" class="section-item ${active?'active':''}" data-key="${esc(s.sectionKey)}"><strong>${esc(s.title||s.sectionKey||`Section ${i+1}`)}</strong><span>${esc(s.sectionKey||'section')} · ${(s.isActive===0||s.active===0||s.isVisible===0)?'Hidden':'Active'}</span></button>`;
    }).join('');
  }

  function selectSectionByKey(key) {
    const section = state.sections.find(s => String(s.sectionKey) === String(key)); if (!section) return;
    state.section = section;
    const settings = parse(section.settings);
    state.styles = settings.elementStyles || {};
    state.custom = settings.customElements || [];
    state.sectionBackground = normalizeBackground(settings.sectionBackground || {});
    clearSelection();
    document.querySelectorAll('.section-item').forEach(b => b.classList.toggle('active', b.dataset.key === String(key)));
    $('editingLabel').textContent = `Editing: ${section.title || section.sectionKey}`;
    $('sectionName').textContent = section.title || section.sectionKey || 'Section';
    fillSectionInspector();
    activateSection(key, true);
  }

  function activateSection(key, scroll) {
    const d = doc(); if (!d) return;
    d.querySelectorAll('.pb-edit-section').forEach(el => el.classList.remove('pb-edit-section'));
    // Welcome is a fixed overlay. Show it only while editing Welcome.
    const welcome = d.getElementById('welcomeScreen');
    if (welcome) {
      const isWelcome = key === 'welcome';
      welcome.style.setProperty('display', isWelcome ? 'flex' : 'none', 'important');
      welcome.style.pointerEvents = isWelcome ? 'auto' : 'none';
    }
    const target = targetSection(); if (!target) return;
    target.classList.add('pb-edit-section');
    renderCustomElements(); assignStableIds(target); applyAll();
    if (scroll) target.scrollIntoView({block:'start', behavior:'smooth'});
  }

  function targetSection() {
    const d = doc(); if (!d || !state.section) return null;
    return d.querySelector(`[data-section="${CSS.escape(String(state.section.sectionKey||''))}"]`);
  }

  function prepareFrame() {
    const d = doc(); if (!d || d.documentElement.dataset.pbPrepared === '1') return;
    d.documentElement.dataset.pbPrepared = '1';
    d.body.classList.add('pb-builder-preview');
    const style = d.createElement('style');
    style.textContent = `
      html{scroll-behavior:auto!important} body{overflow:auto!important}
      .pb-edit-section{outline:2px solid #0b9b8b!important;outline-offset:-2px;position:relative!important}
      .pb-selected{outline:2px solid #08a18e!important;outline-offset:3px;cursor:move!important}
      .pb-selected::after{content:attr(data-pb-label);position:absolute;left:0;top:-24px;background:#087f72;color:#fff;font:11px/1 Inter,sans-serif;padding:5px 7px;border-radius:4px;z-index:2147483647;white-space:nowrap}
      [data-pb-custom="1"],[data-pb-editor-custom="1"]{box-sizing:border-box;max-width:100%}
      a,button{pointer-events:auto!important}
    `;
    d.head.appendChild(style);
    d.addEventListener('click', frameClick, true);
    d.addEventListener('pointerdown', framePointerDown, true);
    d.addEventListener('dblclick', frameDoubleClick, true);
  }

  function frameClick(e) {
    const section = e.target.closest('[data-section]');
    if (!section) return;
    e.preventDefault(); e.stopPropagation();
    if (!state.section || section.dataset.section !== state.section.sectionKey) {
      selectSectionByKey(section.dataset.section); return;
    }
    selectElement(resolveSelectable(e.target, section));
  }
  function frameDoubleClick(e) {
    if (!state.selected || !state.selected.matches('h1,h2,h3,h4,h5,h6,p,span,a,button')) return;
    e.preventDefault(); state.selected.contentEditable = 'true'; state.selected.focus();
    const finish = () => { state.selected.contentEditable = 'false'; $('textValue').value = state.selected.textContent || ''; syncCustomContent(); dirty(); };
    state.selected.addEventListener('blur', finish, {once:true});
  }
  function resolveSelectable(node, section) {
    const custom = node.closest('[data-pb-id],[data-pb-custom="1"],[data-pb-editor-custom="1"]');
    if (custom && section.contains(custom)) return custom;
    const meaningful = node.closest('[data-field],h1,h2,h3,h4,h5,h6,p,img,a,button,video,iframe,.thing-card,.featured-card,.cms-card');
    return meaningful && section.contains(meaningful) ? meaningful : section;
  }

  function stablePath(el, section) {
    if (el === section) return 'root';
    const parts = []; let node = el;
    while (node && node !== section) {
      const parent = node.parentElement; if (!parent) break;
      const siblings = [...parent.children].filter(x => !x.classList.contains('cms-bg-slideshow'));
      parts.unshift(Math.max(0, siblings.indexOf(node)).toString(36)); node = parent;
    }
    return parts.join('-') || 'root';
  }
  function assignStableIds(section) {
    const key = String(section.dataset.section || 'section').replace(/[^a-zA-Z0-9_-]/g,'_');
    [section, ...section.querySelectorAll('*')].forEach(node => {
      node.dataset.pbUid = node.dataset.pbId ? `custom-${node.dataset.pbId}` : `${key}-${stablePath(node, section)}`;
    });
  }

  function selectElement(el) {
    if (!el) return; const section = targetSection(); if (!section) return;
    assignStableIds(section);
    doc().querySelectorAll('.pb-selected').forEach(n => n.classList.remove('pb-selected'));
    state.selected = el; state.selector = `[data-pb-uid="${CSS.escape(el.dataset.pbUid)}"]`;
    el.classList.add('pb-selected'); el.dataset.pbLabel = friendlyName(el);
    $('emptyInspector').classList.add('hidden'); $('elementInspector').classList.remove('hidden'); fillInspector();
  }
  function friendlyName(el) {
    if (el.dataset.field) return el.dataset.field.replace(/[-_]/g,' ');
    if (el.dataset.pbId) return el.dataset.pbType || el.tagName.toLowerCase();
    if (el.alt) return `Image: ${el.alt}`;
    return el.tagName.toLowerCase();
  }
  function clearSelection() {
    try { doc()?.querySelectorAll('.pb-selected').forEach(n => n.classList.remove('pb-selected')); } catch {}
    state.selected = null; state.selector = '';
    $('emptyInspector').classList.remove('hidden'); $('elementInspector').classList.add('hidden');
  }

  function record(create=true) {
    if (!state.selector) return null;
    let item = state.styles[state.selector];
    if (!item && create) item = state.styles[state.selector] = {desktop:{},tablet:{},mobile:{}};
    if (!item) return null;
    if (!item[state.device] && create) item[state.device] = {};
    return item[state.device];
  }
  function mergedRecord(device = state.device) {
    const item = state.styles[state.selector] || {};
    return device === 'desktop' ? {...(item.desktop||{})} : {...(item.desktop||{}), ...(item[device]||{})};
  }

  function currentSectionWidth() { return Math.max(1, targetSection()?.getBoundingClientRect().width || DEVICE_WIDTHS[state.device]); }
  function fillInspector() {
    const el = state.selected; if (!el) return;
    const r = mergedRecord(); const rect = el.getBoundingClientRect(); const sectionRect = targetSection().getBoundingClientRect();
    $('selectedName').textContent = friendlyName(el);
    const isImage = el.tagName === 'IMG';
    $('imageControl').classList.toggle('hidden', !isImage); $('textControl').classList.toggle('hidden', isImage);
    if (isImage) $('imageValue').value = el.getAttribute('src') || ''; else $('textValue').value = el.textContent || '';
    const width = r.widthPct !== undefined ? sectionRect.width * r.widthPct / 100 : (r.width ?? rect.width);
    const height = r.height === 'auto' ? rect.height : (r.height ?? rect.height);
    const x = r.xPct !== undefined ? sectionRect.width * r.xPct / 100 : (r.x ?? 0);
    const values = {widthValue:Math.round(width), heightValue:Math.round(height), xValue:Math.round(x), yValue:Math.round(r.y??0),
      rotateValue:r.rotate??0, opacityValue:r.opacity??1, fontSize:(r.fontSize ?? parseFloat(getComputedStyle(el).fontSize) ?? 16),
      lineHeight:(r.lineHeight ?? parseFloat(getComputedStyle(el).lineHeight) ?? 20), radiusValue:(r.borderRadius ?? parseFloat(getComputedStyle(el).borderRadius) ?? 0),
      paddingValue:(r.padding ?? parseFloat(getComputedStyle(el).padding) ?? 0), zValue:r.zIndex??0};
    Object.entries(values).forEach(([id,v]) => { if ($(id)) $(id).value = Math.round(num(v)*100)/100; });
    $('fontFamily').value = r.fontFamily || '';
    $('shadowValue').value = r.boxShadow || '';
    $('textColor').value = toHex(r.color || getComputedStyle(el).color, '#222222');
    $('bgColor').value = toHex(r.backgroundColor || getComputedStyle(el).backgroundColor, '#ffffff');
  }
  function toHex(v,f) { if (!v || v==='transparent' || v.includes('rgba(0, 0, 0, 0)')) return f; if (v.startsWith('#')) return v.slice(0,7); const m=v.match(/\d+/g); return m ? '#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('') : f; }

  function numericChange(id) {
    if (!state.selected) return; snapshot();
    const r = record(); const value = num($(id).value); const sectionWidth = currentSectionWidth();
    if (id === 'widthValue') { r.widthPct = Math.max(1, Math.min(100, value / sectionWidth * 100)); delete r.width; if (state.selected.tagName === 'IMG') r.height = 'auto'; }
    else if (id === 'heightValue') r.height = value;
    else if (id === 'xValue') { r.xPct = value / sectionWidth * 100; delete r.x; }
    else {
      const map = {yValue:'y',rotateValue:'rotate',opacityValue:'opacity',fontSize:'fontSize',lineHeight:'lineHeight',radiusValue:'borderRadius',paddingValue:'padding',zValue:'zIndex'};
      r[map[id]] = value;
    }
    r.referenceWidth = DEVICE_WIDTHS[state.device]; r.fluid = true;
    applySelected(); dirty();
  }
  function simpleChange(id) {
    if (!state.selected) return; snapshot(); const map={fontFamily:'fontFamily',shadowValue:'boxShadow',textColor:'color',bgColor:'backgroundColor'};
    record()[map[id]] = $(id).value; applySelected(); dirty();
  }
  function toggleFormat(type) {
    if (!state.selected) return; snapshot(); const r=record();
    if (type==='bold') r.fontWeight = r.fontWeight==='700' ? '' : '700';
    if (type==='italic') r.fontStyle = r.fontStyle==='italic' ? '' : 'italic';
    if (type==='underline') r.textDecoration = r.textDecoration==='underline' ? '' : 'underline';
    applySelected(); dirty();
  }
  function align(value) { if (!state.selected) return; snapshot(); record().textAlign=value; applySelected(); dirty(); }

  function responsiveRecord(byDevice, device, sectionWidth) {
    const desktop = {...(byDevice.desktop||{})};
    const override = device==='desktop' ? {} : {...(byDevice[device]||{})};
    const r = {...desktop, ...override};
    const baseWidth = DEVICE_WIDTHS[device] || sectionWidth;
    const ratio = Math.min(1, sectionWidth / 1200);
    if (device !== 'desktop') {
      if (override.fontSize === undefined && desktop.fontSize !== undefined) r.fontSize = Math.max(12, desktop.fontSize * Math.max(.72, ratio));
      if (override.lineHeight === undefined && desktop.lineHeight !== undefined) r.lineHeight = Math.max(14, desktop.lineHeight * Math.max(.78, ratio));
      if (override.padding === undefined && desktop.padding !== undefined) r.padding = Math.max(4, desktop.padding * Math.max(.65, ratio));
      if (override.y === undefined && desktop.y !== undefined) r.y = desktop.y * Math.max(.55, ratio);
    }
    if (r.widthPct === undefined && r.width !== undefined) r.widthPct = Math.min(100, r.width / (r.referenceWidth || 1200) * 100);
    if (r.xPct === undefined && r.x !== undefined) r.xPct = r.x / (r.referenceWidth || 1200) * 100;
    return r;
  }

  function applyAll() {
    const section = targetSection(); if (!section) return;
    renderCustomElements(); assignStableIds(section);
    const sectionWidth = Math.max(1, section.getBoundingClientRect().width);
    Object.entries(state.styles).forEach(([selector, byDevice]) => {
      let el; try { el = section.querySelector(selector); } catch { return; }
      if (!el) return; applyRecord(el, responsiveRecord(byDevice, state.device, sectionWidth), sectionWidth);
    });
    applySectionPreview(); ensureSectionHeight(section);
    if (state.selector) { try { state.selected=section.querySelector(state.selector); } catch {} if (state.selected) state.selected.classList.add('pb-selected'); }
  }
  function applySelected() {
    if (!state.selected) return; const sectionWidth=currentSectionWidth();
    const by=state.styles[state.selector]||{}; applyRecord(state.selected,responsiveRecord(by,state.device,sectionWidth),sectionWidth); ensureSectionHeight(targetSection());
  }
  function applyRecord(el, r, sectionWidth) {
    if (!el || !r) return;
    const isCustom = !!el.dataset.pbId;
    const widthPct = r.widthPct !== undefined ? Math.max(1, Math.min(100, num(r.widthPct))) : null;
    const xPct = r.xPct !== undefined ? num(r.xPct) : 0;
    const y = num(r.y); const rotate = num(r.rotate);
    el.style.boxSizing='border-box';
    if (isCustom) {
      const parent=el.parentElement; if (parent && getComputedStyle(parent).position==='static') parent.style.position='relative';
      el.style.position='absolute'; el.style.left=`${xPct}%`; el.style.top=`${y}px`;
      el.style.width=widthPct!==null?`${widthPct}%`:'auto';
      el.style.maxWidth=`${Math.max(1,100-xPct)}%`;
      el.style.height=r.height==='auto'||r.height===undefined?'auto':`${num(r.height)}px`;
      el.style.transform=`rotate(${rotate}deg)`; el.style.margin='0';
    } else {
      el.style.position='relative';
      el.style.width=widthPct!==null?`${widthPct}%`:''; el.style.maxWidth='100%';
      el.style.height=r.height==='auto'||r.height===undefined?'auto':`${num(r.height)}px`;
      el.style.transform=`translate(${xPct/100*sectionWidth}px, ${y}px) rotate(${rotate}deg)`;
      if (el.tagName==='IMG') { el.style.objectFit='cover'; if (r.height==='auto'||r.height===undefined) el.style.height='auto'; }
    }
    ['fontSize','lineHeight','borderRadius','padding'].forEach(k => el.style[k]=r[k]!==undefined&&r[k]!==''?`${num(r[k])}px`:'');
    ['opacity','fontFamily','fontWeight','fontStyle','textDecoration','textAlign','color','backgroundColor','boxShadow','zIndex'].forEach(k => el.style[k]=r[k]!==undefined?String(r[k]):'');
    if ((el.tagName==='A'||el.tagName==='BUTTON') && widthPct!==null) { el.style.display='inline-flex'; el.style.alignItems='center'; el.style.justifyContent='center'; whiteSpaceFix(el); }
  }
  function whiteSpaceFix(el){ el.style.whiteSpace='normal'; el.style.textWrap='balance'; }
  function ensureSectionHeight(section) {
    if (!section) return; let bottom=0; const sectionRect=section.getBoundingClientRect();
    section.querySelectorAll('[data-pb-id]').forEach(el => { const r=el.getBoundingClientRect(); bottom=Math.max(bottom,r.bottom-sectionRect.top); });
    if (bottom>0) section.style.minHeight=`${Math.ceil(bottom+24)}px`;
  }

  let drag=null;
  function framePointerDown(e) {
    if (e.button!==0) return; const section=e.target.closest('[data-section]');
    if (!section || !state.section || section.dataset.section!==state.section.sectionKey) return;
    const el=resolveSelectable(e.target,section); selectElement(el);
    if (!el.dataset.pbId) return; // Keep natural page elements in document flow.
    const r=mergedRecord(); drag={sx:e.clientX,sy:e.clientY,xPct:num(r.xPct),y:num(r.y),sectionWidth:currentSectionWidth()};
    doc().addEventListener('pointermove',framePointerMove,true); doc().addEventListener('pointerup',framePointerUp,true);
    e.preventDefault(); e.stopPropagation();
  }
  function framePointerMove(e) {
    if (!drag || !state.selected) return; const r=record();
    r.xPct=Math.max(0,Math.min(99,drag.xPct+(e.clientX-drag.sx)/drag.sectionWidth*100)); r.y=Math.max(0,drag.y+(e.clientY-drag.sy)); r.fluid=true;
    applySelected(); $('xValue').value=Math.round(r.xPct/100*drag.sectionWidth); $('yValue').value=Math.round(r.y); dirty(); e.preventDefault();
  }
  function framePointerUp() { if (drag) snapshot(); drag=null; doc().removeEventListener('pointermove',framePointerMove,true); doc().removeEventListener('pointerup',framePointerUp,true); }

  function renderCustomElements() {
    const section=targetSection(); if (!section) return;
    section.querySelectorAll('[data-pb-editor-custom="1"],[data-pb-custom="1"]').forEach(n=>n.remove());
    state.custom.filter(x=>x.sectionKey===state.section.sectionKey).forEach(item=>{
      let el;
      if(item.type==='image'){el=doc().createElement('img');el.src=item.url||'../images/cover.jpg';el.alt=item.alt||'Custom image';}
      else if(item.type==='button'){el=doc().createElement('a');el.href=item.url||'#';el.textContent=item.text||'Button';}
      else if(item.type==='divider'){el=doc().createElement('div');el.style.height='1px';el.style.background=item.color||'#c79b52';}
      else if(item.type==='spacer'){el=doc().createElement('div');}
      else if(item.type==='badge'){el=doc().createElement('span');el.textContent=item.text||'Badge';}
      else {el=doc().createElement(item.type==='heading'?'h2':'p');el.textContent=item.text||(item.type==='heading'?'New heading':'New text');}
      el.dataset.pbEditorCustom='1'; el.dataset.pbId=item.id; el.dataset.pbType=item.type; el.dataset.pbUid=`custom-${item.id}`;
      section.appendChild(el);
    });
  }
  function addCustomElement(type) {
    if (!state.section || !targetSection()) return toast('Select a section first');
    const id=`pb-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    state.custom.push({id,type,sectionKey:state.section.sectionKey,text:type==='heading'?'New heading':type==='button'?'Button':type==='badge'?'Badge':'New text',url:type==='button'?'#':''});
    const selector=`[data-pb-uid="custom-${id}"]`; state.styles[selector]={desktop:{xPct:5,y:20,widthPct:type==='image'?40:type==='divider'?70:type==='spacer'?30:35,height:type==='image'?'auto':undefined,fontSize:type==='heading'?42:16,padding:type==='button'?14:0,referenceWidth:1200,fluid:true},tablet:{},mobile:{}};
    renderCustomElements(); assignStableIds(targetSection()); state.selector=selector; state.selected=targetSection().querySelector(selector); if(state.selected)selectElement(state.selected); applyAll(); dirty();
  }
  function selectedCustom(){const id=state.selected?.dataset?.pbId;return id?state.custom.find(x=>String(x.id)===String(id)):null;}
  function syncCustomContent(){const item=selectedCustom();if(!item||!state.selected)return;if(state.selected.tagName==='IMG'){item.url=state.selected.getAttribute('src')||'';item.alt=state.selected.alt||'';}else item.text=state.selected.textContent||'';}
  function duplicateSelected(){const item=selectedCustom();if(!item)return toast('Only added elements can be duplicated');snapshot();const copy={...item,id:`pb-${Date.now()}-${Math.random().toString(36).slice(2,7)}`};state.custom.push(copy);const old=state.styles[state.selector]||{desktop:{},tablet:{},mobile:{}};const selector=`[data-pb-uid="custom-${copy.id}"]`;state.styles[selector]=JSON.parse(JSON.stringify(old));state.styles[selector].desktop.y=num(state.styles[selector].desktop.y)+20;renderCustomElements();assignStableIds(targetSection());selectElement(targetSection().querySelector(selector));applyAll();dirty();}
  function deleteSelected(){const item=selectedCustom();if(!item)return toast('Original page items cannot be deleted');snapshot();state.custom=state.custom.filter(x=>x.id!==item.id);delete state.styles[state.selector];renderCustomElements();clearSelection();dirty();}
  function layer(delta){if(!state.selected)return;const r=record();r.zIndex=num(r.zIndex)+delta;applySelected();fillInspector();dirty();}

  function resetSelected(){if(!state.selector)return;snapshot();delete state.styles[state.selector];state.selected?.removeAttribute('style');applyAll();fillInspector();dirty();}
  function useDesktopSettings(){if(state.device==='desktop'||!state.selector)return;snapshot();const all=state.styles[state.selector];if(all)all[state.device]={};applyAll();fillInspector();dirty();toast('Using Desktop settings');}
  function undo(){if(!state.history.length)return;state.future.push(JSON.stringify({styles:state.styles,custom:state.custom,bg:state.sectionBackground}));const x=JSON.parse(state.history.pop());state.styles=x.styles;state.custom=x.custom;state.sectionBackground=x.bg;applyAll();fillInspector();dirty();}
  function redo(){if(!state.future.length)return;state.history.push(JSON.stringify({styles:state.styles,custom:state.custom,bg:state.sectionBackground}));const x=JSON.parse(state.future.pop());state.styles=x.styles;state.custom=x.custom;state.sectionBackground=x.bg;applyAll();fillInspector();dirty();}

  function normalizeBackground(bg) { return {type:bg.type||'none',color:bg.color||'#ffffff',image:bg.image||'',size:bg.size||'cover',customWidth:num(bg.customWidth,100),customHeight:num(bg.customHeight,100),positionX:num(bg.positionX,50),positionY:num(bg.positionY,50),repeat:bg.repeat||'no-repeat',overlay:num(bg.overlay,0),slides:Array.isArray(bg.slides)?bg.slides:[],duration:num(bg.duration,5000),effect:bg.effect||'fade',borderRadius:num(bg.borderRadius,0),deviceHeights:bg.deviceHeights||{desktop:{mode:'auto'},tablet:{mode:'auto'},mobile:{mode:'auto'}}}; }
  function fillSectionInspector(){const bg=state.sectionBackground=normalizeBackground(state.sectionBackground);$('backgroundType').value=bg.type;$('sectionBgColor').value=bg.color;$('sectionBgImage').value=bg.image;$('sectionBgSize').value=bg.size;$('sectionBgWidth').value=bg.customWidth;$('sectionBgHeight').value=bg.customHeight;$('sectionBgPosX').value=bg.positionX;$('sectionBgPosY').value=bg.positionY;$('sectionBgRepeat').value=bg.repeat;$('sectionBgOverlay').value=bg.overlay;$('sectionRadius').value=bg.borderRadius;const dh=bg.deviceHeights[state.device]||{};$('sectionHeightMode').value=dh.mode||'auto';$('sectionHeightValue').value=dh.value??'';$('sectionPaddingTop').value=dh.paddingTop??'';$('sectionPaddingBottom').value=dh.paddingBottom??'';$('slideDuration').value=bg.duration;$('slideEffect').value=bg.effect;toggleBgControls();renderSlides();}
  function toggleBgControls() {const t=$('backgroundType').value;$('backgroundColorControls').classList.toggle('hidden',t!=='color');$('backgroundImageControls').classList.toggle('hidden',t!=='image');$('slideshowControls').classList.toggle('hidden',t!=='slideshow');$('customBgSize').classList.toggle('hidden',$('sectionBgSize').value!=='custom');}
  function changeSection(){snapshot();const bg=state.sectionBackground;bg.type=$('backgroundType').value;bg.color=$('sectionBgColor').value;bg.image=$('sectionBgImage').value.trim();bg.size=$('sectionBgSize').value;bg.customWidth=num($('sectionBgWidth').value,100);bg.customHeight=num($('sectionBgHeight').value,100);bg.positionX=num($('sectionBgPosX').value,50);bg.positionY=num($('sectionBgPosY').value,50);bg.repeat=$('sectionBgRepeat').value;bg.overlay=num($('sectionBgOverlay').value);bg.borderRadius=num($('sectionRadius').value);bg.duration=num($('slideDuration').value,5000);bg.effect=$('slideEffect').value;bg.deviceHeights[state.device]={mode:$('sectionHeightMode').value,value:$('sectionHeightValue').value,paddingTop:$('sectionPaddingTop').value,paddingBottom:$('sectionPaddingBottom').value};toggleBgControls();applySectionPreview();dirty();}
  function applySectionPreview(){const section=targetSection();if(!section)return;const bg=state.sectionBackground||{};section.style.backgroundImage='';section.style.backgroundColor='';section.style.backgroundSize='';section.style.backgroundPosition='';section.style.backgroundRepeat='';const dh=bg.deviceHeights?.[state.device]||{};section.style.height='';section.style.minHeight='';section.style.maxHeight='';if(dh.mode==='fixed'&&dh.value!==''){section.style.height=`${num(dh.value)}px`;section.style.minHeight=`${num(dh.value)}px`;}else if(dh.mode==='min'&&dh.value!=='')section.style.minHeight=`${num(dh.value)}px`;else if(dh.mode==='screen')section.style.minHeight='100vh';if(dh.paddingTop!=='')section.style.paddingTop=`${num(dh.paddingTop)}px`;if(dh.paddingBottom!=='')section.style.paddingBottom=`${num(dh.paddingBottom)}px`;section.style.borderRadius=bg.borderRadius?`${bg.borderRadius}px`:'';const overlay=Math.max(0,Math.min(90,num(bg.overlay)))/100;const img=u=>overlay?`linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url("${u}")`:`url("${u}")`;if(bg.type==='color')section.style.backgroundColor=bg.color;if(bg.type==='image'&&bg.image){section.style.backgroundImage=img(bg.image);section.style.backgroundSize=bg.size==='custom'?`${bg.customWidth}% ${bg.customHeight}%`:bg.size;section.style.backgroundPosition=`${bg.positionX}% ${bg.positionY}%`;section.style.backgroundRepeat=bg.repeat;} }
  function renderSlides(){$('slideList').innerHTML=(state.sectionBackground.slides||[]).map((url,i)=>`<div class="slide-row"><img src="${esc(url)}"><span>${esc(url)}</span><button type="button" data-slide-remove="${i}">×</button></div>`).join('');$('slideList').querySelectorAll('[data-slide-remove]').forEach(b=>b.onclick=()=>{state.sectionBackground.slides.splice(num(b.dataset.slideRemove),1);renderSlides();dirty();});}
  async function uploadFile(file){const fd=new FormData();fd.append('file',file);fd.append('folder','page-builder');const res=await fetch(`${API_BASE}/api/admin/upload-image`,{method:'POST',headers:uploadAuth(),body:fd});const data=await res.json();if(!res.ok)throw new Error(data.error||'Upload failed');return data.url;}
  async function uploadSectionBackground(){const file=$('sectionBgFile').files[0];if(!file)return;try{status('Uploading...');const url=await uploadFile(file);$('sectionBgImage').value=url;state.sectionBackground.image=url;state.sectionBackground.type='image';$('backgroundType').value='image';toggleBgControls();applySectionPreview();dirty();toast('Background uploaded');}catch(e){status('Upload failed',true);toast(e.message);}}
  async function uploadSlides(){const files=[...$('slideFiles').files];if(!files.length)return;try{status('Uploading...');for(const file of files)state.sectionBackground.slides.push(await uploadFile(file));state.sectionBackground.type='slideshow';$('backgroundType').value='slideshow';renderSlides();toggleBgControls();dirty();toast('Slides uploaded');}catch(e){status('Upload failed',true);toast(e.message);}}
  async function uploadImage(){const file=$('imageFile').files[0];if(!file||!state.selected)return;try{status('Uploading...');const url=await uploadFile(file);$('imageValue').value=url;state.selected.src=url;syncCustomContent();dirty();toast('Image uploaded');}catch(e){status('Upload failed',true);toast(e.message);}}
  function removeSectionBackground(){snapshot();state.sectionBackground=normalizeBackground({type:'none'});fillSectionInspector();applySectionPreview();dirty();}

  function setDevice(device){state.device=device;document.querySelectorAll('[data-device]').forEach(b=>b.classList.toggle('active',b.dataset.device===device));$('frameShell').className=`frame-shell ${device}`;$('deviceNote').classList.toggle('hidden',device==='desktop');fillSectionInspector();applyAll();fillInspector();}
  function setZoom(z){state.zoom=Math.round(z*10)/10;$('frameShell').style.transform=`scale(${state.zoom})`;$('zoomLabel').textContent=`${Math.round(state.zoom*100)}%`;}
  function setMobilePanel(panel){document.body.dataset.mobilePanel=panel;document.querySelectorAll('[data-mobile-panel]').forEach(b=>b.classList.toggle('active',b.dataset.mobilePanel===panel));}

  async function save(){if(!state.section)return toast('Select a section first');status('Saving...');const settings={...parse(state.section.settings),elementStyles:state.styles,customElements:state.custom,sectionBackground:state.sectionBackground,builderVersion:4};const payload={...state.section,settings};if(payload.__synthetic||String(payload.id||'').startsWith('static:')){delete payload.id;delete payload.__synthetic;}delete payload.createdAt;delete payload.updatedAt;try{const res=await fetch(`${API_BASE}/api/admin/page-sections`,{method:'POST',headers:auth(),body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Save failed');state.section.settings=settings;state.dirty=false;status('Saved');toast('Changes saved');}catch(e){status('Save failed',true);toast(e.message);}}

  gate();
})();
