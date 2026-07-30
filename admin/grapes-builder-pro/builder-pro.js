(() => {
'use strict';
const API_BASE=window.CEYBREEZ_API_BASE||'https://ceybreez-contact-api.ceybreez.workers.dev';
const pages=[
{id:'welcome',label:'Welcome Page',url:'../../index.html',icon:'✦',mode:'welcome'},
{id:'home',label:'Home',url:'../../index.html',icon:'⌂',mode:'home'},
{id:'villas',label:'Villas',url:'../../villas.html',icon:'◆'},
{id:'apartments',label:'Apartments',url:'../../apartments.html',icon:'▦'},
{id:'homestays',label:'Homestays',url:'../../homestays.html',icon:'⌁'},
{id:'tours',label:'Tours',url:'../../tours.html',icon:'◎'},
{id:'services',label:'Services',url:'../../services.html',icon:'✧'},
{id:'tour-details',label:'Tour Package Details',url:'../../tour-details.html',icon:'▤'},
{id:'contact',label:'Contact',url:'../../contact.html',icon:'✉'}];
const $=id=>document.getElementById(id), frame=$('liveFrame'), stage=$('deviceStage'), loader=$('frameLoader');
let page=pages[1], selected=null, editMode=true, history=[], historyIndex=-1, observer=null;
const key=id=>`ceybreez-live-builder-v2:${id}`;
const toast=m=>{const e=$('toast');e.textContent=m;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200)};
const token=()=>sessionStorage.getItem('adminToken')||localStorage.getItem('adminToken')||'';

function renderPages(){const root=$('pageList');root.innerHTML='';pages.forEach(p=>{const b=document.createElement('button');b.className='cbp-page'+(p.id===page.id?' active':'');b.innerHTML=`<span class="dot"></span><span>${p.icon} ${p.label}</span>`;b.onclick=()=>switchPage(p);root.appendChild(b)})}
function switchPage(p){saveDraft(false);page=p;selected=null;renderPages();loadFrame()}
function loadFrame(){loader.classList.remove('hidden');frame.src='about:blank';setTimeout(()=>{frame.src=page.url+(page.url.includes('?')?'&':'?')+'cbp='+Date.now()},20)}

frame.addEventListener('load',()=>{try{const d=frame.contentDocument;if(!d||d.location.href==='about:blank')return;prepareDocument(d);applyDraft();setTimeout(()=>{applyDraft();loader.classList.add('hidden');toast(page.label+' ready')},500)}catch(e){loader.classList.add('hidden');toast('Page access blocked. Builder must run on the same domain.');console.error(e)}});

function prepareDocument(d){
  if(observer) observer.disconnect();
  let css=d.getElementById('cbp-builder-runtime-css');if(!css){css=d.createElement('style');css.id='cbp-builder-runtime-css';d.head.appendChild(css)}
  css.textContent=`
html.cbp-builder-edit *{cursor:default}
html.cbp-builder-edit a,html.cbp-builder-edit button,html.cbp-builder-edit input,html.cbp-builder-edit select,html.cbp-builder-edit textarea{cursor:pointer}
.cbp-builder-hover{outline:2px dashed rgba(216,178,105,.95)!important;outline-offset:-2px!important}
.cbp-builder-selected{outline:3px solid #21a5e5!important;outline-offset:-3px!important;position:relative!important}
.cbp-builder-hidden{opacity:.28!important;filter:grayscale(1)!important}
body.cbp-home-view #welcomeScreen,body.cbp-home-view .welcome-screen,body.cbp-home-view [data-welcome],body.cbp-home-view .welcome-overlay{display:none!important}
body.cbp-home-view #mainSite{display:block!important;opacity:1!important;visibility:visible!important}
body.cbp-welcome-view #mainSite{display:none!important}
body.cbp-welcome-view #welcomeScreen,body.cbp-welcome-view .welcome-screen,body.cbp-welcome-view [data-welcome],body.cbp-welcome-view .welcome-overlay{display:flex!important;opacity:1!important;visibility:visible!important}
`;
  d.body.classList.toggle('cbp-home-view',page.mode==='home');d.body.classList.toggle('cbp-welcome-view',page.mode==='welcome');
  d.documentElement.classList.toggle('cbp-builder-edit',editMode);
  d.addEventListener('click',onFrameClick,true);d.addEventListener('mouseover',onHover,true);d.addEventListener('mouseout',onOut,true);
  observer=new MutationObserver(()=>{if(page.mode==='home'){d.querySelectorAll('#welcomeScreen,.welcome-screen,[data-welcome],.welcome-overlay').forEach(x=>x.style.setProperty('display','none','important'))}});
  observer.observe(d.body,{childList:true,subtree:true});
}
function onHover(e){if(!editMode)return;const el=e.target;if(el&&el!==selected)el.classList.add('cbp-builder-hover')}
function onOut(e){e.target?.classList?.remove('cbp-builder-hover')}
function onFrameClick(e){if(!editMode)return;e.preventDefault();e.stopPropagation();selectElement(e.target)}
function selectElement(el){if(selected)selected.classList.remove('cbp-builder-selected');selected=el;el.classList.remove('cbp-builder-hover');el.classList.add('cbp-builder-selected');populateInspector();activateTab('content')}
function populateInspector(){if(!selected)return;$('emptyState').hidden=true;$('contentFields').hidden=false;const tag=selected.tagName.toLowerCase();$('selectedLabel').value=`<${tag}> ${selected.id?'#'+selected.id:''} ${[...selected.classList].filter(c=>!c.startsWith('cbp-builder')).map(c=>'.'+c).join('')}`;$('selectorOutput').textContent=selectorFor(selected);const isImg=tag==='img';const isLink=tag==='a';$('imageFields').hidden=!isImg;$('linkFields').hidden=!isLink;$('textFieldWrap').hidden=isImg;$('textInput').value=isImg?'':selected.innerHTML;$('imageSrc').value=isImg?(selected.getAttribute('src')||''):'';$('imageAlt').value=isImg?(selected.getAttribute('alt')||''):'';$('linkHref').value=isLink?(selected.getAttribute('href')||''):'';$('elementIdInput').value=selected.id||'';$('classInput').value=[...selected.classList].filter(c=>!c.startsWith('cbp-builder')).join(' ');const cs=frame.contentWindow.getComputedStyle(selected);$('colorInput').value=rgbToHex(cs.color);$('bgInput').value=rgbToHex(cs.backgroundColor);$('fontSizeInput').value=selected.style.fontSize||'';$('fontWeightInput').value=selected.style.fontWeight||'';$('textAlignInput').value=selected.style.textAlign||'';$('widthInput').value=selected.style.width||'';$('heightInput').value=selected.style.height||'';$('paddingInput').value=selected.style.padding||'';$('marginInput').value=selected.style.margin||'';$('radiusInput').value=selected.style.borderRadius||''}
function rgbToHex(v){const m=(v||'').match(/\d+/g);if(!m||m.length<3)return'#000000';return'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('')}
function selectorFor(el){if(el.id)return'#'+CSS.escape(el.id);const parts=[];while(el&&el.nodeType===1&&el!==frame.contentDocument.body){let part=el.tagName.toLowerCase();const stable=[...el.classList].filter(c=>!c.startsWith('cbp-')&&!/active|show|open|loaded|visible|selected/i.test(c)).slice(0,2);if(stable.length)part+='.'+stable.map(CSS.escape).join('.');const siblings=[...el.parentElement.children].filter(x=>x.tagName===el.tagName);if(siblings.length>1)part+=`:nth-of-type(${siblings.indexOf(el)+1})`;parts.unshift(part);if(el.parentElement.id){parts.unshift('#'+CSS.escape(el.parentElement.id));break}el=el.parentElement}return parts.join(' > ')}
function snapshot(){if(!selected)return;const state={selector:selectorFor(selected),html:selected.innerHTML,attrs:[...selected.attributes].filter(a=>!a.name.startsWith('data-cbp')&&!a.name.startsWith('class')).reduce((o,a)=>(o[a.name]=a.value,o),{}),className:[...selected.classList].filter(c=>!c.startsWith('cbp-builder')).join(' '),style:selected.getAttribute('style')||'',deleted:false,hidden:selected.classList.contains('cbp-builder-hidden')};pushHistory();upsertPatch(state);saveDraft(false)}
function upsertPatch(p){const data=getDraft();const i=data.patches.findIndex(x=>x.selector===p.selector);if(i>=0)data.patches[i]=p;else data.patches.push(p);localStorage.setItem(key(page.id),JSON.stringify(data))}
function getDraft(){try{return JSON.parse(localStorage.getItem(key(page.id)))||{page:page.id,patches:[]}}catch{return{page:page.id,patches:[]}}}
function applyDraft(){const d=frame.contentDocument,data=getDraft();data.patches.forEach(p=>{let el;try{el=d.querySelector(p.selector)}catch{return}if(!el)return;if(p.deleted){el.remove();return}el.innerHTML=p.html;[...el.attributes].forEach(a=>{if(!['id','class'].includes(a.name)&&!a.name.startsWith('data-'))el.removeAttribute(a.name)});Object.entries(p.attrs||{}).forEach(([k,v])=>el.setAttribute(k,v));if(p.className)el.className=p.className+(p.hidden?' cbp-builder-hidden':'');if(p.style)el.setAttribute('style',p.style)})}
function saveDraft(show=true){if(selected)snapshot();const data=getDraft();data.updatedAt=new Date().toISOString();localStorage.setItem(key(page.id),JSON.stringify(data));if(show)toast('Draft saved')}
function pushHistory(){const data=JSON.stringify(getDraft());history=history.slice(0,historyIndex+1);history.push(data);historyIndex=history.length-1}
function undo(){if(historyIndex<0)return;localStorage.setItem(key(page.id),history[historyIndex--]);loadFrame()}
function redo(){if(historyIndex+1>=history.length)return;historyIndex++;localStorage.setItem(key(page.id),history[historyIndex]);loadFrame()}

$('applyContentBtn').onclick=()=>{if(!selected)return;pushHistory();if(selected.tagName==='IMG'){selected.src=$('imageSrc').value;selected.alt=$('imageAlt').value}else selected.innerHTML=$('textInput').value;if(selected.tagName==='A')selected.setAttribute('href',$('linkHref').value);snapshot();toast('Content updated')};
$('imageFile').onchange=e=>{const f=e.target.files[0];if(!f||!selected)return;const r=new FileReader();r.onload=()=>{$('imageSrc').value=r.result;selected.src=r.result;snapshot();toast('Image applied to draft')};r.readAsDataURL(f)};
$('applyStyleBtn').onclick=()=>{if(!selected)return;pushHistory();Object.assign(selected.style,{color:$('colorInput').value,backgroundColor:$('bgInput').value,fontSize:$('fontSizeInput').value,fontWeight:$('fontWeightInput').value,textAlign:$('textAlignInput').value,width:$('widthInput').value,height:$('heightInput').value,padding:$('paddingInput').value,margin:$('marginInput').value,borderRadius:$('radiusInput').value});snapshot();toast('Style updated')};
$('resetStyleBtn').onclick=()=>{if(!selected)return;selected.removeAttribute('style');snapshot();populateInspector()};
$('applyCustomCssBtn').onclick=()=>{if(!selected)return;selected.style.setProperty($('cssPropertyInput').value,$('cssValueInput').value);snapshot()};
$('elementIdInput').onchange=()=>{if(selected){selected.id=$('elementIdInput').value.trim();snapshot();populateInspector()}};$('classInput').onchange=()=>{if(selected){selected.className=$('classInput').value+' cbp-builder-selected';snapshot();populateInspector()}};
$('moveUpBtn').onclick=()=>{if(selected?.previousElementSibling){selected.parentNode.insertBefore(selected,selected.previousElementSibling);snapshot()}};$('moveDownBtn').onclick=()=>{if(selected?.nextElementSibling){selected.parentNode.insertBefore(selected.nextElementSibling,selected);snapshot()}};$('duplicateBtn').onclick=()=>{if(!selected)return;const c=selected.cloneNode(true);c.classList.remove('cbp-builder-selected');selected.after(c);selectElement(c);snapshot()};$('hideBtn').onclick=()=>{if(selected){selected.classList.toggle('cbp-builder-hidden');snapshot()}};$('deleteBtn').onclick=()=>{if(!selected||!confirm('Delete this element from the draft?'))return;const sel=selectorFor(selected),data=getDraft();data.patches.push({selector:sel,deleted:true});localStorage.setItem(key(page.id),JSON.stringify(data));selected.remove();selected=null;toast('Element deleted')};

function activateTab(name){document.querySelectorAll('.cbp-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.cbp-panel').forEach(p=>p.classList.remove('active'));$(name+'Panel').classList.add('active')}
document.querySelectorAll('.cbp-tabs button').forEach(b=>b.onclick=()=>activateTab(b.dataset.tab));
function setDevice(name){stage.className='cbp-device-stage '+name;['desktop','tablet','mobile'].forEach(n=>$(n+'Btn').classList.toggle('active',n===name))}['desktop','tablet','mobile'].forEach(n=>$(n+'Btn').onclick=()=>setDevice(n));
function setEdit(v){editMode=v;$('editBtn').classList.toggle('active',v);$('previewBtn').classList.toggle('active',!v);try{frame.contentDocument.documentElement.classList.toggle('cbp-builder-edit',v);if(!v&&selected)selected.classList.remove('cbp-builder-selected')}catch{}}
$('editBtn').onclick=()=>setEdit(true);$('previewBtn').onclick=()=>setEdit(false);$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;$('saveBtn').onclick=()=>saveDraft(true);$('reloadPageBtn').onclick=loadFrame;$('clearDraftBtn').onclick=()=>{if(confirm('Clear all edits for this page?')){localStorage.removeItem(key(page.id));loadFrame()}};
$('exportBtn').onclick=()=>{saveDraft(false);const all={version:2,exportedAt:new Date().toISOString(),pages:{}};pages.forEach(p=>all.pages[p.id]=JSON.parse(localStorage.getItem(key(p.id))||'{"patches":[]}'));const blob=new Blob([JSON.stringify(all,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ceybreez-builder-edits.json';a.click();URL.revokeObjectURL(a.href)};
$('publishBtn').onclick=async()=>{saveDraft(false);const payload=getDraft();try{const r=await fetch(`${API_BASE}/api/admin/page-builder/live-publish`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`},body:JSON.stringify(payload)});if(!r.ok)throw new Error(await r.text());toast('Published successfully')}catch(e){toast('Draft saved. Live-publish Worker route is not installed.');console.warn(e)}};
renderPages();loadFrame();
})();
