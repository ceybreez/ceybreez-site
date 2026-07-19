(() => {
  const $ = (id) => document.getElementById(id);
  const frame = $('siteFrame');
  const shell = $('frameShell');
  const status = $('status');
  const layers = $('layers');
  const form = $('inspectorForm');
  const empty = $('emptyInspector');
  const pageSelect = $('pageSelect');
  let doc, selected, originalStyle = '', history = [], future = [], addedCounter = 0;
  const editableSelector = 'header, nav, section, footer, h1, h2, h3, p, a, button, img, video, .logo, [class*="hero"], [class*="card"]';

  const setStatus = (msg) => { status.textContent = msg; clearTimeout(setStatus.t); setStatus.t=setTimeout(()=>status.textContent='Ready',1800); };
  const isText = el => /^(H1|H2|H3|H4|P|SPAN|A|BUTTON)$/.test(el.tagName);
  const label = el => {
    const txt=(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,42);
    return `${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}${el.classList.length?'.'+[...el.classList].slice(0,2).join('.'):''}${txt?' — '+txt:''}`;
  };
  const pathOf = el => {
    const parts=[]; while(el && el!==doc.body){let p=el.tagName.toLowerCase();if(el.id){p+='#'+el.id;parts.unshift(p);break;} const same=[...el.parentElement.children].filter(x=>x.tagName===el.tagName);if(same.length>1)p+=`:nth-of-type(${same.indexOf(el)+1})`;parts.unshift(p);el=el.parentElement;}return parts.join(' > ');
  };
  const rgbToHex = c => { const m=(c||'').match(/\d+/g); return m&&m.length>=3?'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):'#222222'; };
  const px = v => (!v||v==='auto'||v==='none')?'':v;

  function injectEditorStyles(){
    const st=doc.createElement('style'); st.id='v4-editor-style'; st.textContent='.v4-selected{outline:3px solid #18a66d!important;outline-offset:3px!important}.v4-hover{outline:2px dashed #28b77c!important;outline-offset:2px!important}.v4-added{min-height:36px}'; doc.head.appendChild(st);
  }
  function wirePreview(){
    doc=frame.contentDocument;
    if(!doc) return;
    injectEditorStyles();
    doc.addEventListener('click', e => {
      const el=e.target.closest(editableSelector); if(!el) return;
      e.preventDefault(); e.stopPropagation(); select(el);
    }, true);
    doc.addEventListener('mouseover',e=>{const el=e.target.closest(editableSelector);if(el&&el!==selected)el.classList.add('v4-hover')},true);
    doc.addEventListener('mouseout',e=>{const el=e.target.closest(editableSelector);if(el)el.classList.remove('v4-hover')},true);
    buildLayers(); restoreDraft(); setStatus('Preview loaded');
  }
  function buildLayers(){
    if(!doc)return; const els=[...doc.querySelectorAll(editableSelector)].filter((x,i,a)=>a.indexOf(x)===i).slice(0,250);
    layers.innerHTML=''; els.forEach(el=>{const b=document.createElement('button');b.className='layer';b.innerHTML=`${label(el)}<small>${pathOf(el)}</small>`;b.onclick=()=>select(el);layers.appendChild(b)}); if(!els.length)layers.innerHTML='<div class="empty">No editable elements found.</div>';
  }
  function snapshot(){ if(!selected)return; history.push({el:selected,style:selected.getAttribute('style')||'',text:isText(selected)?selected.textContent:null}); if(history.length>60)history.shift(); future=[]; }
  function select(el){
    if(selected)selected.classList.remove('v4-selected'); selected=el; selected.classList.remove('v4-hover');selected.classList.add('v4-selected'); originalStyle=selected.getAttribute('style')||'';
    empty.classList.add('hidden'); form.classList.remove('hidden'); $('selectedName').textContent=label(el);$('selectedPath').textContent=pathOf(el);
    const cs=doc.defaultView.getComputedStyle(el), tr=el.dataset.v4Transform?JSON.parse(el.dataset.v4Transform):{scale:1,x:0,y:0,rotate:0};
    $('width').value=px(el.style.width||''); $('height').value=px(el.style.height||'');$('maxWidth').value=px(el.style.maxWidth||'');$('scale').value=tr.scale||1;$('offsetX').value=tr.x||0;$('offsetY').value=tr.y||0;$('rotate').value=tr.rotate||0;$('opacity').value=el.style.opacity||cs.opacity||1;$('align').value=el.style.textAlign||'';
    const bg=el.style.backgroundImage||cs.backgroundImage; $('backgroundImage').value=(bg&&bg!=='none')?bg.replace(/^url\(["']?|["']?\)$/g,''):'';$('backgroundSize').value=el.style.backgroundSize||'';$('backgroundRepeat').value=el.style.backgroundRepeat||'no-repeat';
    const pos=(el.style.backgroundPosition||cs.backgroundPosition||'50% 50%').split(' ');$('bgX').value=parseInt(pos[0])||50;$('bgY').value=parseInt(pos[1])||50;$('bgXOut').value=$('bgX').value+'%';$('bgYOut').value=$('bgY').value+'%';$('bgZoom').value=el.dataset.v4BgZoom||100;$('bgZoomOut').value=$('bgZoom').value+'%';$('backgroundColor').value=rgbToHex(cs.backgroundColor);
    $('textValue').value=isText(el)?el.textContent.trim():'';$('textValue').disabled=!isText(el);$('fontSize').value=px(el.style.fontSize||'');$('fontWeight').value=el.style.fontWeight||'';$('color').value=rgbToHex(cs.color);$('radius').value=px(el.style.borderRadius||'');
    const link=el.closest('a');$('lockedLink').value=link?link.getAttribute('href')||'':'Not a link';$('linkGroup').classList.toggle('hidden',!link);
    $('deleteElement').disabled=!el.classList.contains('v4-added');
  }
  function applyTransform(){ if(!selected)return; const t={scale:+$('scale').value||1,x:+$('offsetX').value||0,y:+$('offsetY').value||0,rotate:+$('rotate').value||0};selected.dataset.v4Transform=JSON.stringify(t);selected.style.transform=`translate(${t.x}px,${t.y}px) scale(${t.scale}) rotate(${t.rotate}deg)`;selected.style.transformOrigin='center'; }
  const binds={width:'width',height:'height',maxWidth:'maxWidth',opacity:'opacity',align:'textAlign',fontSize:'fontSize',fontWeight:'fontWeight',color:'color',radius:'borderRadius',backgroundColor:'backgroundColor',backgroundRepeat:'backgroundRepeat'};
  Object.entries(binds).forEach(([id,prop])=>$(id).addEventListener('input',()=>{if(!selected)return;snapshot();selected.style[prop]=$(id).value}));
  ['scale','offsetX','offsetY','rotate'].forEach(id=>$(id).addEventListener('input',()=>{snapshot();applyTransform()}));
  $('textValue').addEventListener('input',()=>{if(selected&&isText(selected)){snapshot();selected.textContent=$('textValue').value}});
  $('backgroundImage').addEventListener('change',()=>{if(selected){snapshot();selected.style.backgroundImage=$('backgroundImage').value?`url("${$('backgroundImage').value}")`:''}});
  $('backgroundSize').addEventListener('change',()=>{if(selected){snapshot();selected.style.backgroundSize=$('backgroundSize').value}});
  function applyBgPos(){if(!selected)return;selected.style.backgroundPosition=`${$('bgX').value}% ${$('bgY').value}%`;$('bgXOut').value=$('bgX').value+'%';$('bgYOut').value=$('bgY').value+'%'}
  $('bgX').addEventListener('input',()=>{snapshot();applyBgPos()});$('bgY').addEventListener('input',()=>{snapshot();applyBgPos()});
  $('bgZoom').addEventListener('input',()=>{if(!selected)return;snapshot();const z=$('bgZoom').value;selected.dataset.v4BgZoom=z;selected.style.backgroundSize=`${z}% auto`;$('bgZoomOut').value=z+'%'});

  function addElement(type){if(!doc)return;let parent=selected?.closest('section,header,footer,main')||doc.body,el;if(type==='heading'){el=doc.createElement('h2');el.textContent='New heading'}else if(type==='text'){el=doc.createElement('p');el.textContent='New text. Click and edit it.'}else if(type==='button'){el=doc.createElement('a');el.textContent='New button';el.href='#';el.className='v4-added';el.style.cssText='display:inline-block;padding:12px 20px;border-radius:8px;background:#0f6d4d;color:#fff;text-decoration:none'}else{el=doc.createElement('img');el.src='https://placehold.co/800x500?text=CeyBreez+Image';el.alt='New image';el.style.maxWidth='100%'}el.classList.add('v4-added');el.dataset.v4Added=String(++addedCounter);parent.appendChild(el);buildLayers();select(el);setStatus(type+' added')}
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addElement(b.dataset.add));
  $('duplicateElement').onclick=()=>{if(!selected)return;const c=selected.cloneNode(true);c.classList.add('v4-added');c.dataset.v4Added=String(++addedCounter);selected.after(c);buildLayers();select(c)};
  $('deleteElement').onclick=()=>{if(selected?.classList.contains('v4-added')){selected.remove();selected=null;form.classList.add('hidden');empty.classList.remove('hidden');buildLayers()}};
  $('resetElement').onclick=()=>{if(!selected)return;selected.setAttribute('style',originalStyle);delete selected.dataset.v4Transform;delete selected.dataset.v4BgZoom;select(selected)};
  $('undoBtn').onclick=()=>{const s=history.pop();if(!s)return;future.push({el:s.el,style:s.el.getAttribute('style')||'',text:isText(s.el)?s.el.textContent:null});s.el.setAttribute('style',s.style);if(s.text!==null)s.el.textContent=s.text;select(s.el)};
  $('redoBtn').onclick=()=>{const s=future.pop();if(!s)return;history.push({el:s.el,style:s.el.getAttribute('style')||'',text:isText(s.el)?s.el.textContent:null});s.el.setAttribute('style',s.style);if(s.text!==null)s.el.textContent=s.text;select(s.el)};
  function draftKey(){return 'ceybreez-v4-draft:'+pageSelect.value}
  $('saveBtn').onclick=()=>{if(!doc)return;const records=[...doc.querySelectorAll('[style],.v4-added')].filter(el=>el.id!=='v4-editor-style').map(el=>({path:pathOf(el),style:el.getAttribute('style')||'',text:isText(el)?el.textContent:null,html:el.classList.contains('v4-added')?el.outerHTML:null,parent:el.classList.contains('v4-added')?pathOf(el.parentElement):null}));localStorage.setItem(draftKey(),JSON.stringify(records));setStatus('Draft saved in this browser')};
  function restoreDraft(){const raw=localStorage.getItem(draftKey());if(!raw)return;try{JSON.parse(raw).forEach(r=>{if(r.html&&r.parent){const p=doc.querySelector(r.parent);if(p&&!doc.querySelector(`[data-v4-added="${r.added}"]`)){const box=doc.createElement('div');box.innerHTML=r.html;p.appendChild(box.firstElementChild)}}else{const el=doc.querySelector(r.path);if(el){el.setAttribute('style',r.style||'');if(r.text!==null&&isText(el))el.textContent=r.text}}});buildLayers();setStatus('Local draft restored')}catch(e){console.warn(e)}}
  $('previewBtn').onclick=()=>window.open(pageSelect.value,'_blank');$('backBtn').onclick=()=>location.href='../index.html';$('refreshLayers').onclick=buildLayers;
  pageSelect.onchange=()=>{frame.src=pageSelect.value};frame.addEventListener('load',wirePreview);
  document.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-device]').forEach(x=>x.classList.remove('active'));b.classList.add('active');shell.className='frame-shell '+b.dataset.device});
})();
