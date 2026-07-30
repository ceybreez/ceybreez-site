/* =========================================================
   CEYBREEZ PAGE BUILDER — STABLE ADMIN EDITOR
   Replaces old V2/V3/V4 patched builder scripts.
   Edits the original iframe DOM only (no clones/duplicates).
   ========================================================= */
(() => {
  'use strict';

  const PAGE_URLS = {
    home: '../index.html',
    villas: '../villas.html',
    apartments: '../apartments.html',
    homestays: '../homestays.html',
    tours: '../tours.html',
    services: '../services.html',
    contact: '../contact.html'
  };

  const state = {
    items: [],
    selectedId: '',
    page: 'home',
    device: 'desktop',
    previewReady: false,
    loading: false
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));

  function apiHeaders() {
    if (typeof window.authHeaders === 'function') return window.authHeaders();
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || '';
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  function apiBase() {
    return window.API_BASE || 'https://ceybreez-contact-api.ceybreez.workers.dev';
  }

  function parseSettings(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return {}; }
  }

  function px(id) {
    const value = String($(id)?.value || '').trim();
    if (!value) return '';
    return /^-?\d+(\.\d+)?$/.test(value) ? `${value}px` : value;
  }

  function currentPage() {
    return $('sectionFilterPage')?.value || $('sectionPage')?.value || state.page || 'home';
  }

  function currentItem() {
    return state.items.find(item => String(item.id) === String(state.selectedId)) || null;
  }

  function status(message, type = '') {
    const node = $('pb2SaveStatus');
    if (!node) return;
    node.textContent = message;
    node.className = type === 'ok' ? 'pb2-status-ok' : type === 'error' ? 'pb2-status-error' : '';
  }

  function showError(error) {
    console.error('[CeyBreez Builder]', error);
    status(error?.message || String(error), 'error');
  }

  function ensureStudioButton() {
    const bar = document.querySelector('.topbar, .v6-topbar');
    if (!bar || document.getElementById('openGrapesStudioBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'openGrapesStudioBtn';
    btn.type = 'button';
    btn.textContent = 'Visual Designer';
    btn.title = 'Open separate GrapesJS Studio';
    btn.addEventListener('click', () => window.open('grapes-studio/index.html', '_blank', 'noopener'));
    const logout = [...bar.querySelectorAll('button')].find(b => /logout/i.test(b.textContent || ''));
    bar.insertBefore(btn, logout || null);
  }

  function renderList() {
    const box = $('sectionsList');
    if (!box) return;
    if (!state.items.length) {
      box.innerHTML = '<div class="pb2-empty">No sections saved for this page.</div>';
      return;
    }
    const sorted = [...state.items].sort((a,b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    box.innerHTML = sorted.map(item => `
      <button type="button" class="pb2-section-item ${String(item.id) === String(state.selectedId) ? 'active' : ''}" data-builder-id="${esc(item.id)}">
        <span class="pb2-drag-icon">☷</span>
        <span><strong>${esc(item.title || item.sectionKey || 'Untitled')}</strong><small>${esc(item.sectionKey || 'custom')}</small></span>
        <span class="pb2-eye" title="${item.active ? 'Visible' : 'Hidden'}">${item.active ? '◉' : '○'}</span>
      </button>`).join('');

    box.querySelectorAll('[data-builder-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        const id = button.dataset.builderId;
        if (event.target.closest('.pb2-eye')) toggleSection(id);
        else selectSection(id);
      });
    });
  }

  async function loadSections() {
    if (state.loading) return;
    state.loading = true;
    state.page = currentPage();
    const box = $('sectionsList');
    if (box) box.innerHTML = '<div class="pb2-empty">Loading sections…</div>';
    try {
      const response = await fetch(`${apiBase()}/api/admin/page-sections?page=${encodeURIComponent(state.page)}`, {
        headers: apiHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load sections');
      state.items = Array.isArray(data) ? data : [];
      if (!state.items.some(x => String(x.id) === String(state.selectedId))) {
        state.selectedId = state.items[0]?.id || '';
      }
      renderList();
      if (state.selectedId) fillForm(currentItem());
      refreshPreview(false);
    } catch (error) {
      if (box) box.innerHTML = `<div class="pb2-empty pb2-status-error">${esc(error.message)}</div>`;
      showError(error);
    } finally {
      state.loading = false;
    }
  }

  function selectSection(id) {
    state.selectedId = id;
    fillForm(currentItem());
    renderList();
    applyPreview();
  }

  function setValue(id, value) {
    const node = $(id);
    if (node) node.value = value ?? '';
  }

  function fillForm(item) {
    if (!item) return;
    const s = parseSettings(item.settings);
    setValue('sectionEditId', item.id);
    setValue('sectionPage', item.page || state.page);
    setValue('sectionKey', item.sectionKey || 'custom');
    setValue('sectionType', item.sectionType || 'custom');
    setValue('sectionTitle', item.title);
    setValue('sectionSubtitle', item.subtitle);
    setValue('sectionContent', item.content);
    setValue('sectionButtonText', item.buttonText || s.buttonText);
    setValue('sectionButtonUrl', item.buttonUrl || s.buttonUrl);
    setValue('sectionImage', item.mediaUrl);
    setValue('sectionVideo', s.videoUrl);
    setValue('sectionBgColor', item.backgroundColor || '#ffffff');
    setValue('sectionBackgroundImage', item.backgroundImage);
    setValue('sectionTextColor', item.textColor || '#222222');
    setValue('sectionHeadingColor', item.headingColor || s.headingColor || '#17324d');
    setValue('sectionButtonColor', item.buttonColor || '#0f766e');
    setValue('sectionFontFamily', item.fontFamily);
    setValue('sectionFontSize', String(item.fontSize || s.fontSize || '').replace('px',''));
    setValue('sectionHeadingFont', s.headingFont);
    setValue('sectionHeadingSize', String(s.headingSize || '').replace('px',''));
    setValue('sectionBackgroundSize', s.backgroundSize || 'cover');
    setValue('sectionBackgroundPosition', s.backgroundPosition || 'center center');
    setValue('sectionOverlay', s.overlay ?? 35);
    setValue('sectionSortOrder', item.sortOrder || 0);
    setValue('sectionGradientStart', s.gradientStart || '#ffffff');
    setValue('sectionGradientEnd', s.gradientEnd || '#f8f3eb');
    setValue('sectionPaddingTop', String(s.paddingTop || '').replace('px',''));
    setValue('sectionPaddingBottom', String(s.paddingBottom || '').replace('px',''));
    setValue('sectionBorderRadius', String(s.borderRadius || '').replace('px',''));
    setValue('sectionShadow', s.shadow || '');
    setValue('sectionAnimation', s.animation || '');
    if ($('sectionActive')) $('sectionActive').checked = item.active !== false && item.active !== 0;
    if (typeof window.loadCards === 'function') window.loadCards(s.cards || []);
  }

  function previewDocument() {
    const frame = $('pb2PreviewFrame');
    try { return frame?.contentDocument || null; } catch { return null; }
  }

  function targetSection() {
    const doc = previewDocument();
    const key = $('sectionKey')?.value || currentItem()?.sectionKey;
    if (!doc || !key) return null;
    return doc.querySelector(`[data-section="${CSS.escape(key)}"]`);
  }

  function refreshPreview(force = true) {
    const frame = $('pb2PreviewFrame');
    if (!frame) return;
    state.page = currentPage();
    const base = PAGE_URLS[state.page] || PAGE_URLS.home;
    const next = `${base}?pbpreview=1${force ? `&t=${Date.now()}` : ''}`;
    if (force || !frame.src) frame.src = next;
  }

  function shadowValue(value) {
    return ({
      soft: '0 8px 24px rgba(15,23,42,.10)',
      medium: '0 14px 38px rgba(15,23,42,.16)',
      strong: '0 22px 60px rgba(15,23,42,.24)',
      none: 'none'
    })[value] || '';
  }

  function applyPreview() {
    const section = targetSection();
    if (!section) return;

    const updateText = (selector, value) => {
      const node = section.querySelector(selector);
      if (node && value !== undefined) node.textContent = value;
    };

    updateText('[data-field="title"]', $('sectionTitle')?.value || '');
    updateText('[data-field="subtitle"]', $('sectionSubtitle')?.value || '');
    updateText('[data-field="content"]', $('sectionContent')?.value || '');

    const button = section.querySelector('[data-field="button"]');
    if (button) {
      if ($('sectionButtonText')?.value) button.textContent = $('sectionButtonText').value;
      if ($('sectionButtonUrl')?.value) button.setAttribute('href', $('sectionButtonUrl').value);
      button.style.backgroundColor = $('sectionButtonColor')?.value || '';
    }

    const imageUrl = $('sectionImage')?.value?.trim();
    if (imageUrl) {
      const image = section.querySelector('[data-field="image"], img');
      if (image) image.src = imageUrl;
    }

    const bgImage = $('sectionBackgroundImage')?.value?.trim();
    const overlay = Math.max(0, Math.min(100, Number($('sectionOverlay')?.value || 0))) / 100;
    if (bgImage) {
      section.style.backgroundImage = `linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url("${bgImage.replace(/"/g, '%22')}")`;
    } else {
      section.style.backgroundImage = '';
      section.style.backgroundColor = $('sectionBgColor')?.value || '';
    }
    section.style.backgroundSize = $('sectionBackgroundSize')?.value || '';
    section.style.backgroundPosition = $('sectionBackgroundPosition')?.value || '';
    section.style.color = $('sectionTextColor')?.value || '';
    section.style.fontFamily = $('sectionFontFamily')?.value || '';
    section.style.fontSize = px('sectionFontSize');
    section.style.paddingTop = px('sectionPaddingTop');
    section.style.paddingBottom = px('sectionPaddingBottom');
    section.style.borderRadius = px('sectionBorderRadius');
    section.style.boxShadow = shadowValue($('sectionShadow')?.value);

    section.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
      h.style.color = $('sectionHeadingColor')?.value || '';
      h.style.fontFamily = $('sectionHeadingFont')?.value || '';
      h.style.fontSize = px('sectionHeadingSize');
    });

    section.hidden = $('sectionActive') ? !$('sectionActive').checked : false;
    section.dataset.builderEditing = 'true';
  }

  function collectSettings() {
    return {
      videoUrl: $('sectionVideo')?.value?.trim() || '',
      gradientStart: $('sectionGradientStart')?.value || '',
      gradientEnd: $('sectionGradientEnd')?.value || '',
      paddingTop: px('sectionPaddingTop'),
      paddingBottom: px('sectionPaddingBottom'),
      borderRadius: px('sectionBorderRadius'),
      shadow: $('sectionShadow')?.value || '',
      animation: $('sectionAnimation')?.value || '',
      cards: typeof window.collectCards === 'function' ? window.collectCards() : [],
      buttonText: $('sectionButtonText')?.value?.trim() || '',
      buttonUrl: $('sectionButtonUrl')?.value?.trim() || '',
      backgroundSize: $('sectionBackgroundSize')?.value || 'cover',
      backgroundPosition: $('sectionBackgroundPosition')?.value || 'center center',
      overlay: Number($('sectionOverlay')?.value || 35),
      headingColor: $('sectionHeadingColor')?.value || '',
      headingFont: $('sectionHeadingFont')?.value || '',
      headingSize: px('sectionHeadingSize'),
      fontSize: px('sectionFontSize')
    };
  }

  function collectData() {
    return {
      id: $('sectionEditId')?.value || '',
      page: currentPage(),
      sectionKey: $('sectionKey')?.value || 'custom',
      sectionType: $('sectionType')?.value || 'custom',
      title: $('sectionTitle')?.value?.trim() || '',
      subtitle: $('sectionSubtitle')?.value?.trim() || '',
      content: $('sectionContent')?.value?.trim() || '',
      buttonText: $('sectionButtonText')?.value?.trim() || '',
      buttonUrl: $('sectionButtonUrl')?.value?.trim() || '',
      mediaUrl: $('sectionImage')?.value?.trim() || '',
      backgroundType: $('sectionBackgroundImage')?.value?.trim() ? 'image' : 'color',
      backgroundColor: $('sectionBgColor')?.value || '',
      backgroundImage: $('sectionBackgroundImage')?.value?.trim() || '',
      textColor: $('sectionTextColor')?.value || '',
      headingColor: $('sectionHeadingColor')?.value || '',
      buttonColor: $('sectionButtonColor')?.value || '',
      fontFamily: $('sectionFontFamily')?.value || '',
      fontSize: px('sectionFontSize'),
      sortOrder: Number($('sectionSortOrder')?.value || 0),
      active: $('sectionActive') ? $('sectionActive').checked : true,
      settings: collectSettings()
    };
  }

  async function saveSection(event) {
    event?.preventDefault?.();
    status('Saving…');
    try {
      const response = await fetch(`${apiBase()}/api/admin/page-sections`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(collectData())
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save section failed');
      state.selectedId = data.id || state.selectedId;
      status('Saved', 'ok');
      await loadSections();
      applyPreview();
    } catch (error) {
      showError(error);
      alert(error.message || 'Save failed');
    }
  }

  async function toggleSection(id) {
    const item = state.items.find(x => String(x.id) === String(id));
    if (!item) return;
    try {
      const response = await fetch(`${apiBase()}/api/admin/page-sections`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ ...item, active: !(item.active !== false && item.active !== 0), settings: parseSettings(item.settings) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Visibility update failed');
      await loadSections();
    } catch (error) { showError(error); }
  }

  function newSection() {
    state.selectedId = '';
    $('sectionForm')?.reset();
    setValue('sectionEditId', '');
    setValue('sectionPage', currentPage());
    setValue('sectionKey', 'custom');
    setValue('sectionType', 'custom');
    setValue('sectionSortOrder', state.items.length * 10);
    if ($('sectionActive')) $('sectionActive').checked = true;
    renderList();
  }

  function setDevice(device, button) {
    state.device = device;
    const wrap = $('pb2PreviewFrameWrap');
    if (wrap) wrap.className = `pb2-preview-frame-wrap ${device}`;
    document.querySelectorAll('.pb2-devices button').forEach(b => b.classList.toggle('active', b === button));
  }

  function bind() {
    ensureStudioButton();

    const pageSelect = $('sectionFilterPage');
    if (pageSelect && !pageSelect.dataset.stableBound) {
      pageSelect.dataset.stableBound = '1';
      pageSelect.addEventListener('change', () => {
        state.selectedId = '';
        state.page = currentPage();
        loadSections();
      });
    }

    const form = $('sectionForm');
    if (form && !form.dataset.stableBound) {
      form.dataset.stableBound = '1';
      form.addEventListener('submit', saveSection);
      form.querySelectorAll('input,textarea,select').forEach(input => {
        input.addEventListener('input', applyPreview);
        input.addEventListener('change', applyPreview);
      });
    }

    const frame = $('pb2PreviewFrame');
    if (frame && !frame.dataset.stableBound) {
      frame.dataset.stableBound = '1';
      frame.addEventListener('load', () => {
        state.previewReady = true;
        setTimeout(applyPreview, 80);
      });
    }

    document.querySelectorAll('.pb2-accordion-title').forEach(btn => {
      if (btn.dataset.stableBound) return;
      btn.dataset.stableBound = '1';
      btn.addEventListener('click', () => btn.closest('.pb2-accordion')?.classList.toggle('open'));
    });

    window.loadPageSections = loadSections;
    window.editPageSection = selectSection;
    window.savePageSection = saveSection;
    window.pb2LivePreview = applyPreview;
    window.pb2RefreshPreview = () => refreshPreview(true);
    window.pb2ChangePage = (page) => {
      if ($('sectionFilterPage')) $('sectionFilterPage').value = page;
      if ($('sectionPage')) $('sectionPage').value = page;
      state.page = page;
      state.selectedId = '';
      loadSections();
    };
    window.pb2SetDevice = setDevice;
    window.pb2NewSection = newSection;
    window.pb2ResetSelectedSection = newSection;
    window.pb2SaveCurrentSection = () => form?.requestSubmit();
    window.pb2ToggleSection = toggleSection;

    loadSections();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(bind, 250));
  else setTimeout(bind, 250);
})();
