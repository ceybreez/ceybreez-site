(() => {
  'use strict';

  const API_BASE = window.CEYBREEZ_API_BASE || 'https://ceybreez-contact-api.ceybreez.workers.dev';
  const PAGE_DEFS = [
    { id:'welcome', label:'Welcome Page', file:'index.html', icon:'✦', selector:'body' },
    { id:'home', label:'Home', file:'index.html', icon:'⌂' },
    { id:'villas', label:'Villas', file:'villas.html', icon:'◆' },
    { id:'apartments', label:'Apartments', file:'apartments.html', icon:'▦' },
    { id:'homestays', label:'Homestays', file:'homestays.html', icon:'⌁' },
    { id:'tours', label:'Tours', file:'tours.html', icon:'◎' },
    { id:'services', label:'Services', file:'services.html', icon:'✧' },
    { id:'tour-details', label:'Tour Package Details', file:'tour-details.html', icon:'▤', dynamic:true },
    { id:'contact', label:'Contact', file:'contact.html', icon:'✉' }
  ];

  let currentPage = PAGE_DEFS[0];
  let loading = false;

  const editor = grapesjs.init({
    container:'#gjs', height:'100%', width:'auto', fromElement:false,
    storageManager:false,
    selectorManager:{ componentFirst:true },
    blockManager:{ appendTo:'#blocksPanel' },
    styleManager:{ appendTo:'#stylesPanel', sectors:[
      { name:'Layout', open:true, buildProps:['display','position','top','right','left','bottom','width','height','max-width','min-height','margin','padding','overflow'] },
      { name:'Typography', open:false, buildProps:['font-family','font-size','font-weight','letter-spacing','line-height','color','text-align','text-decoration','text-shadow'] },
      { name:'Background', open:false, buildProps:['background-color','background','background-image','background-size','background-position','opacity'] },
      { name:'Border & Shadow', open:false, buildProps:['border','border-radius','box-shadow'] },
      { name:'Transform', open:false, buildProps:['transform','transition'] }
    ]},
    layerManager:{ appendTo:'#layersPanel' },
    traitManager:{ appendTo:'#traitsPanel' },
    deviceManager:{ devices:[
      { id:'desktop', name:'Desktop', width:'' },
      { id:'tablet', name:'Tablet', width:'768px', widthMedia:'992px' },
      { id:'mobile', name:'Mobile', width:'375px', widthMedia:'480px' }
    ]},
    canvas:{ styles:[
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Poppins:wght@300;400;500;600&display=swap'
    ] }
  });

  editor.on('canvas:frame:load',()=>{
    const body=editor.Canvas.getBody();
    if(body) body.classList.add('ceybreez-builder-canvas');
  });

  const bm = editor.BlockManager;
  const block = (id,label,category,content,attributes={}) => bm.add(id,{label,category,content,attributes});
  block('section','Section','Layout','<section style="padding:80px 28px;min-height:240px"><div style="max-width:1180px;margin:auto"><h2>New Section</h2><p>Add your content here.</p></div></section>');
  block('columns-2','2 Columns','Layout','<section style="padding:70px 28px"><div style="max-width:1180px;margin:auto;display:grid;grid-template-columns:1fr 1fr;gap:32px"><div><h3>Column One</h3><p>Content</p></div><div><h3>Column Two</h3><p>Content</p></div></div></section>');
  block('hero','Premium Hero','CeyBreez','<section style="min-height:82vh;padding:110px 30px;display:flex;align-items:center;justify-content:center;text-align:center;color:white;background:linear-gradient(rgba(4,22,38,.55),rgba(4,22,38,.65)),url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80) center/cover"><div style="max-width:900px"><div style="letter-spacing:.28em;text-transform:uppercase;color:#d7b46a">Discover Sri Lanka</div><h1 style="font-family:Cormorant Garamond,serif;font-size:clamp(52px,8vw,100px);margin:12px 0">CeyBreez</h1><p style="font-size:18px">Stay. Taste. Explore Sri Lanka.</p><a href="#" style="display:inline-block;margin-top:18px;padding:13px 25px;border:1px solid #d7b46a;color:white;text-decoration:none">Explore</a></div></section>');
  block('heading','Heading','Basic','<h2 style="font-family:Cormorant Garamond,serif;font-size:48px">Elegant Heading</h2>');
  block('text','Text','Basic','<p>Write your content here.</p>');
  block('image','Image','Basic',{type:'image'});
  block('button','Button','Basic','<a href="#" style="display:inline-block;padding:12px 22px;background:#0b6b5d;color:white;text-decoration:none;border-radius:4px">Learn More</a>');
  block('gallery','Gallery','CeyBreez','<section style="padding:70px 24px"><div style="max-width:1180px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:14px"><img style="width:100%;height:280px;object-fit:cover" src="https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=800&q=80"><img style="width:100%;height:280px;object-fit:cover" src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=800&q=80"><img style="width:100%;height:280px;object-fit:cover" src="https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=800&q=80"></div></section>');
  block('cards','Card Grid','CeyBreez','<section style="padding:80px 24px;background:#f5f1e8"><div style="max-width:1180px;margin:auto"><h2 style="text-align:center;font-family:Cormorant Garamond,serif;font-size:48px">Our Experiences</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px"><article style="background:white;padding:26px"><h3>Experience One</h3><p>Short description.</p></article><article style="background:white;padding:26px"><h3>Experience Two</h3><p>Short description.</p></article><article style="background:white;padding:26px"><h3>Experience Three</h3><p>Short description.</p></article></div></div></section>');
  block('dynamic-services','Dynamic Services','Dynamic','<div data-ceybreez-dynamic="services" style="padding:45px;text-align:center;border:2px dashed #0b6b5d;background:#eef8f5"><strong>Dynamic Services Grid</strong><p>Live service cards are loaded here from the CEYBREEZ API.</p></div>');
  block('dynamic-tours','Dynamic Tours','Dynamic','<div data-ceybreez-dynamic="tours" style="padding:45px;text-align:center;border:2px dashed #c9a35b;background:#fbf6eb"><strong>Dynamic Tour Packages</strong><p>Live tour packages are loaded here from the CEYBREEZ API.</p></div>');
  block('tour-title','Tour Title','Tour Details','<h1 data-tour-field="title" style="font-family:Cormorant Garamond,serif;font-size:64px">{{tour.title}}</h1>');
  block('tour-gallery','Tour Gallery','Tour Details','<div data-tour-field="gallery" style="padding:35px;border:2px dashed #c9a35b;text-align:center">{{tour.gallery}}</div>');
  block('tour-itinerary','Tour Itinerary','Tour Details','<section data-tour-field="itinerary" style="padding:50px 24px"><h2>Itinerary</h2><div>{{tour.itinerary}}</div></section>');
  block('tour-price','Tour Price','Tour Details','<div data-tour-field="price" style="padding:28px;background:#071a2f;color:white"><h3>From {{tour.currency}} {{tour.price}}</h3></div>');
  block('inquiry-form','Inquiry Form','Dynamic','<div data-ceybreez-dynamic="inquiry-form" style="padding:40px;border:2px dashed #526679;text-align:center"><strong>Protected Inquiry Form</strong><p>The live inquiry form is inserted here and its submission logic remains protected.</p></div>');

  function toast(message){ const el=document.getElementById('statusToast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }
  function draftKey(id){ return `ceybreez-builder-pro-v1.3:${id}`; }
  function token(){ return sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken') || ''; }

  async function fetchOriginal(page){
    const candidates = [`../../${page.file}`, `/${page.file}`, `https://ceybreez.com/${page.file}`];
    for(const url of candidates){
      try{ const r=await fetch(url,{cache:'no-store'}); if(r.ok){ const html=await r.text(); return await extractBodyAndStyles(html,page,r.url || new URL(url, location.href).href); } }catch(_){ }
    }
    return fallbackPage(page);
  }

  async function extractBodyAndStyles(html,page,sourceUrl){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const baseUrl = sourceUrl || location.href;
    rewriteAssetUrls(doc, baseUrl);
    doc.querySelectorAll('script').forEach(s=>s.remove());
    const css = await collectCss(doc,baseUrl);

    if(page.id==='welcome'){
      const welcome=doc.querySelector('#welcomeScreen,.welcome-screen,[data-welcome],.welcome-overlay');
      if(welcome){
        welcome.classList.remove('hide');
        welcome.removeAttribute('style');
        return {html:welcome.outerHTML,css,bodyAttrs:{...getBodyAttrs(doc),'data-builder-view':'welcome'}};
      }
      return fallbackPage(page);
    }

    if(page.id==='home'){
      // index.html contains both the welcome overlay and the real Home page.
      // Import only the real site wrapper so the two builder pages stay separate.
      doc.querySelectorAll('#welcomeScreen,.welcome-screen,[data-welcome],.welcome-overlay').forEach(el=>el.remove());
      const homeRoot=doc.querySelector('#mainSite') || doc.querySelector('main');
      if(homeRoot){
        homeRoot.classList.remove('hide','hidden');
        homeRoot.style.removeProperty('display');
        homeRoot.style.removeProperty('opacity');
        homeRoot.style.removeProperty('visibility');
        return {html:homeRoot.outerHTML,css,bodyAttrs:{...getBodyAttrs(doc),'data-page':'home','data-builder-view':'home'}};
      }
      return {html:doc.body.innerHTML,css,bodyAttrs:{...getBodyAttrs(doc),'data-page':'home','data-builder-view':'home'}};
    }

    return {html:doc.body.innerHTML,css,bodyAttrs:getBodyAttrs(doc)};
  }
  function rewriteAssetUrls(doc, baseUrl){
    const attrs=['src','href','poster','action'];
    doc.querySelectorAll('*').forEach(el=>{
      attrs.forEach(attr=>{
        const value=el.getAttribute(attr);
        if(!value || value.startsWith('#') || /^(data:|mailto:|tel:|javascript:)/i.test(value)) return;
        try{ el.setAttribute(attr,new URL(value,baseUrl).href); }catch(_){ }
      });
      const srcset=el.getAttribute('srcset');
      if(srcset){
        const fixed=srcset.split(',').map(part=>{
          const bits=part.trim().split(/\s+/);
          try{ bits[0]=new URL(bits[0],baseUrl).href; }catch(_){ }
          return bits.join(' ');
        }).join(', ');
        el.setAttribute('srcset',fixed);
      }
    });
  }
  function getBodyAttrs(doc){
    const attrs={};
    [...doc.body.attributes].forEach(a=>attrs[a.name]=a.value);
    return attrs;
  }

  async function collectCss(doc,baseUrl){
    const chunks=[];
    for(const link of [...doc.querySelectorAll('link[rel="stylesheet"]')]){
      const href=link.getAttribute('href');
      if(!href) continue;
      try{
        const absolute=new URL(href,baseUrl).href;
        const css=await fetchCssText(absolute,new Set());
        if(css) chunks.push(`/* ${absolute} */\n${css}`);
      }catch(err){
        console.warn('Could not load stylesheet',href,err);
      }
    }
    [...doc.querySelectorAll('style')].forEach(x=>chunks.push(x.textContent||''));
    return chunks.join('\n\n');
  }

  async function fetchCssText(url,seen){
    if(seen.has(url)) return '';
    seen.add(url);
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok) throw new Error(`CSS ${response.status}: ${url}`);
    let css=await response.text();

    const imports=[...css.matchAll(/@import\s+(?:url\()?['"]?([^'"\)\s;]+)['"]?\)?[^;]*;/gi)];
    for(const match of imports){
      try{
        const importedUrl=new URL(match[1],url).href;
        const importedCss=await fetchCssText(importedUrl,seen);
        css=css.replace(match[0],importedCss);
      }catch(_){ css=css.replace(match[0],''); }
    }

    css=css.replace(/url\(\s*(['"]?)(?!data:|blob:|https?:|\/\/|#)([^'")]+)\1\s*\)/gi,(_,quote,path)=>{
      try{return `url("${new URL(path.trim(),url).href}")`;}catch(_){return `url(${quote}${path}${quote})`;}
    });
    return css;
  }

  function applyBodyAttrs(attrs={}){
    const body=editor.Canvas.getBody();
    if(!body) return;
    [...body.attributes].forEach(a=>{ if(!['data-gjs-type'].includes(a.name)) body.removeAttribute(a.name); });
    Object.entries(attrs).forEach(([name,value])=>{
      if(name.toLowerCase().startsWith('on')) return;
      try{ body.setAttribute(name,value); }catch(_){ }
    });
  }
  function fallbackPage(page){
    if(page.id==='welcome') return {html:'<section style="min-height:100vh;display:grid;place-items:center;text-align:center;background:linear-gradient(rgba(4,22,38,.55),rgba(4,22,38,.7)),url(../../images/cover.jpg) center/cover;color:white"><div><img src="../../logo.png" style="max-width:180px"><h1 style="font-family:Cormorant Garamond,serif;font-size:70px;margin:12px">Welcome to CeyBreez</h1><p>Stay. Taste. Explore Sri Lanka.</p><a href="../../index.html" style="display:inline-block;padding:13px 25px;border:1px solid #c9a35b;color:white;text-decoration:none">Enter Website</a></div></section>',css:''};
    return {html:`<main><section style="padding:100px 30px;text-align:center"><h1>${page.label}</h1><p>Original page could not be loaded. Start designing with the blocks panel.</p></section></main>`,css:''};
  }

  async function loadPage(page,forceOriginal=false){
    if(loading)return; loading=true; currentPage=page; renderPageList(); toast(`Loading ${page.label}...`);
    try{
      let data=null;
      if(!forceOriginal){ try{ data=JSON.parse(localStorage.getItem(draftKey(page.id))||'null'); }catch(_){ } }
      if(data?.project){ editor.loadProjectData(data.project); }
      else { const original=await fetchOriginal(page); editor.setComponents(original.html); editor.setStyle(original.css||''); applyBodyAttrs(original.bodyAttrs||{}); }
      editor.UndoManager.clear();
      toast(`${page.label} ready`);
    } finally { loading=false; }
  }

  function renderPageList(){
    const root=document.getElementById('pageList'); root.innerHTML='';
    PAGE_DEFS.forEach(p=>{ const b=document.createElement('button'); b.className=`cbp-page ${p.id===currentPage.id?'active':''}`; b.innerHTML=`<span class="dot"></span><span>${p.icon} ${p.label}</span>`; b.onclick=()=>saveCurrent(false).then(()=>loadPage(p)); root.appendChild(b); });
  }

  async function saveCurrent(show=true){
    const payload={page:currentPage.id,project:editor.getProjectData(),html:editor.getHtml(),css:editor.getCss(),updatedAt:new Date().toISOString()};
    localStorage.setItem(draftKey(currentPage.id),JSON.stringify(payload));
    if(show)toast('Draft saved in this browser');
    return payload;
  }

  async function publishCurrent(){
    const payload=await saveCurrent(false);
    try{
      const r=await fetch(`${API_BASE}/api/admin/page-builder/publish`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error(await r.text());
      toast('Published successfully');
    }catch(err){
      localStorage.setItem(`ceybreez-builder-publish:${currentPage.id}`,JSON.stringify(payload));
      toast('Saved locally. Worker publish route is not installed yet.');
      console.warn('Publish fallback:',err);
    }
  }

  async function exportZip(){
    const zip=new JSZip();
    for(const page of PAGE_DEFS){
      let data; try{data=JSON.parse(localStorage.getItem(draftKey(page.id))||'null');}catch(_){ }
      if(!data){ const original=await fetchOriginal(page); data={html:original.html,css:original.css}; }
      const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.label} | CeyBreez</title><style>${data.css||''}</style></head><body>${data.html||''}</body></html>`;
      zip.file(page.id==='welcome'?'welcome.html':page.file,html);
      if(data.project)zip.file(`builder-data/${page.id}.json`,JSON.stringify(data.project,null,2));
    }
    zip.file('README.txt','CEYBREEZ Builder Pro export. Upload the generated HTML files only after reviewing links and protected dynamic blocks.');
    const blob=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ceybreez-builder-export.zip'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); toast('ZIP exported');
  }

  document.querySelectorAll('.cbp-tabs button').forEach(btn=>btn.onclick=()=>{ document.querySelectorAll('.cbp-tabs button').forEach(x=>x.classList.toggle('active',x===btn)); document.querySelectorAll('.cbp-tab-body').forEach(x=>x.classList.toggle('active',x.id===`${btn.dataset.tab}Panel`)); });
  document.getElementById('undoBtn').onclick=()=>editor.UndoManager.undo();
  document.getElementById('redoBtn').onclick=()=>editor.UndoManager.redo();
  [['desktopBtn','desktop'],['tabletBtn','tablet'],['mobileBtn','mobile']].forEach(([id,device])=>document.getElementById(id).onclick=e=>{editor.setDevice(device);document.querySelectorAll('#desktopBtn,#tabletBtn,#mobileBtn').forEach(x=>x.classList.remove('active'));e.currentTarget.classList.add('active')});
  document.getElementById('previewBtn').onclick=()=>editor.runCommand(editor.Commands.isActive('preview')?'stop:preview':'preview');
  document.getElementById('saveBtn').onclick=()=>saveCurrent();
  document.getElementById('publishBtn').onclick=publishCurrent;
  document.getElementById('exportBtn').onclick=exportZip;
  document.getElementById('reloadPageBtn').onclick=()=>confirm('Reload the original page and discard unsaved canvas changes?')&&loadPage(currentPage,true);
  document.getElementById('clearDraftBtn').onclick=()=>{if(confirm('Delete the saved draft for this page?')){localStorage.removeItem(draftKey(currentPage.id));loadPage(currentPage,true)}};
  window.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveCurrent()} });
  setInterval(()=>{if(editor.getDirtyCount())saveCurrent(false).then(()=>editor.clearDirtyCount())},30000);

  renderPageList();
  loadPage(currentPage);
})();
