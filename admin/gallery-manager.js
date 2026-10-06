(() => {
  'use strict';

  const API_BASE = 'https://ceybreez-contact-api.ceybreez.workers.dev';
  const TOKEN_KEY = 'CEYBREEZ_SESSION_TOKEN';
  const VALIDATED_KEY = 'CEYBREEZ_SESSION_VALIDATED';
  const DRAFT_KEY = 'CEYBREEZ_HOME_GALLERY_DRAFT_V1';
  const MAX_IMAGES = 48;

  // Current approved Home gallery fallback.
  // These are already on the live Home page and are only used in the manager
  // when no home_gallery value has been saved to site_content yet.
  const DEFAULT_GALLERY = [
    { src: '../images/beach.jpg', kicker: 'Coast', title: 'Golden shores', caption: '' },
    { src: '../images/train.jpg', kicker: 'Highlands', title: 'Slow rail journeys', caption: '' },
    { src: '../images/food.jpg', kicker: 'Taste', title: 'Island flavours', caption: '' },
    { src: '../images/nature.jpg', kicker: 'Nature', title: 'Wild green places', caption: '' },
    { src: '../images/temple.jpg', kicker: 'Culture', title: 'Living heritage', caption: '' },
    { src: '../images/mountains.jpg', kicker: 'Escape', title: 'Misty mornings', caption: '' }
  ];

  const $ = (s, root = document) => root.querySelector(s);
  const token = () => sessionStorage.getItem(TOKEN_KEY) || '';
  const authHeaders = (json = true) => {
    const headers = { Authorization: `Bearer ${token()}` };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  };
  const clean = v => String(v ?? '').trim();
  const escapeHtml = v => clean(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  let serverItems = [];
  let draftItems = [];
  let revision = 0;
  let previewedRevision = -1;
  let dragIndex = -1;
  let currentUser = null;

  function setStatus(message, tone = '') {
    const el = $('#gmStatus');
    if (!el) return;
    el.textContent = message;
    el.dataset.tone = tone;
  }

  function parseGallery(value) {
    if (Array.isArray(value)) return value.map(normalizeItem).filter(Boolean);
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(normalizeItem).filter(Boolean);
    } catch (_) {}
    return String(value).split(/\n|,/).map((src, i) => normalizeItem({ src, title: `Island moment ${i + 1}` })).filter(Boolean);
  }

  function normalizeItem(item, i = 0) {
    if (typeof item === 'string') item = { src: item };
    if (!item || typeof item !== 'object') return null;
    const src = clean(item.src || item.url || item.image || item.mediaUrl);
    if (!src) return null;
    return {
      src,
      kicker: clean(item.kicker || item.category || item.label || 'Sri Lanka'),
      title: clean(item.title || item.name || `Island moment ${i + 1}`),
      caption: clean(item.caption || item.description || item.text || '')
    };
  }

  function cloneItems(items) {
    return items.map(item => ({ ...item }));
  }

  function saveLocalDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ items: draftItems, savedAt: new Date().toISOString() }));
    } catch (_) {}
  }

  function clearLocalDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
  }

  function markDirty(message = 'Draft changed. Preview it before publishing.') {
    revision += 1;
    previewedRevision = -1;
    saveLocalDraft();
    updateSummary();
    setStatus(message);
  }

  function updateSummary() {
    $('#gmCount').textContent = String(draftItems.length);
    $('#gmLiveCount').textContent = String(serverItems.length);
    const ready = previewedRevision === revision;
    $('#gmPublishState').textContent = ready ? 'Previewed ✓' : 'Not previewed';
    $('#gmPublishBtn').disabled = !ready || !draftItems.length;
    $('#gmPreviewPublish').disabled = !ready || !draftItems.length;
  }

  async function api(path, options = {}) {
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: { ...authHeaders(!(options.body instanceof FormData)), ...(options.headers || {}) },
      cache: 'no-store'
    });
    const type = res.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await res.json().catch(() => ({})) : { text: await res.text().catch(() => '') };
    if (!res.ok) {
      const error = new Error(data.error || data.message || `Request failed (${res.status})`);
      error.status = res.status;
      throw error;
    }
    return { data, status: res.status };
  }

  async function validateSession() {
    if (!token()) {
      location.replace('index.html');
      return false;
    }
    try {
      const { data } = await api('/api/admin/auth/me');
      currentUser = data.user || data;
      sessionStorage.setItem(VALIDATED_KEY, '1');
      return true;
    } catch (error) {
      sessionStorage.removeItem(VALIDATED_KEY);
      if (error.status === 401) location.replace('index.html');
      else setStatus(`Could not validate session: ${error.message}`, 'error');
      return false;
    }
  }

  async function loadGallery() {
    setStatus('Loading live gallery…');
    const { data } = await api('/api/admin/site-content');
    serverItems = parseGallery(data.home_gallery);
    const usingFallback = serverItems.length === 0;
    if (usingFallback) serverItems = cloneItems(DEFAULT_GALLERY);
    draftItems = cloneItems(serverItems);

    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (saved?.items?.length) {
        const recovered = saved.items.map(normalizeItem).filter(Boolean);
        if (recovered.length) {
          draftItems = recovered;
          revision = 1;
          previewedRevision = -1;
          setStatus(`Recovered an unpublished local draft from ${new Date(saved.savedAt || Date.now()).toLocaleString()}.`);
        }
      }
    } catch (_) {}

    render();
    updateSummary();
    if (!localStorage.getItem(DRAFT_KEY)) {
      setStatus(usingFallback
        ? 'Loaded the 6 photos currently used by the Home gallery. Edit or add photos, then preview before publishing.'
        : 'Gallery loaded. Live website is unchanged until Publish Gallery.');
    }
  }

  function render() {
    const grid = $('#gmGrid');
    const empty = $('#gmEmpty');
    grid.innerHTML = '';
    empty.hidden = !!draftItems.length;

    draftItems.forEach((item, index) => {
      const frag = $('#gmCardTemplate').content.cloneNode(true);
      const card = $('.gm-card', frag);
      card.dataset.index = String(index);
      $('.gm-card-image', frag).src = item.src;
      $('.gm-card-image', frag).alt = item.title || `Gallery image ${index + 1}`;
      $('.gm-order', frag).textContent = String(index + 1).padStart(2, '0');
      $('.gm-kicker-input', frag).value = item.kicker || '';
      $('.gm-title-input', frag).value = item.title || '';
      $('.gm-caption-input', frag).value = item.caption || '';
      grid.appendChild(frag);
    });
  }

  function updateItemFromCard(card) {
    const index = Number(card.dataset.index);
    if (!draftItems[index]) return;
    draftItems[index].kicker = clean($('.gm-kicker-input', card).value) || 'Sri Lanka';
    draftItems[index].title = clean($('.gm-title-input', card).value) || `Island moment ${index + 1}`;
    draftItems[index].caption = clean($('.gm-caption-input', card).value);
  }

  function moveItem(from, to) {
    if (from < 0 || to < 0 || from >= draftItems.length || to >= draftItems.length || from === to) return;
    const [item] = draftItems.splice(from, 1);
    draftItems.splice(to, 0, item);
    markDirty('Photo order changed. Preview the new order before publishing.');
    render();
  }

  async function uploadOne(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'home-gallery');
    const { data } = await api('/api/admin/upload-image', { method: 'POST', body: fd });
    if (!data.url) throw new Error('Upload completed without an image URL.');
    return data.url;
  }

  async function uploadFiles(files, replaceIndex = null) {
    const list = [...files].filter(file => file.type.startsWith('image/'));
    if (!list.length) return;
    if (replaceIndex === null && draftItems.length + list.length > MAX_IMAGES) {
      alert(`Gallery supports up to ${MAX_IMAGES} managed images. Remove some images first.`);
      return;
    }

    const progress = $('#gmProgress');
    const bar = $('#gmProgressBar');
    progress.hidden = false;
    bar.style.width = '0%';
    let done = 0;
    setStatus(`Uploading ${list.length} photo${list.length === 1 ? '' : 's'} to media storage…`);

    try {
      for (const file of list) {
        const url = await uploadOne(file);
        if (replaceIndex !== null) {
          draftItems[replaceIndex].src = url;
          replaceIndex = null;
        } else {
          const baseTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
          draftItems.push({ src: url, kicker: 'Sri Lanka', title: baseTitle || `Island moment ${draftItems.length + 1}`, caption: '' });
        }
        done += 1;
        bar.style.width = `${Math.round((done / list.length) * 100)}%`;
      }
      markDirty(`${done} photo${done === 1 ? '' : 's'} added to the draft. They are not live yet.`);
      render();
    } catch (error) {
      setStatus(`Upload failed: ${error.message}`, 'error');
      alert(error.message);
    } finally {
      setTimeout(() => { progress.hidden = true; bar.style.width = '0%'; }, 700);
    }
  }

  function buildPreview() {
    const preview = $('#gmPreviewGrid');
    preview.innerHTML = draftItems.map((item, index) => `
      <article class="gm-preview-item">
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title || `Gallery image ${index + 1}`)}">
        <div class="gm-preview-copy"><small>${escapeHtml(item.kicker || 'Sri Lanka')}</small><strong>${escapeHtml(item.title || `Island moment ${index + 1}`)}</strong></div>
      </article>`).join('');
    $('#gmPreviewCount').textContent = `${draftItems.length} photos in this draft · public page initially shows the first 12, with Show More for the rest.`;
    previewedRevision = revision;
    updateSummary();
    $('#gmPreviewDialog').showModal();
    setStatus('Draft previewed. Publish is now unlocked until the draft changes again.');
  }

  async function publishGallery() {
    if (previewedRevision !== revision) {
      buildPreview();
      return;
    }
    if (!confirm(`Publish ${draftItems.length} gallery photos to the Home page?`)) return;
    setStatus('Publishing gallery…');
    $('#gmPublishBtn').disabled = true;
    $('#gmPreviewPublish').disabled = true;

    try {
      const payload = { home_gallery: JSON.stringify(draftItems) };
      const { data, status } = await api('/api/admin/site-content', { method: 'PUT', body: JSON.stringify(payload) });
      if (status === 202 || data.pendingApproval) {
        clearLocalDraft();
        setStatus(`Submitted for Super Admin approval (${data.approvalId || 'pending'}). The live website has not changed yet.`);
        alert(data.message || 'Submitted for approval. It is not live yet.');
        return;
      }
      serverItems = cloneItems(draftItems);
      clearLocalDraft();
      revision = 0;
      previewedRevision = 0;
      updateSummary();
      setStatus('Gallery published successfully. Open Live Home to verify it.');
      if ($('#gmPreviewDialog').open) $('#gmPreviewDialog').close();
      alert('Home gallery published successfully.');
    } catch (error) {
      setStatus(`Publish failed: ${error.message}`, 'error');
      alert(error.message);
      updateSummary();
    }
  }

  function bindEvents() {
    $('#gmChooseBtn').addEventListener('click', () => $('#gmFiles').click());
    $('#gmFiles').addEventListener('change', event => { uploadFiles(event.target.files); event.target.value = ''; });
    $('#gmAddUrlBtn').addEventListener('click', () => { $('#gmUrlInput').value = ''; $('#gmUrlTitle').value = ''; $('#gmUrlDialog').showModal(); });
    $('#gmPreviewBtn').addEventListener('click', buildPreview);
    $('#gmPublishBtn').addEventListener('click', publishGallery);
    $('#gmPreviewPublish').addEventListener('click', publishGallery);
    $('#gmPreviewClose').addEventListener('click', () => $('#gmPreviewDialog').close());

    $('#gmUrlSave').addEventListener('click', event => {
      event.preventDefault();
      const src = clean($('#gmUrlInput').value);
      if (!src) return alert('Enter an image URL first.');
      if (draftItems.length >= MAX_IMAGES) return alert(`Gallery supports up to ${MAX_IMAGES} managed images.`);
      draftItems.push({ src, kicker: 'Sri Lanka', title: clean($('#gmUrlTitle').value) || `Island moment ${draftItems.length + 1}`, caption: '' });
      $('#gmUrlDialog').close();
      markDirty('Image URL added to the draft.');
      render();
    });

    $('#gmResetBtn').addEventListener('click', () => {
      if (!confirm('Discard all unpublished gallery changes and reload the live gallery?')) return;
      draftItems = cloneItems(serverItems);
      clearLocalDraft();
      revision = 0;
      previewedRevision = -1;
      render();
      updateSummary();
      setStatus('Draft discarded. Showing the current live gallery.');
    });

    $('#gmGrid').addEventListener('input', event => {
      const card = event.target.closest('.gm-card');
      if (!card) return;
      updateItemFromCard(card);
      markDirty('Photo details changed. Preview before publishing.');
    });

    $('#gmGrid').addEventListener('click', event => {
      const card = event.target.closest('.gm-card');
      if (!card) return;
      const index = Number(card.dataset.index);
      if (event.target.closest('.gm-up')) return moveItem(index, index - 1);
      if (event.target.closest('.gm-down')) return moveItem(index, index + 1);
      if (event.target.closest('.gm-remove')) {
        if (!confirm('Remove this photo from the gallery draft? The uploaded file itself will remain in media storage.')) return;
        draftItems.splice(index, 1);
        markDirty('Photo removed from the draft.');
        render();
        return;
      }
      if (event.target.closest('.gm-replace')) $('.gm-replace-file', card).click();
    });

    $('#gmGrid').addEventListener('change', event => {
      if (!event.target.classList.contains('gm-replace-file')) return;
      const card = event.target.closest('.gm-card');
      const index = Number(card.dataset.index);
      uploadFiles(event.target.files, index);
      event.target.value = '';
    });

    $('#gmGrid').addEventListener('dragstart', event => {
      const card = event.target.closest('.gm-card');
      if (!card) return;
      dragIndex = Number(card.dataset.index);
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
    });
    $('#gmGrid').addEventListener('dragend', event => {
      event.target.closest('.gm-card')?.classList.remove('dragging');
      $('#gmGrid').querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragIndex = -1;
    });
    $('#gmGrid').addEventListener('dragover', event => {
      const card = event.target.closest('.gm-card');
      if (!card) return;
      event.preventDefault();
      $('#gmGrid').querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      card.classList.add('drag-over');
    });
    $('#gmGrid').addEventListener('drop', event => {
      const card = event.target.closest('.gm-card');
      if (!card) return;
      event.preventDefault();
      const to = Number(card.dataset.index);
      card.classList.remove('drag-over');
      if (dragIndex >= 0) moveItem(dragIndex, to);
    });
  }

  async function init() {
    bindEvents();
    const valid = await validateSession();
    if (!valid) return;
    await loadGallery().catch(error => {
      setStatus(`Could not load gallery: ${error.message}`, 'error');
      if (error.status === 403) alert('Your account does not have Page Builder permission.');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
