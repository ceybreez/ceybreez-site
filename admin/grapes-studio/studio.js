(() => {
  'use strict';
  const pages = {
    home: { label: 'Home', url: '../../index.html' },
    villas: { label: 'Villas', url: '../../villas.html' },
    apartments: { label: 'Apartments', url: '../../apartments.html' },
    homestays: { label: 'Homestays', url: '../../homestays.html' },
    tours: { label: 'Tours', url: '../../tours.html' },
    services: { label: 'Services', url: '../../services.html' },
    contact: { label: 'Contact', url: '../../contact.html' }
  };
  const $ = id => document.getElementById(id);
  const pageSelect = $('pageSelect');
  Object.entries(pages).forEach(([key,p]) => pageSelect.add(new Option(p.label,key)));
  let pageKey = 'home';
  let loading = false;
  const prefix = 'ceybreez-grapes-studio-v1:';

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    fromElement: false,
    storageManager: false,
    blockManager: { appendTo: '#blocks' },
    deviceManager: {
      devices: [
        { id:'desktop', name:'Desktop', width:'' },
        { id:'tablet', name:'Tablet', width:'768px', widthMedia:'992px' },
        { id:'mobile', name:'Mobile', width:'390px', widthMedia:'480px' }
      ]
    }
  });

  const bm = editor.BlockManager;
  bm.add('section',{label:'Section',category:'Layout',content:'<section style="padding:70px 20px"><div style="max-width:1200px;margin:auto"><h2>New Section</h2><p>Add content here.</p></div></section>'});
  bm.add('columns',{label:'2 Columns',category:'Layout',content:'<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:20px"><div>Column 1</div><div>Column 2</div></div>'});
  bm.add('heading',{label:'Heading',category:'Basic',content:'<h2>New Heading</h2>'});
  bm.add('text',{label:'Text',category:'Basic',content:'<p>New text content</p>'});
  bm.add('button',{label:'Button',category:'Basic',content:'<a href="#" style="display:inline-block;padding:12px 22px;border-radius:7px;background:#087f72;color:#fff;text-decoration:none">Button</a>'});
  bm.add('image',{label:'Image',category:'Basic',activate:true,content:{type:'image'}});
  bm.add('card',{label:'Card',category:'Basic',content:'<article style="padding:24px;background:#fff;border-radius:14px;box-shadow:0 12px 35px rgba(0,0,0,.12)"><h3>Card title</h3><p>Card content</p></article>'});

  function setStatus(text){ $('status').textContent = text; }
  function draftKey(){ return prefix + pageKey; }

  function rewriteUrls(html, baseUrl){
    const base = new URL(baseUrl, location.href);
    const doc = new DOMParser().parseFromString(html,'text/html');
    doc.querySelectorAll('[src]').forEach(el=>{ const v=el.getAttribute('src'); if(v && !/^(data:|blob:|https?:|\/\/)/i.test(v)) el.setAttribute('src',new URL(v,base).href); });
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(el=>{ const v=el.getAttribute('href'); if(v && !/^(https?:|\/\/)/i.test(v)) el.setAttribute('href',new URL(v,base).href); });
    doc.querySelectorAll('[href]').forEach(el=>{ const v=el.getAttribute('href'); if(v && !/^(#|mailto:|tel:|javascript:|https?:|\/\/)/i.test(v)) el.setAttribute('href',new URL(v,base).href); });
    return doc;
  }

  async function loadPage(){
    if(loading) return; loading=true; setStatus('Loading page…');
    try{
      const saved = localStorage.getItem(draftKey());
      if(saved){
        const data=JSON.parse(saved); editor.setComponents(data.html||''); editor.setStyle(data.css||''); setStatus('Draft loaded'); return;
      }
      const target=pages[pageKey].url;
      const res=await fetch(target,{cache:'no-store'});
      if(!res.ok) throw new Error(`Page load failed (${res.status})`);
      const raw=await res.text();
      const doc=rewriteUrls(raw,target);
      doc.querySelectorAll('script,noscript').forEach(n=>n.remove());
      const styles=[...doc.querySelectorAll('link[rel="stylesheet"]')].map(l=>`@import url("${l.href}");`).join('\n');
      const bodyClass=doc.body.className?` class="${doc.body.className}"`:'';
      const body=`<div data-original-body${bodyClass}>${doc.body.innerHTML}</div>`;
      editor.setComponents(body);
      editor.setStyle(styles+'\nbody{margin:0;}');
      setStatus('Page loaded');
    }catch(err){ console.error(err); setStatus(err.message); editor.setComponents(`<section style="padding:40px"><h2>Could not load page</h2><p>${err.message}</p></section>`); }
    finally{loading=false;}
  }

  $('saveBtn').onclick=()=>{
    localStorage.setItem(draftKey(),JSON.stringify({html:editor.getHtml(),css:editor.getCss(),updatedAt:new Date().toISOString()}));
    setStatus(`Draft saved for ${pages[pageKey].label}`);
  };
  $('exportBtn').onclick=()=>{
    const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${editor.getCss()}</style></head><body>${editor.getHtml()}</body></html>`;
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); a.download=`ceybreez-${pageKey}-designed.html`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
  };
  $('undoBtn').onclick=()=>editor.UndoManager.undo();
  $('redoBtn').onclick=()=>editor.UndoManager.redo();
  $('desktopBtn').onclick=()=>editor.setDevice('Desktop');
  $('tabletBtn').onclick=()=>editor.setDevice('Tablet');
  $('mobileBtn').onclick=()=>editor.setDevice('Mobile');
  pageSelect.onchange=()=>{pageKey=pageSelect.value;loadPage();};
  loadPage();
})();
