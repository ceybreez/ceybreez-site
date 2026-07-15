(function(){
'use strict';
const API='https://ceybreez-contact-api.ceybreez.workers.dev';
const token=()=>localStorage.getItem('CEYBREEZ_ADMIN_TOKEN')||'';
const $=id=>document.getElementById(id);
const pages={home:'../index.html',villas:'../villas.html',apartments:'../apartments.html',homestays:'../homestays.html',tours:'../tours.html',services:'../services.html',contact:'../contact.html'};
let state={page:'home',mode:'append',nodes:[],theme:{},pageTheme:{},imported:false};
let selected=null,undo=[],redo=[];
const defaults={
 section:{content:'',style:{padding:40,background:'#ffffff',width:100,minHeight:160,radius:0}},
 heading:{content:'Your Heading',style:{fontSize:44,fontWeight:700,color:'#17212b',align:'center',padding:10,margin:0,width:100}},
 text:{content:'Add your text here.',style:{fontSize:17,fontWeight:400,color:'#334155',align:'left',padding:10,margin:0,width:100}},
 button:{content:'Learn More',url:'#',style:{fontSize:16,fontWeight:600,color:'#ffffff',background:'#0f766e',align:'center',padding:14,margin:8,width:35,radius:30}},
 image:{content:'Image',url:'https://ceybreez.com/logo.png',style:{width:70,padding:8,margin:0,radius:12,align:'center'}},
 video:{content:'Video',url:'',style:{width:80,padding:8,margin:0,radius:12}},
 columns:{content:'',columns:2,style:{padding:15,margin:0,width:100,background:'#ffffff'}},
 divider:{content:'',style:{margin:20,width:100,background:'#cbd5df',minHeight:1}},
 spacer:{content:'',style:{minHeight:50,width:100}},
 counter:{content:'450+|Happy Guests',style:{fontSize:34,fontWeight:700,color:'#0f766e',align:'center',padding:20,width:100}},
 reviews:{content:'Featured Guest Reviews',style:{fontSize:30,fontWeight:700,color:'#17212b',align:'center',padding:25,width:100,background:'#f7faf9'}},
 cta:{content:'Ready to plan your Sri Lanka stay?|Contact CeyBreez today|Contact Us',url:'contact.html',style:{fontSize:34,fontWeight:700,color:'#ffffff',align:'center',padding:45,width:100,background:'#0f766e',radius:18}},
 html:{content:'<section><h2>Imported Section</h2></section>',style:{width:100,padding:0,margin:0,minHeight:0,background:'transparent'}}
};
const id=()=>`cb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color=(v,d)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:d;
function snapshot(){undo.push(JSON.stringify(state));if(undo.length>40)undo.shift();redo=[]}
function make(type){return {id:id(),type,...clone(defaults[type]||defaults.text),className:''}}
function status(t){if(!$('cbpStatus'))return;$('cbpStatus').textContent=t;clearTimeout(status.timer);status.timer=setTimeout(()=>{$('cbpStatus').textContent='Ready'},3000)}
function style(n){const s=n.style||{};return `width:${s.width??100}%;min-height:${s.minHeight||0}px;font-size:${s.fontSize||16}px;font-weight:${s.fontWeight||400};color:${s.color||'inherit'};background:${s.background||'transparent'};text-align:${s.align||'left'};padding:${s.padding||0}px;margin:${s.margin||0}px auto;border-radius:${s.radius||0}px;`}
function content(n){
 if(n.type==='html')return `<div class="cbp-imported-html">${n.content||''}</div>`;
 if(n.type==='heading')return `<h2>${esc(n.content)}</h2>`;
 if(n.type==='text')return `<p>${esc(n.content).replace(/\n/g,'<br>')}</p>`;
 if(n.type==='button')return `<a href="${esc(n.url||'#')}" style="display:inline-block;color:inherit;text-decoration:none">${esc(n.content)}</a>`;
 if(n.type==='image')return `<img src="${esc(n.url)}" alt="${esc(n.content)}" style="width:100%;border-radius:inherit">`;
 if(n.type==='video')return n.url?`<video src="${esc(n.url)}" controls style="width:100%;border-radius:inherit"></video>`:'<div>Video URL required</div>';
 if(n.type==='divider'||n.type==='spacer')return '';
 if(n.type==='counter'){const [a,b]=String(n.content).split('|');return `<div><strong style="display:block;font-size:1.5em">${esc(a)}</strong><span>${esc(b||'')}</span></div>`}
 if(n.type==='reviews')return `<div><h2>${esc(n.content)}</h2><div class="cbp-demo-reviews">★★★★★<br><small>Live reviews load from Reviews CMS.</small></div></div>`;
 if(n.type==='cta'){const [a,b,c]=String(n.content).split('|');return `<div><h2>${esc(a)}</h2><p>${esc(b||'')}</p><a href="${esc(n.url||'#')}" style="display:inline-block;background:#fff;color:#0f766e;padding:12px 20px;border-radius:999px;text-decoration:none">${esc(c||'Contact Us')}</a></div>`}
 if(n.type==='columns')return `<div class="cbp-columns" style="grid-template-columns:repeat(${n.columns||2},1fr)">${Array.from({length:n.columns||2},(_,i)=>`<div class="cbp-column">Column ${i+1}</div>`).join('')}</div>`;
 if(n.type==='section')return '<div style="text-align:center;color:#64748b">Section container</div>';
 return esc(n.content);
}
function render(){
 const c=$('cbpCanvas');if(!c)return;
 if(!state.nodes.length){c.innerHTML='<div class="cbp-empty">No builder content yet. Click <b>Import Current Live Page</b> or add an element.</div>';return}
 c.innerHTML=state.nodes.map(n=>`<div class="cbp-node ${n.id===selected?'selected':''} ${esc(n.className||'')} ${n.type==='html'?'cbp-imported-node':''}" draggable="true" data-id="${n.id}" data-type="${n.type}" style="${style(n)}"><span class="cbp-node-tools">${n.type==='html'?'imported section':n.type} · drag to reorder</span>${content(n)}</div>`).join('');
 bindNodes();
}
function bindNodes(){document.querySelectorAll('.cbp-node').forEach(el=>{el.onclick=e=>{e.stopPropagation();select(el.dataset.id)};el.ondragstart=e=>{e.dataTransfer.setData('node',el.dataset.id);el.classList.add('dragging')};el.ondragend=()=>el.classList.remove('dragging');el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData('node');if(!from||from===el.dataset.id)return;snapshot();const a=state.nodes.findIndex(x=>x.id===from),b=state.nodes.findIndex(x=>x.id===el.dataset.id);const [m]=state.nodes.splice(a,1);state.nodes.splice(b,0,m);render()}})}
function add(type){snapshot();state.nodes.push(make(type));selected=state.nodes.at(-1).id;render();fillInspector()}
function select(x){selected=x;render();fillInspector()}
const node=()=>state.nodes.find(n=>n.id===selected);
function fillInspector(){
 const n=node();$('cbpInspector')?.classList.toggle('hidden',!n);$('cbpInspectorEmpty')?.classList.toggle('hidden',!!n);if(!n)return;
 const s=n.style||{};$('iContent').value=n.content||'';$('iUrl').value=n.url||'';$('iWidth').value=s.width??100;$('iHeight').value=s.minHeight||0;$('iFontSize').value=s.fontSize||16;$('iWeight').value=String(s.fontWeight||400);$('iAlign').value=s.align||'left';$('iColor').value=color(s.color,'#17212b');$('iBg').value=color(s.background,'#ffffff');$('iPadding').value=s.padding||0;$('iMargin').value=s.margin||0;$('iRadius').value=s.radius||0;$('iColumns').value=n.columns||2;$('iClass').value=n.className||'';
 $('iContentLabel').textContent=n.type==='html'?'Section HTML (advanced edit)':'Content';
 $('iUrlWrap').classList.toggle('hidden',!['button','image','video','cta'].includes(n.type));
 $('iColumnsWrap').classList.toggle('hidden',n.type!=='columns');
}
function update(){const n=node();if(!n)return;n.content=$('iContent').value;n.url=$('iUrl').value;n.className=$('iClass').value;n.columns=+$('iColumns').value||2;n.style={...(n.style||{}),width:+$('iWidth').value||100,minHeight:+$('iHeight').value||0,fontSize:+$('iFontSize').value||16,fontWeight:+$('iWeight').value||400,align:$('iAlign').value,color:$('iColor').value,background:$('iBg').value,padding:+$('iPadding').value||0,margin:+$('iMargin').value||0,radius:+$('iRadius').value||0};render()}
async function getContent(){const r=await fetch(API+'/api/site-content',{cache:'no-store'});if(!r.ok)throw Error('Could not load site content');return r.json()}
async function saveKey(k,value){const r=await fetch(API+'/api/admin/site-content',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({[k]:JSON.stringify(value)})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Save failed');return j}
const key=(kind,page=state.page)=>`builder_${kind}_${page}`;
function safeParse(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
function applyThemeInputs(t){$('themePrimary').value=color(t.primary,'#0f766e');$('themeSecondary').value=color(t.secondary,'#d4a24c');$('themeFont').value=t.font||'Poppins, sans-serif';$('themeRadius').value=t.radius??14;$('themeRadiusVal').textContent=$('themeRadius').value+'px'}
const themeValue=()=>({primary:$('themePrimary').value,secondary:$('themeSecondary').value,font:$('themeFont').value,radius:+$('themeRadius').value});
function clearImportedStyles(){document.querySelectorAll('[data-cbp-import-style]').forEach(x=>x.remove())}
function loadImportedStyles(doc,pageUrl){clearImportedStyles();doc.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{const href=link.getAttribute('href');if(!href)return;const el=document.createElement('link');el.rel='stylesheet';el.href=new URL(href,pageUrl).href;el.dataset.cbpImportStyle='1';document.head.appendChild(el)});doc.querySelectorAll('style').forEach(st=>{const el=document.createElement('style');el.dataset.cbpImportStyle='1';el.textContent=st.textContent;document.head.appendChild(el)})}
function absolutize(root,pageUrl){root.querySelectorAll('[src]').forEach(el=>{const v=el.getAttribute('src');if(v&&!v.startsWith('data:'))el.setAttribute('src',new URL(v,pageUrl).href)});root.querySelectorAll('[href]').forEach(el=>{const v=el.getAttribute('href');if(v&&!v.startsWith('#')&&!v.startsWith('mailto:')&&!v.startsWith('tel:')&&!v.startsWith('javascript:'))el.setAttribute('href',new URL(v,pageUrl).href)});root.querySelectorAll('[srcset]').forEach(el=>{const v=el.getAttribute('srcset');if(v)el.setAttribute('srcset',v.split(',').map(x=>{const [u,d]=x.trim().split(/\s+/,2);return `${new URL(u,pageUrl).href}${d?' '+d:''}`}).join(', '))})}
function isEditableTopLevel(el){
 if(!el||el.nodeType!==1)return false;
 const tag=el.tagName.toLowerCase();
 if(['script','style','link','header','footer','nav','noscript','template'].includes(tag))return false;
 if(el.id==='ceybreezBuilderRoot')return false;
 const cls=String(el.className||'').toLowerCase();
 const ident=`${el.id||''} ${cls}`.toLowerCase();
 if(/modal|overlay|popup|whatsapp|cookie|loader|welcome|preloader|floating/.test(ident))return false;
 return el.matches('main,section,article')||tag==='main'||(tag==='div'&&el.children.length>0);
}
async function importLivePage(confirmFirst=true){
 if(confirmFirst&&state.nodes.length&&!confirm('Replace the current builder draft with sections imported from the live page?'))return;
 const pageUrl=new URL(pages[$('cbpPage').value],location.href).href.split('?')[0];status('Importing current live page...');
 const r=await fetch(pageUrl,{cache:'no-store'});if(!r.ok)throw Error(`Could not open live page (${r.status})`);
 const html=await r.text();const doc=new DOMParser().parseFromString(html,'text/html');loadImportedStyles(doc,pageUrl);
 const source=doc.querySelector('main')||doc.body;
 let elements=[...source.children].filter(isEditableTopLevel);
 if(source.tagName.toLowerCase()==='main'&&elements.length===0)elements=[source];
 const imported=[];
 elements.forEach((el,index)=>{const copy=el.cloneNode(true);copy.querySelectorAll('script,style,link,noscript').forEach(x=>x.remove());copy.removeAttribute('onclick');copy.querySelectorAll('[onclick],[onchange],[onsubmit],[onload],[onerror]').forEach(x=>[...x.attributes].forEach(a=>{if(/^on/i.test(a.name))x.removeAttribute(a.name)}));absolutize(copy,pageUrl);imported.push({id:id(),type:'html',content:copy.outerHTML,className:'',sourceLabel:copy.id||copy.className||`Section ${index+1}`,style:{width:100,minHeight:0,padding:0,margin:0,background:'transparent',fontSize:16,fontWeight:400,color:'#17212b',align:'left',radius:0}})});
 if(!imported.length)throw Error('No editable page sections were found.');
 snapshot();state={...state,page:$('cbpPage').value,mode:'replace',nodes:imported,imported:true,importedFrom:pageUrl,importedAt:new Date().toISOString()};$('cbpMode').value='replace';selected=null;render();fillInspector();status(`${imported.length} live section(s) imported. Save Draft before editing.`)
}
async function loadPage(){
 try{const all=await getContent();const page=$('cbpPage').value;const raw=all[key('draft',page)]||all[key('live',page)];state=raw?safeParse(raw,null):null;
 if(!state){state={page,mode:'append',nodes:[],theme:{},pageTheme:{},imported:false}}
 state.page=page;$('cbpMode').value=state.mode||'append';const gt=safeParse(all.builder_theme_global,{});const pt=safeParse(all[key('theme',page)],{});state.theme=gt;state.pageTheme=pt;applyThemeInputs({...gt,...pt});undo=[];redo=[];selected=null;render();fillInspector();
 if(!state.nodes.length){await importLivePage(false)}else status('Builder draft loaded');
 }catch(e){status(e.message);console.error(e)}
}
async function saveDraft(){state.mode=$('cbpMode').value;await saveKey(key('draft'),state);localStorage.setItem(key('preview'),JSON.stringify(state));status('Draft saved. Live website unchanged.')}
async function publish(){if(!confirm(`Publish ${state.page.toUpperCase()} to the LIVE website?`))return;state.mode=$('cbpMode').value;const all=await getContent();let versions=safeParse(all[key('versions')],[]);const current=all[key('live')];if(current){const old=safeParse(current,null);if(old){versions.unshift({id:Date.now(),date:new Date().toISOString(),data:old});versions=versions.slice(0,15)}}await saveKey(key('versions'),versions);await saveKey(key('live'),state);await saveKey(key('draft'),state);status('Published to live website')}
function preview(){state.mode=$('cbpMode').value;localStorage.setItem(key('preview'),JSON.stringify(state));window.open(pages[state.page]+'?cb_builder_preview='+encodeURIComponent(state.page),'_blank')}
async function versions(){const all=await getContent();const arr=safeParse(all[key('versions')],[]);$('versionsList').innerHTML=arr.length?arr.map((v,i)=>`<div class="version-row"><span>${new Date(v.date).toLocaleString()}</span><span><button data-preview="${i}">Preview</button><button data-restore="${i}">Restore</button></span></div>`).join(''):'<p style="padding:20px">No previous versions yet.</p>';$('versionsDialog').showModal();document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{localStorage.setItem(key('preview'),JSON.stringify(arr[+b.dataset.preview].data));window.open(pages[state.page]+'?cb_builder_preview='+state.page,'_blank')});document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{if(!confirm('Restore this version as draft?'))return;state=clone(arr[+b.dataset.restore].data);await saveKey(key('draft'),state);render();$('versionsDialog').close();status('Version restored as draft')})}
function doUndo(){if(!undo.length)return;redo.push(JSON.stringify(state));state=JSON.parse(undo.pop());selected=null;render();fillInspector()}
function doRedo(){if(!redo.length)return;undo.push(JSON.stringify(state));state=JSON.parse(redo.pop());selected=null;render();fillInspector()}
function bind(){
 $('cbpElements').querySelectorAll('button').forEach(b=>{b.onclick=()=>add(b.dataset.type);b.ondragstart=e=>e.dataTransfer.setData('newType',b.dataset.type)});
 $('cbpCanvas').ondragover=e=>e.preventDefault();$('cbpCanvas').ondrop=e=>{e.preventDefault();const t=e.dataTransfer.getData('newType');if(t)add(t)};$('cbpCanvas').onclick=()=>{selected=null;render();fillInspector()};
 ['iContent','iUrl','iWidth','iHeight','iFontSize','iWeight','iAlign','iColor','iBg','iPadding','iMargin','iRadius','iColumns','iClass'].forEach(x=>$(x).addEventListener('input',update));
 $('iDelete').onclick=()=>{if(!node())return;snapshot();state.nodes=state.nodes.filter(x=>x.id!==selected);selected=null;render();fillInspector()};
 $('iDuplicate').onclick=()=>{const n=node();if(!n)return;snapshot();const c=clone(n);c.id=id();state.nodes.splice(state.nodes.findIndex(x=>x.id===n.id)+1,0,c);selected=c.id;render();fillInspector()};
 $('cbpPage').onchange=()=>loadPage();$('cbpSave').onclick=()=>saveDraft().catch(e=>status(e.message));$('cbpPublish').onclick=()=>publish().catch(e=>status(e.message));$('cbpPreview').onclick=preview;$('cbpImport').onclick=()=>importLivePage(true).catch(e=>status(e.message));$('cbpUndo').onclick=doUndo;$('cbpRedo').onclick=doRedo;$('cbpVersions').onclick=()=>versions().catch(e=>status(e.message));$('cbpMode').onchange=()=>state.mode=$('cbpMode').value;
 document.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-device]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('cbpStage').className='cbp-stage '+b.dataset.device});
 $('themeRadius').oninput=()=>$('themeRadiusVal').textContent=$('themeRadius').value+'px';
 $('applyPageTheme').onclick=async()=>{state.pageTheme=themeValue();await saveKey(key('theme'),state.pageTheme);status('Theme saved for current page')};
 $('applyGlobalTheme').onclick=async()=>{if(!confirm('Apply this theme to ALL website pages?'))return;state.theme=themeValue();await saveKey('builder_theme_global',state.theme);status('Global theme applied to all pages')};
}
bind();loadPage();
})();
