(function(){
const API='https://ceybreez-contact-api.ceybreez.workers.dev';
const pageMap={'/':'home','/index.html':'home','/villas':'villas','/villas.html':'villas','/apartments':'apartments','/apartments.html':'apartments','/homestays':'homestays','/homestays.html':'homestays','/tours':'tours','/tours.html':'tours','/services':'services','/services.html':'services','/contact':'contact','/contact.html':'contact'};
const page=pageMap[location.pathname]||location.pathname.split('/').pop().replace('.html','')||'home';
const edit=new URLSearchParams(location.search).get('cb_builder_edit')==='1';
const preview=new URLSearchParams(location.search).get('cb_builder_preview')==='1';
let patches={},inserts=[],selected=null;
const esc=s=>{try{return CSS.escape(s)}catch{return s}};
function selector(el){if(el.id)return '#'+esc(el.id);let parts=[];while(el&&el!==document.body){let p=el.tagName.toLowerCase();if(el.classList.length)p+='.'+[...el.classList].slice(0,2).map(esc).join('.');const par=el.parentElement;if(par){const same=[...par.children].filter(x=>x.tagName===el.tagName);if(same.length>1)p+=`:nth-of-type(${same.indexOf(el)+1})`}parts.unshift(p);el=par;if(parts.length>6)break}return 'body>'+parts.join('>')}
function applyPatch(sel,p){let el;try{el=document.querySelector(sel)}catch{}if(!el)return;if(p.html!==undefined)el.innerHTML=p.html;if(p.text!==undefined)el.textContent=p.text;if(p.attrs)Object.entries(p.attrs).forEach(([k,v])=>v===null?el.removeAttribute(k):el.setAttribute(k,v));if(p.style)Object.assign(el.style,p.style);if(p.hidden!==undefined)el.style.display=p.hidden?'none':''}
function createInsert(item){
 if(!item||!item.id)return null;
 let el=document.getElementById(item.id);
 if(el)return el;
 el=document.createElement(item.tag||'div');
 el.id=item.id;
 el.classList.add('cb-v3-added');
 if(item.html!==undefined)el.innerHTML=item.html;
 if(item.attrs)Object.entries(item.attrs).forEach(([k,v])=>{if(v!==''&&v!==null&&v!==undefined)el.setAttribute(k,v)});
 if(item.style)Object.assign(el.style,item.style);
 const footer=document.querySelector('footer');
 (footer?.parentNode||document.body).insertBefore(el,footer||null);
 return el;
}
function renderInserts(rows){inserts=Array.isArray(rows)?rows:[];inserts.forEach(createInsert)}
function applyAll(data){patches=data?.patches||{};renderInserts(data?.inserts||[]);Object.entries(patches).forEach(([s,p])=>applyPatch(s,p));const t=data?.theme||{};if(t.primary)document.documentElement.style.setProperty('--cb-primary',t.primary);if(t.secondary)document.documentElement.style.setProperty('--cb-secondary',t.secondary);if(t.font)document.body.style.fontFamily=t.font}
async function load(){try{let data;if(preview){data=JSON.parse(localStorage.getItem('builder_v3_preview_'+page)||'null')}if(!data){const r=await fetch(API+'/api/site-content');const all=await r.json();let raw=all['builder_v3_live_'+page];data=raw?JSON.parse(raw):null;const gt=all.builder_v3_theme_global?JSON.parse(all.builder_v3_theme_global):{};const pt=all['builder_v3_theme_'+page]?JSON.parse(all['builder_v3_theme_'+page]):{};data=data||{patches:{}};data.theme={...gt,...pt,...(data.theme||{})}}applyAll(data||{})}catch(e){console.warn('Builder runtime',e)}finally{if(edit)initEdit()}}
function chosen(el){selected=el;document.querySelectorAll('.cb-v3-selected').forEach(x=>x.classList.remove('cb-v3-selected'));el.classList.add('cb-v3-selected');const cs=getComputedStyle(el);parent.postMessage({source:'cb-v3',type:'selected',selector:selector(el),tag:el.tagName.toLowerCase(),html:el.innerHTML,text:el.textContent,href:el.getAttribute('href')||'',src:el.getAttribute('src')||'',style:{fontSize:parseFloat(cs.fontSize)||16,fontWeight:cs.fontWeight,align:cs.textAlign,color:rgbHex(cs.color),background:rgbHex(cs.backgroundColor),padding:parseFloat(cs.paddingTop)||0,margin:parseFloat(cs.marginTop)||0,width:Math.round(el.getBoundingClientRect().width/el.parentElement.getBoundingClientRect().width*100)||100,minHeight:parseFloat(cs.minHeight)||0,radius:parseFloat(cs.borderRadius)||0,opacity:Math.round(parseFloat(cs.opacity)*100)}},'*')}
function rgbHex(v){const m=String(v).match(/\d+/g);if(!m||m.length<3)return '#ffffff';return '#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('')}
function initEdit(){document.documentElement.classList.add('cb-v3-editing');document.addEventListener('click',e=>{const el=e.target.closest('h1,h2,h3,h4,h5,h6,p,span,a,button,img,video,section,article,header,footer,main,form,div');if(!el||el===document.body||el.classList.contains('cb-v3-toolbar'))return;e.preventDefault();e.stopPropagation();chosen(el)},true);document.addEventListener('dblclick',e=>{const el=e.target.closest('h1,h2,h3,h4,h5,h6,p,span,a,button');if(!el)return;e.preventDefault();el.contentEditable='true';el.focus();document.execCommand('selectAll',false,null);el.onblur=()=>{el.contentEditable='false';const s=selector(el);patches[s]={...(patches[s]||{}),html:el.innerHTML};parent.postMessage({source:'cb-v3',type:'change',selector:s,patch:patches[s]},'*');chosen(el)}},true);window.addEventListener('message',e=>{const m=e.data;if(!m||m.source!=='cb-v3-editor')return;if(m.type==='insert'&&m.item){inserts.push(m.item);const el=createInsert(m.item);if(el){chosen(el)}parent.postMessage({source:'cb-v3',type:'insertState',inserts},'*')}
if(m.type==='apply'&&selected){const s=selector(selected);patches[s]={...(patches[s]||{}),...m.patch,style:{...(patches[s]?.style||{}),...(m.patch.style||{})}};applyPatch(s,patches[s]);parent.postMessage({source:'cb-v3',type:'change',selector:s,patch:patches[s]},'*');chosen(selected)}if(m.type==='reset'&&selected){const s=selector(selected);delete patches[s];location.reload()}if(m.type==='requestState')parent.postMessage({source:'cb-v3',type:'state',patches,inserts},'*')});parent.postMessage({source:'cb-v3',type:'ready',page},'*')}
load();
})();