(() => {
  'use strict';

  const statusEl = document.getElementById('status');
  const pageSelect = document.getElementById('pageSelect');
  const STORAGE_PREFIX = 'CEYBREEZ_GRAPES_DRAFT_V1:';
  const API_BASE = window.CEYBREEZ_API_BASE || 'https://ceybreez-contact-api.ceybreez.workers.dev';
  let currentPage = pageSelect.value;

  const PAGE_MAP = {
    welcome: { file: 'index.html', label: 'Welcome Screen', mode: 'welcome' },
    home: { file: 'index.html', label: 'Home Page', mode: 'home' }
  };

  function getPageConfig(value = pageSelect.value) {
    return PAGE_MAP[value] || { file: value, label: value, mode: 'full' };
  }
  let importedHead = '';
  let importedTitle = 'CeyBreez';

  const setStatus = (message, error = false) => {
    statusEl.textContent = message;
    statusEl.classList.toggle('error', error);
  };

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: false,
    noticeOnUnload: false,
    blockManager: { appendTo: '#blocks' },
    styleManager: {
      appendTo: '#styles',
      sectors: [
        { name: 'Layout', open: true, buildProps: ['display','position','width','height','min-height','max-width','flex-direction','justify-content','align-items','gap','overflow'] },
        { name: 'Spacing', open: true, buildProps: ['margin','padding'] },
        { name: 'Typography', open: false, buildProps: ['font-family','font-size','font-weight','line-height','letter-spacing','color','text-align','text-decoration'] },
        { name: 'Background', open: false, buildProps: ['background-color','background-image','background-repeat','background-position','background-size'] },
        { name: 'Border & Effects', open: false, buildProps: ['border','border-radius','box-shadow','opacity','transform'] }
      ]
    },
    traitManager: { appendTo: '#traits' },
    layerManager: { appendTo: '#layers' },
    deviceManager: {
      devices: [
        { name: 'Desktop', width: '' },
        { name: 'Tablet', width: '768px', widthMedia: '991px' },
        { name: 'Mobile portrait', width: '390px', widthMedia: '767px' }
      ]
    },
    canvas: { styles: [] }
  });

  const bm = editor.BlockManager;
  const blocks = [
    ['section','Section','<section style="padding:70px 24px"><div style="max-width:1200px;margin:auto"><h2>New Section</h2><p>Add your content here.</p></div></section>'],
    ['container','Container','<div style="max-width:1200px;margin:auto;padding:24px">Container</div>'],
    ['columns','2 Columns','<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;padding:24px"><div>Column 1</div><div>Column 2</div></div>'],
    ['heading','Heading','<h2>New heading</h2>'],
    ['text','Text','<p>Write your text here.</p>'],
    ['button','Button','<a href="#" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#0f766e;color:#fff;text-decoration:none">Button</a>'],
    ['image','Image','<img src="../../images/cover.jpg" alt="CeyBreez image" style="display:block;max-width:100%;height:auto">'],
    ['card','Card','<article style="padding:24px;border-radius:14px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.12)"><h3>Card title</h3><p>Card content.</p></article>'],
    ['spacer','Spacer','<div style="height:60px"></div>'],
    ['divider','Divider','<hr style="border:0;border-top:1px solid #d9e2e7;margin:24px 0">']
  ];
  blocks.forEach(([id,label,content]) => bm.add(id,{label,category:'Basic',content}));
  bm.add('upload-image',{ label:'Upload Image', category:'Media', activate:true, command:() => document.getElementById('assetInput').click() });

  function absolutizeUrl(value, base) {
    if (!value || /^(data:|blob:|mailto:|tel:|javascript:|#)/i.test(value)) return value;
    try { return new URL(value, base).href; } catch { return value; }
  }

  function prepareDocument(html, sourceUrl, mode = 'full') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, noscript').forEach(el => el.remove());
    doc.querySelectorAll('base').forEach(el => el.remove());

    // index.html contains both the welcome screen and the actual Home page.
    // In the builder they are exposed as two separate editable views.
    if (mode === 'home') {
      doc.getElementById('welcomeScreen')?.remove();
      doc.body.classList.add('entered', 'cb-builder-home-mode');
      const main = doc.getElementById('mainSite');
      if (main) {
        main.style.setProperty('display', 'block', 'important');
        main.style.setProperty('opacity', '1', 'important');
        main.style.setProperty('visibility', 'visible', 'important');
        main.style.setProperty('transform', 'none', 'important');
      }
    } else if (mode === 'welcome') {
      doc.getElementById('mainSite')?.remove();
      doc.querySelectorAll('body > :not(#welcomeScreen)').forEach(el => el.remove());
      doc.body.classList.remove('entered');
      doc.body.classList.add('cb-builder-welcome-mode');
      const welcome = doc.getElementById('welcomeScreen');
      if (welcome) {
        welcome.style.setProperty('display', 'flex', 'important');
        welcome.style.setProperty('opacity', '1', 'important');
        welcome.style.setProperty('visibility', 'visible', 'important');
        welcome.style.setProperty('transform', 'none', 'important');
        welcome.classList.remove('hide');
      }
    }

    doc.querySelectorAll('[src]').forEach(el => el.setAttribute('src', absolutizeUrl(el.getAttribute('src'), sourceUrl)));
    doc.querySelectorAll('[poster]').forEach(el => el.setAttribute('poster', absolutizeUrl(el.getAttribute('poster'), sourceUrl)));
    doc.querySelectorAll('[href]').forEach(el => {
      const href = el.getAttribute('href');
      if (el.tagName !== 'A' || !href?.startsWith('#')) el.setAttribute('href', absolutizeUrl(href, sourceUrl));
    });
    doc.querySelectorAll('[srcset]').forEach(el => {
      const srcset = el.getAttribute('srcset').split(',').map(part => {
        const bits = part.trim().split(/\s+/); bits[0] = absolutizeUrl(bits[0], sourceUrl); return bits.join(' ');
      }).join(', ');
      el.setAttribute('srcset', srcset);
    });
    doc.querySelectorAll('[style]').forEach(el => {
      el.setAttribute('style', el.getAttribute('style').replace(/url\((['"]?)(.*?)\1\)/g, (_,q,url) => `url(${q}${absolutizeUrl(url, sourceUrl)}${q})`));
    });

    importedTitle = doc.title || 'CeyBreez';
    const headParts = [];
    doc.head.querySelectorAll('link[rel="stylesheet"], style, meta[name="viewport"], meta[charset]').forEach(el => headParts.push(el.outerHTML));
    importedHead = headParts.join('\n');
    return { body: doc.body.innerHTML, headNodes: [...doc.head.querySelectorAll('link[rel="stylesheet"], style')] };
  }

  function installCanvasHead(headNodes, mode = 'full') {
    const canvasDoc = editor.Canvas.getDocument();
    if (!canvasDoc) return;
    canvasDoc.head.querySelectorAll('[data-cb-imported]').forEach(el => el.remove());
    headNodes.forEach(node => {
      const clone = node.cloneNode(true);
      clone.setAttribute('data-cb-imported','1');
      canvasDoc.head.appendChild(clone);
    });
    const responsive = canvasDoc.createElement('style');
    responsive.setAttribute('data-cb-imported','1');
    responsive.textContent = `
      img,video{max-width:100%;height:auto}*{box-sizing:border-box}
      body.cb-builder-home-mode #mainSite{display:block!important;opacity:1!important;visibility:visible!important;transform:none!important}
      body.cb-builder-welcome-mode #welcomeScreen{display:flex!important;opacity:1!important;visibility:visible!important;transform:none!important}
    `;
    canvasDoc.head.appendChild(responsive);

    canvasDoc.body.classList.remove('entered', 'cb-builder-home-mode', 'cb-builder-welcome-mode');
    if (mode === 'home') canvasDoc.body.classList.add('entered', 'cb-builder-home-mode');
    if (mode === 'welcome') canvasDoc.body.classList.add('cb-builder-welcome-mode');
  }

  async function importPage(force = false) {
    currentPage = pageSelect.value;
    const page = getPageConfig(currentPage);
    const key = STORAGE_PREFIX + currentPage;
    const existing = localStorage.getItem(key);
    if (existing && !force) {
      try {
        editor.loadProjectData(JSON.parse(existing));
        setStatus(`Loaded saved draft for ${page.label}.`);
        requestAnimationFrame(() => installCanvasHead([], page.mode));
        return;
      } catch (e) { console.warn(e); }
    }

    setStatus(`Importing ${page.label}…`);
    try {
      const sourceUrl = new URL(`../../${page.file}`, location.href).href;
      const response = await fetch(sourceUrl, { cache:'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const prepared = prepareDocument(html, sourceUrl, page.mode);
      editor.setComponents(prepared.body);
      editor.setStyle('');
      installCanvasHead(prepared.headNodes, page.mode);
      editor.UndoManager.clear();
      setStatus(`Imported ${page.label}. Scripts are intentionally excluded inside the editor to keep editing safe.`);
    } catch (error) {
      setStatus(`Import failed: ${error.message}`, true);
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_PREFIX + currentPage, JSON.stringify(editor.getProjectData()));
      setStatus(`Draft saved in this browser for ${getPageConfig(currentPage).label}.`);
    } catch (error) { setStatus(`Save failed: ${error.message}`, true); }
  }

  function exportHtml() {
    const html = editor.getHtml();
    const css = editor.getCss();
    const output = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${importedTitle.replace(/[<>]/g,'')}</title>\n${importedHead}\n<style id="ceybreez-builder-styles">\n${css}\n</style>\n</head>\n<body>\n${html}\n</body>\n</html>`;
    const blob = new Blob([output], {type:'text/html;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = getPageConfig(currentPage).file;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus(`Exported ${getPageConfig(currentPage).label} as ${getPageConfig(currentPage).file}. Review it before replacing the live page.`);
  }

  async function uploadAssets(files) {
    const token = localStorage.getItem('CEYBREEZ_ADMIN_TOKEN');
    if (!token) return setStatus('Admin token not found. Log in to CeyBreez Admin first.', true);
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'page-builder');
      setStatus(`Uploading ${file.name}…`);
      try {
        const res = await fetch(`${API_BASE}/api/admin/upload-image`, { method:'POST', headers:{Authorization:`Bearer ${token}`}, body:form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!data.url) throw new Error('Upload returned no URL');
        editor.AssetManager.add({src:data.url,name:file.name});
        editor.addComponents(`<img src="${data.url}" alt="${file.name.replace(/["<>]/g,'')}" style="max-width:100%;height:auto">`);
        setStatus(`Uploaded ${file.name}.`);
      } catch (error) { setStatus(`Upload failed: ${error.message}`, true); }
    }
  }

  document.getElementById('importBtn').addEventListener('click', () => importPage(true));
  document.getElementById('saveBtn').addEventListener('click', saveDraft);
  document.getElementById('exportBtn').addEventListener('click', exportHtml);
  pageSelect.addEventListener('change', () => importPage(false));
  document.getElementById('assetInput').addEventListener('change', e => uploadAssets([...e.target.files]));

  document.querySelectorAll('.cb-devicebar button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.cb-devicebar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    editor.setDevice(btn.dataset.device);
  }));

  document.querySelectorAll('.cb-tabs button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.cb-tabs button,.cb-tab').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  }));

  editor.on('component:selected', model => {
    const name = model.getName?.() || model.get('tagName') || model.get('type') || 'Element';
    document.getElementById('selectionLabel').textContent = `Selected: ${name}`;
  });
  editor.on('component:deselected', () => document.getElementById('selectionLabel').textContent = 'Nothing selected');
  editor.on('load', () => importPage(false));
})();
