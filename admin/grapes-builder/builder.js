(() => {
  'use strict';
  const statusEl = document.getElementById('status');
  const setStatus = (msg, type='') => { statusEl.textContent = msg; statusEl.className = `cb-status ${type}`.trim(); };
  const safeName = (s) => String(s || 'ceybreez-home').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase();

  if (!window.grapesjs) {
    setStatus('GrapesJS library failed to load. Check internet/CDN access.', 'error');
    return;
  }

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    fromElement: false,
    storageManager: {
      type: 'local',
      autosave: true,
      autoload: true,
      stepsBeforeSave: 1,
      options: { local: { key: 'ceybreez-gjs-home-v1' } }
    },
    blockManager: { appendTo: '#blocks' },
    layerManager: { appendTo: '#layers' },
    styleManager: {
      appendTo: '#styles',
      sectors: [
        { name:'Layout', open:true, buildProps:['display','position','width','min-height','max-width','flex-direction','justify-content','align-items','gap','overflow'] },
        { name:'Spacing', open:true, buildProps:['margin','padding'] },
        { name:'Typography', open:true, buildProps:['font-family','font-size','font-weight','line-height','letter-spacing','color','text-align','text-decoration'] },
        { name:'Background', open:false, buildProps:['background-color','background-image','background-repeat','background-position','background-size'] },
        { name:'Border & Shadow', open:false, buildProps:['border','border-radius','box-shadow','opacity'] },
        { name:'Effects', open:false, buildProps:['transform','transition'] }
      ]
    },
    traitManager: { appendTo: '#traits' },
    deviceManager: {
      devices: [
        { id:'desktop', name:'Desktop', width:'' },
        { id:'tablet', name:'Tablet', width:'768px', widthMedia:'991px' },
        { id:'mobile', name:'Mobile', width:'390px', widthMedia:'767px' }
      ]
    },
    assetManager: {
      upload: false,
      embedAsBase64: true,
      multiUpload: true
    },
    selectorManager: { componentFirst: true },
    canvas: {
      styles: [
        'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap'
      ]
    }
  });

  const bm = editor.BlockManager;
  const addBlock = (id,label,category,content,attrs={}) => bm.add(id,{label,category,content,attributes:attrs});
  addBlock('section','Section','Layout',`<section style="padding:72px 24px;min-height:220px"><div style="max-width:1200px;margin:0 auto"><h2>New Section</h2><p>Add your content here.</p></div></section>`);
  addBlock('container','Container','Layout',`<div style="max-width:1200px;margin:0 auto;padding:24px"></div>`);
  addBlock('columns','2 Columns','Layout',`<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;padding:24px"><div style="min-height:100px;padding:20px">Column 1</div><div style="min-height:100px;padding:20px">Column 2</div></div>`);
  addBlock('heading','Heading','Basic','<h2 style="font-family:Cormorant Garamond,serif;font-size:42px">Your heading</h2>');
  addBlock('text','Text','Basic','<p style="font-family:Poppins,sans-serif;line-height:1.7">Write your text here.</p>');
  addBlock('button','Button','Basic','<a href="#" style="display:inline-block;padding:13px 24px;background:#0b8f83;color:white;border-radius:30px;text-decoration:none;font-family:Poppins,sans-serif">Button</a>');
  addBlock('image','Image','Media',{type:'image',src:'https://via.placeholder.com/900x500?text=CeyBreez+Image',style:{width:'100%',height:'auto',display:'block'}});
  addBlock('video','Video','Media',{type:'video',src:'',style:{width:'100%',minHeight:'320px'}});
  addBlock('divider','Divider','Basic','<hr style="border:0;border-top:1px solid #ddd;margin:32px 0">');
  addBlock('spacer','Spacer','Layout','<div style="height:60px"></div>');
  addBlock('card','Card','Basic',`<article style="padding:24px;border-radius:18px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.1)"><img src="https://via.placeholder.com/700x420?text=CeyBreez" style="width:100%;height:auto;border-radius:12px"><h3>Card title</h3><p>Card description.</p><a href="#">Learn more</a></article>`);

  function stripUnsafe(doc){
    doc.querySelectorAll('script,noscript').forEach(n=>n.remove());
    doc.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
    return doc;
  }

  async function getCssFromPage(doc, baseUrl){
    const parts=[];
    for(const link of [...doc.querySelectorAll('link[rel="stylesheet"][href]')]){
      try{
        const url=new URL(link.getAttribute('href'),baseUrl).href;
        if(url.includes('fonts.googleapis.com')) continue;
        const res=await fetch(url,{cache:'no-store'});
        if(res.ok){
          let css=await res.text();
          const root=new URL('.',url).href;
          css=css.replace(/url\((['"]?)(?!data:|https?:|\/)([^)'"\s]+)\1\)/g,(_,q,p)=>`url("${new URL(p,root).href}")`);
          parts.push(`/* ${url} */\n${css}`);
        }
      }catch(err){ console.warn('CSS import skipped',err); }
    }
    for(const style of doc.querySelectorAll('style')) parts.push(style.textContent||'');
    return parts.join('\n');
  }

  async function importHome(force=false){
    if(!force && localStorage.getItem('ceybreez-gjs-home-v1')){
      setStatus('Saved draft loaded. Use Reload Home to import the original again.','ok');
      return;
    }
    setStatus('Importing the current Home page…');
    try{
      const url=new URL('../../index.html',location.href).href;
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) throw new Error(`Home page returned ${res.status}`);
      const html=await res.text();
      const doc=stripUnsafe(new DOMParser().parseFromString(html,'text/html'));
      const css=await getCssFromPage(doc,url);
      const body=doc.body;
      body.querySelectorAll('link,meta,title').forEach(n=>n.remove());
      editor.setComponents(body.innerHTML);
      editor.setStyle(css);
      editor.store();
      setStatus('Home page imported. Click any element to edit it.','ok');
    }catch(err){
      console.error(err);
      setStatus(`Import failed: ${err.message}`,'error');
    }
  }

  async function uploadImages(files){
    const valid=[...files].filter(f=>f.type.startsWith('image/'));
    if(!valid.length) return;
    for(const file of valid){
      if(file.size>8*1024*1024){ setStatus(`${file.name} is larger than 8 MB.`,'error'); continue; }
      const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
      editor.AssetManager.add({src:data,name:file.name,type:'image'});
    }
    editor.AssetManager.open();
    setStatus(`${valid.length} image(s) added to the Asset Manager.`, 'ok');
  }

  editor.on('load',()=>{
    const am=editor.AssetManager;
    const input=document.getElementById('assetInput');
    input.addEventListener('change',()=>uploadImages(input.files).finally(()=>{input.value=''}));
    editor.Commands.add('open-assets-upload',{run(){input.click();}});
    const pfx=editor.getConfig().stylePrefix;
    const btn=document.createElement('button');
    btn.textContent='Upload Image';
    btn.className=`${pfx}btn-prim`;
    btn.style.cssText='margin:10px;padding:9px 12px;width:calc(100% - 20px)';
    btn.onclick=()=>input.click();
    const modal=editor.Modal;
    editor.on('asset:open',()=>setTimeout(()=>{
      const c=modal.getContentEl();
      if(c && !c.querySelector('[data-cb-upload]')){btn.dataset.cbUpload='1';c.prepend(btn)}
    },0));
    importHome(false);
  });

  editor.on('storage:end:store',()=>setStatus('Draft saved in this browser.','ok'));
  editor.on('storage:error',err=>{console.error(err);setStatus('Draft save failed.','error')});

  document.getElementById('loadHome').onclick=()=>{
    if(confirm('Reload the original Home page? This replaces the current local draft.')){
      localStorage.removeItem('ceybreez-gjs-home-v1');
      importHome(true);
    }
  };
  document.getElementById('desktop').onclick=()=>editor.setDevice('desktop');
  document.getElementById('tablet').onclick=()=>editor.setDevice('tablet');
  document.getElementById('mobile').onclick=()=>editor.setDevice('mobile');
  document.getElementById('undo').onclick=()=>editor.UndoManager.undo();
  document.getElementById('redo').onclick=()=>editor.UndoManager.redo();
  document.getElementById('preview').onclick=()=>editor.runCommand('preview');
  document.getElementById('save').onclick=async()=>{await editor.store();setStatus('Draft saved locally.','ok')};

  document.getElementById('export').onclick=()=>{
    const html=editor.getHtml();
    const css=editor.getCss({avoidProtected:true});
    const output=`<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>CeyBreez Home Export</title>\n<style>${css}</style>\n</head>\n<body>${html}</body>\n</html>`;
    const blob=new Blob([output],{type:'text/html'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`${safeName('ceybreez-home')}.html`;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    setStatus('HTML export created. This does not overwrite the live site.','ok');
  };

  document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    document.getElementById('styles').classList.toggle('hidden',btn.dataset.tab!=='styles');
    document.getElementById('traits').classList.toggle('hidden',btn.dataset.tab!=='traits');
  });
})();
